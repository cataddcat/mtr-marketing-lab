/**
 * Judge calibration: turn the user's saved-ad history (Judge score + the
 * outcome the user tagged + the real performance numbers they entered)
 * into a few-shot reference block the Judge sees when scoring NEW ads.
 *
 * Goal: when the user has tagged enough "used-bad" or "used-good" ads, the
 * Judge gradually learns the gap between its own scoring instinct and what
 * actually works at the Marnthara shop — without retraining anything.
 *
 * NOT a calibration in the statistical sense. It's prompt-level grounding:
 * we hand the LLM real before/after pairs and let it adjust its own scoring.
 */
import type { AdEvaluation } from './schemas';
import {
  ctrPercent,
  costPerClick,
  type PerformanceMetrics,
} from './performance';
import { JUDGE_PROMPT_VERSION } from './prompt-version';

export type Outcome = 'used-good' | 'used-bad';

/** Shape passed in from App.tsx — keep it narrow so we don't couple to the full SavedAd. */
export interface CalibrationSource {
  readonly id: string;
  readonly style: string;
  readonly copy: string;
  readonly evaluation: AdEvaluation | null;
  readonly outcome?: Outcome;
  readonly performance?: PerformanceMetrics;
}

export interface CalibrationExample {
  readonly id: string;
  readonly style: string;
  readonly copyExcerpt: string;
  readonly judgeScore: number;
  readonly outcome?: Outcome;
  readonly realCtrPct?: number;
  readonly realCostPerClick?: number;
  readonly notes?: string;
}

/** Max examples we send — keeps prompt size bounded and avoids over-fitting. */
const MAX_EXAMPLES = 6;

/** First copy line, truncated to ~140 chars. Judge doesn't need the whole body. */
const excerpt = (copy: string): string => {
  const first = copy.split('\n')[0]?.trim() ?? '';
  return first.length > 140 ? `${first.slice(0, 137).trim()}…` : first;
};

const hasUsableSignal = (s: CalibrationSource): boolean => {
  if (!s.evaluation) return false;
  if (typeof s.evaluation.average_score !== 'number') return false;
  // Skip examples scored by an older prompt — rubric drift makes them
  // misleading priors. Legacy ads (no prompt_version) are also skipped
  // since their scores predate this signal entirely.
  if (s.evaluation.prompt_version !== JUDGE_PROMPT_VERSION) return false;
  // Need at least an outcome tag or one performance number we can express.
  if (s.outcome) return true;
  if (s.performance) {
    if (ctrPercent(s.performance) !== null) return true;
    if (typeof s.performance.reach === 'number' && s.performance.reach > 0) return true;
    if (typeof s.performance.notes === 'string' && s.performance.notes.trim().length > 0) return true;
  }
  return false;
};

/**
 * Score how informative an example is. Examples where the Judge was clearly
 * wrong (high score + bad outcome, or low score + good outcome) get top
 * priority — those teach the most.
 */
const informativeness = (s: CalibrationSource): number => {
  const score = s.evaluation?.average_score ?? 5;
  let weight = 0;
  if (s.outcome === 'used-bad') {
    // The higher the Judge thought it was, the more wrong it was.
    weight += score; // 0..10
  } else if (s.outcome === 'used-good') {
    // The lower the Judge scored, the more wrong it was (in the other direction).
    weight += 10 - score;
  }
  // Bonus if there are concrete CTR numbers — measurable beats anecdotal.
  if (s.performance) {
    const ctr = ctrPercent(s.performance);
    if (typeof ctr === 'number') weight += 2;
    if (typeof s.performance.reach === 'number' && s.performance.reach > 0) weight += 0.5;
  }
  return weight;
};

