// ════════════════════════════════════════════════════════════════════
// Community Simulation orchestration (Track E.M2 — MTR Super-Judge)
//
// This MTR-side service drives a full MiroFish pipeline for one ad:
//   1. Build seed text from ad + brand context
//   2. Generate ontology + build graph
//   3. Create + prepare + start simulation
//   4. Poll until rounds finish
//   5. Interview every agent with structured questions
//   6. Aggregate responses into the MTR-shape `CommunitySim`
//
// MiroFish itself stays generic — it has no idea this is for ad eval.
// All the "ad-aware" logic (seed framing, question prompts, sentiment
// classification, objection extraction) lives here.
// ════════════════════════════════════════════════════════════════════

import {
  buildGraph,
  createSimulation,
  generateOntology,
  getPrepareStatus,
  getRunStatus,
  getTaskStatus,
  interviewAll,
  prepareSimulation,
  startSimulation,
  stopSimulation,
} from '../lib/mirofish-client';
import type { AdIdea } from './marketing-agent';
import type {
  CommunitySim,
  CommunitySimConfig,
  ObjectionItem,
  QuoteItem,
  Sentiment,
} from '../lib/schemas';
import type { BrandFact } from '../lib/brand-facts';
import type { CustomerQuote } from '../lib/customer-quotes';

const POLL_GRAPH_MS = 3000;
const POLL_PREPARE_MS = 3000;
const POLL_RUN_MS = 3000;
const MAX_IDLE_GRACE_TICKS = 8;

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });

// ════════════════════════════════════════════════════════════════════
// Public types
// ════════════════════════════════════════════════════════════════════

export type CommunitySimProgressStage =
  | 'seed_uploading'
  | 'graph_building'
  | 'sim_creating'
  | 'sim_preparing'
  | 'sim_starting'
  | 'sim_running'
  | 'interviewing'
  | 'aggregating'
  | 'done';

export interface CommunitySimProgress {
  readonly stage: CommunitySimProgressStage;
  readonly message: string;
  readonly percent: number;
}

export interface RunCommunitySimArgs {
  readonly ad: AdIdea;
  readonly config: CommunitySimConfig;
  readonly brandFacts?: readonly BrandFact[];
  readonly customerQuotes?: readonly CustomerQuote[];
  readonly onProgress?: (p: CommunitySimProgress) => void;
  readonly signal?: AbortSignal;
}

// ════════════════════════════════════════════════════════════════════
// Seed-text builder
// ════════════════════════════════════════════════════════════════════

const buildSeedText = (
  ad: AdIdea,
  brandFacts: readonly BrandFact[],
  customerQuotes: readonly CustomerQuote[],
): string => {
  const factsBlock = brandFacts
    .filter(f => f.enabled && f.value.trim())
    .map(f => `${f.label}: ${f.value}`)
    .join('\n');
  const quotesBlock = customerQuotes
    .filter(q => q.enabled && q.quote.trim())
    .map(q => `[${q.persona}] "${q.quote}"${q.context ? ` (${q.context})` : ''}`)
    .join('\n\n');

  return `=== Marnthara ม่านธารา — ร้านม่านในลพบุรี ===

${factsBlock || '(ไม่มี brand facts)'}

=== เสียงลูกค้าจริง ===
${quotesBlock || '(ไม่มี customer quotes)'}

=== บริบทตลาด ===
ลพบุรี-สิงห์บุรี-อ่างทอง — อากาศร้อนทั้งปี, ตลาด home improvement กลุ่ม middle income,
ลูกค้าหลัก: พ่อบ้าน-แม่บ้าน-เจ้าของธุรกิจขนาดเล็ก-คนรุ่นใหม่ที่อยู่คอนโด/หอ.

=== Ad ที่จะทดสอบกับชุมชน ===
Style: ${ad.style}
Copy:
${ad.copy}

Visual idea:
${ad.visual_idea}
`;
};

// ════════════════════════════════════════════════════════════════════
// Interview prompt — fixed structure so we can parse JSON consistently.
// MiroFish doesn't know this is for ad eval; we just ask each agent
// to answer 4 questions about the ad embedded in the seed.
// ════════════════════════════════════════════════════════════════════

