import * as v from 'valibot';

export class JsonExtractionError extends Error {
  readonly raw: string;
  readonly attempts: number;
  readonly issues?: readonly v.BaseIssue<unknown>[];
  constructor(
    message: string,
    raw: string,
    attempts = 0,
    issues?: readonly v.BaseIssue<unknown>[],
  ) {
    super(message);
    this.name = 'JsonExtractionError';
    this.raw = raw;
    this.attempts = attempts;
    this.issues = issues;
  }
}

export type JsonKind = 'object' | 'array' | 'auto';

export interface ExtractOptions<TSchema extends v.GenericSchema> {
  readonly schema: TSchema;
  readonly kind?: JsonKind;
  readonly reviver?: (key: string, value: unknown) => unknown;
}

const FENCE_RE = /```(?:json|JSON|json5|JSON5)?\s*\n?([\s\S]*?)\n?```/;

const stripFences = (s: string): string => {
  const m = s.match(FENCE_RE);
  if (m && m[1] !== undefined) return m[1].trim();
  return s.replace(/```(?:json|JSON|json5|JSON5)?/g, '').replace(/```/g, '').trim();
};

const normalizeQuotes = (s: string): string =>
  s.replace(/[“”„‟]/g, '"').replace(/[‘’‚‛]/g, "'");

const stripTrailingCommas = (s: string): string => s.replace(/,(\s*[}\]])/g, '$1');

const stripComments = (s: string): string => {
  let out = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    if (escape) {
      escape = false;
      out += ch;
      continue;
    }
    if (inString) {
      if (ch === '\\') {
        escape = true;
        out += ch;
        continue;
      }
      if (ch === '"') inString = false;
      out += ch;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    const next = s.charAt(i + 1);
    if (ch === '/' && next === '/') {
      while (i < s.length && s.charAt(i) !== '\n') i++;
      if (i < s.length) out += '\n';
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < s.length - 1 && !(s.charAt(i) === '*' && s.charAt(i + 1) === '/')) i++;
      i++;
      continue;
    }
    out += ch;
  }
  return out;
};

function* balancedSpans(s: string, open: '{' | '['): Generator<string> {
  const close = open === '{' ? '}' : ']';
  let i = 0;
  while (i < s.length) {
    if (s.charAt(i) !== open) {
      i++;
      continue;
    }
    const start = i;
    let depth = 0;
    let inString = false;
    let escape = false;
    let end = -1;
    for (let j = start; j < s.length; j++) {
      const ch = s.charAt(j);
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === open) {
        depth++;
      } else if (ch === close) {
        depth--;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }
    if (end === -1) return;
    yield s.slice(start, end + 1);
    i = end + 1;
  }
}

const pickOpen = (s: string, kind: JsonKind): '{' | '[' | null => {
  if (kind === 'object') return s.includes('{') ? '{' : null;
  if (kind === 'array') return s.includes('[') ? '[' : null;
  const oi = s.indexOf('{');
  const ai = s.indexOf('[');
  if (oi === -1 && ai === -1) return null;
  if (oi === -1) return '[';
  if (ai === -1) return '{';
  return oi < ai ? '{' : '[';
};

const formatIssues = (issues?: readonly v.BaseIssue<unknown>[]): string | null => {
  if (!issues || issues.length === 0) return null;
  return issues
    .map(issue => {
      const path = issue.path
        ?.map(seg => {
          const key = (seg as { key?: unknown }).key;
          return typeof key === 'string' || typeof key === 'number' ? String(key) : '?';
        })
        .join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');
};

export function extractJson<TSchema extends v.GenericSchema>(
  raw: string,
  opts: ExtractOptions<TSchema>,
): v.InferOutput<TSchema> {
  const cleaned = stripFences(raw);
  const open = pickOpen(cleaned, opts.kind ?? 'auto');
  if (!open) {
    throw new JsonExtractionError('No JSON value found in response', raw);
  }

  let lastErrMessage: string | null = null;
  let lastIssues: readonly v.BaseIssue<unknown>[] | undefined;
  let attempts = 0;

  for (const span of balancedSpans(cleaned, open)) {
    const quoteFixed = normalizeQuotes(span);
    const commentStripped = stripComments(quoteFixed);
    const variants: readonly string[] = [
      span,
      stripTrailingCommas(span),
      quoteFixed,
      stripTrailingCommas(quoteFixed),
      commentStripped,
      stripTrailingCommas(commentStripped),
    ];

    for (const variant of variants) {
      attempts++;
      let parsed: unknown;
      try {
        parsed = opts.reviver
          ? JSON.parse(variant, opts.reviver as (this: unknown, key: string, value: unknown) => unknown)
          : JSON.parse(variant);
      } catch (error) {
        lastErrMessage = error instanceof Error ? error.message : String(error);
        continue;
      }
      const result = v.safeParse(opts.schema, parsed);
      if (result.success) return result.output as v.InferOutput<TSchema>;
      lastIssues = result.issues;
      lastErrMessage = formatIssues(result.issues) ?? 'schema validation failed';
    }
  }

  throw new JsonExtractionError(
    `Failed to extract JSON: ${lastErrMessage ?? 'no candidates parsed'}`,
    raw,
    attempts,
    lastIssues,
  );
}