export function selectCalibrationExamples(
  sources: readonly CalibrationSource[],
): readonly CalibrationExample[] {
  const usable = sources.filter(hasUsableSignal);
  if (usable.length === 0) return [];

  const ranked = [...usable].sort((a, b) => informativeness(b) - informativeness(a));

  // Keep a balance: prefer not to send ONLY one side of the signal.
  const goods = ranked.filter(r => r.outcome === 'used-good');
  const bads = ranked.filter(r => r.outcome === 'used-bad');
  const neutral = ranked.filter(r => !r.outcome);

  const picked: CalibrationSource[] = [];
  const take = (arr: readonly CalibrationSource[], n: number) => {
    let added = 0;
    for (const item of arr) {
      if (picked.length >= MAX_EXAMPLES) break;
      if (added >= n) break;
      if (picked.includes(item)) continue;
      picked.push(item);
      added++;
    }
  };
  // Bias toward "used-bad" (negative examples are more corrective for an LLM
  // that tends to be generous). Then good. Then anything else.
  take(bads, Math.ceil(MAX_EXAMPLES * 0.5));
  take(goods, Math.ceil(MAX_EXAMPLES * 0.35));
  take(neutral, MAX_EXAMPLES);

  return picked.slice(0, MAX_EXAMPLES).map(s => ({
    id: s.id,
    style: s.style,
    copyExcerpt: excerpt(s.copy),
    judgeScore: s.evaluation!.average_score,
    outcome: s.outcome,
    realCtrPct: s.performance ? ctrPercent(s.performance) ?? undefined : undefined,
    realCostPerClick: s.performance ? costPerClick(s.performance) ?? undefined : undefined,
    notes: s.performance?.notes?.trim() ? s.performance.notes.trim() : undefined,
  }));
}

const outcomeLabel = (o: Outcome | undefined): string => {
  if (o === 'used-good') return 'ลงจริงแล้ว ผลดี 👍';
  if (o === 'used-bad') return 'ลงจริงแล้ว ผลไม่ดี 👎';
  return 'ลงจริงแล้ว (ไม่ระบุผล)';
};

export function formatCalibrationForPrompt(
  examples: readonly CalibrationExample[],
): string {
  if (examples.length === 0) return '';

  const lines = examples
    .map((e, i) => {
      const parts: string[] = [];
      parts.push(`  ${i + 1}. [style: ${e.style}] "${e.copyExcerpt}"`);
      parts.push(`     - คะแนน Judge ตอนนั้น: ${e.judgeScore.toFixed(1)}/10`);
      parts.push(`     - ผลจริงในร้าน: ${outcomeLabel(e.outcome)}`);
      if (typeof e.realCtrPct === 'number') {
        parts.push(`       · CTR: ${e.realCtrPct.toFixed(2)}%`);
      }
      if (typeof e.realCostPerClick === 'number') {
        // CPC is a strong signal alongside CTR: high CTR + high CPC may mean
        // wrong audience targeting; low CTR + low CPC may mean cheap reach.
        // Judge should factor it into the calibration prior, not just CTR alone.
        parts.push(`       · ต้นทุนต่อคลิก: ฿${e.realCostPerClick.toFixed(2)} (CPC สูง = audience ตรงน้อย / ต่ำ = ตรงกลุ่ม)`);
      }
      if (e.notes) parts.push(`       · บันทึก: ${e.notes}`);
      return parts.join('\n');
    })
    .join('\n\n');

  return `
═══════════════════════════════════════════════════════════════
CALIBRATION_FROM_PAST_ADS — โฆษณาที่ลงจริงในร้าน "ม่านธารา" และผลลัพธ์ที่เกิดขึ้นจริง:

${lines}

กฎสำหรับใช้ block นี้:
1. ถ้าโฆษณาใหม่มี hook/structure/tone คล้าย ad ที่ "ผลไม่ดี 👎" → ให้คะแนนต่ำลง แม้ aesthetic ดี (โดยเฉพาะ scroll_stop และ focused)
2. ถ้าใกล้กับ ad ที่ "ผลดี 👍" → ยืนยันให้คะแนนสูงได้ตรงไปตรงมา
3. ห้ามอ้างถึง ad เหล่านี้ตรงๆ ใน verdict/suggestion — ใช้แค่เป็น calibration prior
4. ผลจริง > สัญชาตญาณของ panel — ถ้าคะแนน Judge เคยพลาดทาง ให้ปรับเอง
═══════════════════════════════════════════════════════════════
`;
}

/** Stable hash for cache key — changes when examples or their key fields change. */
export function hashCalibrationExamples(
  examples: readonly CalibrationExample[],
): string {
  if (examples.length === 0) return '';
  return examples
    .map(e =>
      `${e.id}:${e.judgeScore.toFixed(1)}:${e.outcome ?? '-'}`
      + `:${e.realCtrPct?.toFixed(2) ?? '-'}`
      + `:${e.realCostPerClick?.toFixed(2) ?? '-'}`,
    )
    .join('|');
}