const buildInterviewPrompt = (ad: AdIdea): string => `
คุณคือสมาชิกชุมชนเสมือนที่ได้เห็น ad นี้:

Style: ${ad.style}
Copy:
${ad.copy}

Visual idea: ${ad.visual_idea}

ตอบเป็น JSON object เดียวเท่านั้น (ไม่มี text นอก JSON):
{
  "would_click": "yes" | "no" | "maybe",
  "reason": "เหตุผลสั้นๆ ใน 1-2 ประโยค (ภาษาไทย)",
  "objection": "ข้อโต้แย้ง/ข้อกังวลหลัก ใน 1 ประโยค (ภาษาไทย หรือ 'none' ถ้าไม่มี)",
  "trust": 1 | 2 | 3 | 4 | 5,
  "would_share": "yes" | "no",
  "stance": "positive" | "neutral" | "negative",
  "quote": "ประโยคที่คุณอาจพูดต่อหน้าเพื่อน 1 ประโยค (ภาษาไทย)"
}
`.trim();

// ════════════════════════════════════════════════════════════════════
// Response parsing + aggregation
// ════════════════════════════════════════════════════════════════════

interface ParsedResponse {
  would_click: 'yes' | 'no' | 'maybe';
  reason: string;
  objection: string;
  trust: number;
  would_share: 'yes' | 'no';
  stance: 'positive' | 'neutral' | 'negative';
  quote: string;
  agent_persona?: string;
}

// MiroFish's interview/all endpoint returns the `result` field as
// arbitrary JSON. The shape varies by simulation profile. We probe a few
// common locations + fall back to scanning the string for a JSON object.
const parseInterview = (raw: unknown): ParsedResponse | null => {
  if (raw === null || raw === undefined) return null;

  // Some MiroFish responses wrap the agent answer in { agent_id, response: { ... } }
  // or just return the JSON object directly. Try to dig.
  const candidates: unknown[] = [];
  const stack: unknown[] = [raw];
  while (stack.length && candidates.length < 8) {
    const top = stack.pop();
    if (typeof top === 'string') {
      const m = top.match(/\{[\s\S]*\}/);
      if (m) candidates.push(safeJson(m[0]));
    } else if (top && typeof top === 'object') {
      candidates.push(top);
      for (const v of Object.values(top as Record<string, unknown>)) {
        if (v && (typeof v === 'object' || typeof v === 'string')) stack.push(v);
      }
    }
  }

  for (const c of candidates) {
    const parsed = coerceResponse(c);
    if (parsed) return parsed;
  }
  return null;
};

const safeJson = (s: string): unknown => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const coerceResponse = (obj: unknown): ParsedResponse | null => {
  if (!obj || typeof obj !== 'object') return null;
  const r = obj as Record<string, unknown>;
  const click = String(r.would_click ?? '').toLowerCase();
  if (click !== 'yes' && click !== 'no' && click !== 'maybe') return null;
  const stanceRaw = String(r.stance ?? '').toLowerCase();
  const stance: ParsedResponse['stance'] =
    stanceRaw === 'positive' || stanceRaw === 'negative' ? stanceRaw : 'neutral';
  const shareRaw = String(r.would_share ?? '').toLowerCase();
  const share: ParsedResponse['would_share'] = shareRaw === 'yes' ? 'yes' : 'no';
  const trustNum = Number(r.trust);
  const trust = Number.isFinite(trustNum) ? Math.min(5, Math.max(1, Math.round(trustNum))) : 3;

  return {
    would_click: click,
    reason: typeof r.reason === 'string' ? r.reason : '',
    objection: typeof r.objection === 'string' ? r.objection : '',
    trust,
    would_share: share,
    stance,
    quote: typeof r.quote === 'string' ? r.quote : '',
    agent_persona: typeof r.agent_persona === 'string' ? r.agent_persona : undefined,
  };
};

// Cluster objections by lowercased first 40 chars — good enough for free
// text without burning another LLM call. The judge prompt sees the top
// few clusters so duplicates getting flattened is the desired behaviour.
const aggregateObjections = (responses: readonly ParsedResponse[]): ObjectionItem[] => {
  const counts = new Map<string, { text: string; count: number }>();
  for (const r of responses) {
    const o = r.objection.trim();
    if (!o || o.toLowerCase() === 'none' || o.toLowerCase() === '-') continue;
    const key = o.toLowerCase().slice(0, 40);
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { text: o, count: 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
};

const pickQuotes = (responses: readonly ParsedResponse[]): QuoteItem[] => {
  // Keep up to 6, balanced across stances when possible.
  const byStance: Record<'positive' | 'neutral' | 'negative', QuoteItem[]> = {
    positive: [],
    neutral: [],
    negative: [],
  };
  for (const r of responses) {
    if (!r.quote.trim()) continue;
    byStance[r.stance].push({
      persona: r.agent_persona ?? 'agent',
      text: r.quote.trim().slice(0, 280),
      stance: r.stance,
    });
  }
  const out: QuoteItem[] = [];
  for (let i = 0; i < 2; i += 1) {
    if (byStance.positive[i]) out.push(byStance.positive[i]);
    if (byStance.negative[i]) out.push(byStance.negative[i]);
    if (byStance.neutral[i]) out.push(byStance.neutral[i]);
  }
  return out.slice(0, 6);
};

const aggregate = (
  responses: readonly ParsedResponse[],
  meta: { simId: string; projectId: string; runAt: string; config: CommunitySimConfig },
): CommunitySim => {
  const total = Math.max(1, responses.length);

  // Sentiment counts → percentages
  const stanceCounts = { positive: 0, neutral: 0, negative: 0 };
  let clickYes = 0;
  let clickMaybe = 0;
  let shareYes = 0;
  let trustSum = 0;
  for (const r of responses) {
    stanceCounts[r.stance] += 1;
    if (r.would_click === 'yes') clickYes += 1;
    else if (r.would_click === 'maybe') clickMaybe += 1;
    if (r.would_share === 'yes') shareYes += 1;
    trustSum += r.trust;
  }

  const sentiment: Sentiment = {
    positive: Math.round((stanceCounts.positive / total) * 100),
    neutral: Math.round((stanceCounts.neutral / total) * 100),
    negative: Math.round((stanceCounts.negative / total) * 100),
  };

  const clickIntent = Math.round(((clickYes + clickMaybe * 0.5) / total) * 100);
  const trustScore = trustSum / total;
  const viralitySignal = Math.round((shareYes / total) * 100);

  return {
    sim_id: meta.simId,
    project_id: meta.projectId,
    run_at: meta.runAt,
    config: meta.config,
    sentiment,
    click_intent: clickIntent,
    trust_score: Math.round(trustScore * 10) / 10,
    virality_signal: viralitySignal,
    top_objections: aggregateObjections(responses),
    representative_quotes: pickQuotes(responses),
    responses_total: responses.length,
  };
};

// ════════════════════════════════════════════════════════════════════
// Public entry point
// ════════════════════════════════════════════════════════════════════

export const runCommunitySim = async (
  args: RunCommunitySimArgs,
): Promise<CommunitySim> => {
  const { ad, config, brandFacts = [], customerQuotes = [], onProgress, signal } = args;
  const report = (stage: CommunitySimProgressStage, message: string, percent: number): void =>
    onProgress?.({ stage, message, percent });

  let simulationId: string | null = null;
  try {
    // ── 1. Seed + ontology
    report('seed_uploading', 'อัปโหลด seed และวิเคราะห์ ontology...', 5);
    const seed = buildSeedText(ad, brandFacts, customerQuotes);
    const simRequirement = `วิเคราะห์ปฏิกิริยาของชุมชนต่อ ad ม่านธารา style "${ad.style}" — คาดการณ์ engagement, sentiment, และข้อโต้แย้ง`;

    const ontology = await generateOntology({
      simulationRequirement: simRequirement,
      seedText: seed,
      projectName: `MTR community sim · ${ad.style} · ${new Date().toISOString().slice(0, 16)}`,
      signal,
    });

    // ── 2. Build graph
    report('graph_building', 'กำลังสร้าง community graph...', 15);
    const build = await buildGraph({ projectId: ontology.projectId, signal });
    while (!signal?.aborted) {
      const task = await getTaskStatus(build.taskId, signal);
      report('graph_building', task.message ?? 'building graph', 15 + Math.round((task.progress ?? 0) * 0.15));
      if (task.status === 'completed') break;
      if (task.status === 'failed') throw new Error(task.error ?? 'Graph build failed');
      await sleep(POLL_GRAPH_MS, signal);
    }
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    // ── 3. Create sim
    report('sim_creating', 'สร้าง simulation environment...', 30);
    const sim = await createSimulation({ projectId: ontology.projectId, signal });
    simulationId = sim.simulation_id;

    // ── 4. Prepare profiles
    report('sim_preparing', `generate ${config.agent_count} agent profiles...`, 35);
    const prep = await prepareSimulation({
      simulationId,
      parallelProfileCount: config.agent_count,
      signal,
    });
    if (!prep.alreadyPrepared && prep.taskId) {
      while (!signal?.aborted) {
        const status = await getPrepareStatus({
          simulationId,
          taskId: prep.taskId,
          signal,
        });
        report('sim_preparing', status.message ?? 'preparing', 35 + Math.round(status.progress * 0.1));
        if (status.status === 'ready' || status.status === 'completed') break;
        if (status.status === 'failed') throw new Error(status.error ?? 'Prepare failed');
        await sleep(POLL_PREPARE_MS, signal);
      }
    }
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    // ── 5. Start + poll run-status
    report('sim_starting', 'สั่ง simulation เริ่มรัน...', 45);
    await startSimulation({
      simulationId,
      platform: 'parallel',
      maxRounds: config.rounds,
      force: false,
      signal,
    });

    report('sim_running', 'agents กำลังโต้ตอบในชุมชน...', 50);
    let idleTicks = 0;
    while (!signal?.aborted) {
      const status = await getRunStatus(simulationId, signal);
      const pct =
        status.totalRounds > 0
          ? 50 + Math.round((status.currentRound / status.totalRounds) * 30)
          : 50;
      report(
        'sim_running',
        status.totalRounds > 0
          ? `รอบ ${status.currentRound}/${status.totalRounds} · ${status.totalActionsCount} actions`
          : 'engine warming up',
        pct,
      );
      const r = status.runnerStatus.toLowerCase();
      if (r === 'finished' || r === 'completed' || r === 'done' || r === 'stopped') break;
      if (r === 'idle') {
        if (status.totalActionsCount > 0) break;
        idleTicks += 1;
        if (idleTicks >= MAX_IDLE_GRACE_TICKS) {
          throw new Error('Simulation engine remained idle — agents never produced actions');
        }
        await sleep(POLL_RUN_MS, signal);
        continue;
      }
      idleTicks = 0;
      if (r === 'failed' || r === 'error') throw new Error(`Simulation runner ${r}`);
      await sleep(POLL_RUN_MS, signal);
    }
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    // ── 6. Interview every agent
    report('interviewing', `สัมภาษณ์ ${config.agent_count} agents...`, 85);
    const interview = await interviewAll({
      simulationId,
      prompt: buildInterviewPrompt(ad),
      timeoutSec: 600,
      signal,
    });

    // ── 7. Aggregate
    report('aggregating', `รวบรวม ${interview.count} responses...`, 95);
    const parsed: ParsedResponse[] = [];
    for (const raw of interview.results) {
      const p = parseInterview(raw);
      if (p) parsed.push(p);
    }

    if (parsed.length === 0) {
      throw new Error(
        `MiroFish returned ${interview.count} responses but none were parseable JSON. The agents may have ignored the format instruction — try a smaller sim or rerun.`,
      );
    }

    const result = aggregate(parsed, {
      simId: simulationId,
      projectId: ontology.projectId,
      runAt: new Date().toISOString(),
      config,
    });

    report('done', `เสร็จสิ้น (${parsed.length}/${interview.count} parsable)`, 100);
    return result;
  } catch (err) {
    // On any failure, fire-and-forget stop so the backend doesn't burn LLM
    // tokens on an orphan simulation.
    if (simulationId) {
      void stopSimulation(simulationId).catch(() => {
        // intentional swallow — best-effort cleanup
      });
    }
    throw err;
  }
};
