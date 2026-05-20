import * as v from 'valibot';
import { callAI, type AIRole } from '../lib/ai-providers';
import { extractJson, JsonExtractionError } from '../lib/json-extract';
import {
  AdIdeaArraySchema,
  AdIdeaSchema,
  AdEvaluationSchema,
  VisualPromptSchema,
  PERSONA_LABELS,
  panelAverage,
  type AdEvaluation,
  type ParsedAdIdea,
  type PersonaEval,
  type VisualPrompt,
} from '../lib/schemas';
import {
  CORE_PERSONA_POOL,
  hashPersonaPool,
  type Persona,
} from '../lib/persona-pool';
import type { TrendsSnapshot } from './trends';
import {
  formatBrandFactsForPrompt,
  hashBrandFacts,
  type BrandFact,
} from '../lib/brand-facts';
import { buildTimeContextBlock } from '../lib/seasonal-context';
import { buildNicheContextBlock, filterNicheTrends } from '../lib/niche-seeds';
import {
  formatCalibrationForPrompt,
  hashCalibrationExamples,
  type CalibrationExample,
} from '../lib/calibration';
import {
  formatStrategyForGeneration,
  formatStrategyForEvaluation,
  formatStrategyForRewrite,
  hashStrategyBrief,
  isBriefUsable,
  type StrategyBrief,
} from '../lib/strategy-brief';
import type { CommunitySim } from '../lib/schemas';

export type { AdEvaluation, VisualPrompt, PersonaEval, PersonaId } from '../lib/schemas';
export { personaAverage, panelAverage, PERSONA_LABELS } from '../lib/schemas';

export interface AdIdea extends ParsedAdIdea {
  clientId: string;
}

/**
 * Bump whenever the Judge system prompt changes meaningfully (rubric,
 * scoring instructions, anti-template rules, persona-pool instructions).
 * Calibration filters out saved ads whose prompt_version differs so old
 * scores don't drag the new prompt's calibration.
 *
 * Format: YYYY-MM-DD of the change.
 */
export const JUDGE_PROMPT_VERSION = '2026-05-21';

const logExtractionFailure = (label: string, err: unknown): void => {
  if (err instanceof JsonExtractionError) {
    console.error(`[${label}] ${err.message}\nRaw response:\n`, err.raw);
  } else {
    console.error(`[${label}] Unexpected parse error:`, err);
  }
};

const formatIssuesForRepair = (err: JsonExtractionError): string => {
  const issues = err.issues ?? [];
  if (issues.length === 0) return `- ${err.message}`;
  return issues
    .map(issue => {
      const path = issue.path
        ?.map(seg => {
          const key = (seg as { key?: unknown }).key;
          return typeof key === 'string' || typeof key === 'number' ? String(key) : '?';
        })
        .join('.');
      return path ? `- ${path}: ${issue.message}` : `- ${issue.message}`;
    })
    .join('\n');
};

const buildRepairPrompt = (originalUserPrompt: string, err: JsonExtractionError): string =>
  `${originalUserPrompt}

⚠️ ก่อนหน้านี้คุณตอบ JSON ที่ไม่ผ่านการตรวจสอบ schema. ปัญหาที่พบ:
${formatIssuesForRepair(err)}

โปรดตอบใหม่เป็น JSON ที่ถูกต้องตาม schema ที่กำหนดเท่านั้น ห้ามมีข้อความอื่นผสม.`;

type Caller = (system: string, user: string, signal?: AbortSignal) => Promise<string>;

interface GenerateAndExtractArgs<TSchema extends v.GenericSchema> {
  readonly label: string;
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly schema: TSchema;
  readonly kind: 'object' | 'array';
  readonly caller: Caller;
  readonly signal?: AbortSignal;
}

const generateAndExtract = async <TSchema extends v.GenericSchema>(
  args: GenerateAndExtractArgs<TSchema>,
): Promise<v.InferOutput<TSchema>> => {
  const { label, systemPrompt, userPrompt, schema, kind, caller, signal } = args;

  const initial = await caller(systemPrompt, userPrompt, signal);
  try {
    return extractJson(initial, { schema, kind });
  } catch (firstErr) {
    if (!(firstErr instanceof JsonExtractionError)) throw firstErr;

    console.warn(
      `[${label}] schema mismatch on first attempt — retrying with repair prompt. Issues: ${firstErr.message}`,
    );

    const repairPrompt = buildRepairPrompt(userPrompt, firstErr);
    const retry = await caller(systemPrompt, repairPrompt, signal);
    return extractJson(retry, { schema, kind });
  }
};

const callerFor = (role: AIRole, cacheKeyData?: string): Caller =>
  (system, user, signal) => callAI(role, system, user, { signal, cacheKeyData });

// ════════════════════════════════════════════════════════════════════
// generateAds — 4 styles (3 classic + GenZ-coded)
// ════════════════════════════════════════════════════════════════════

export interface GenerateAdsOptions {
  readonly brandFacts?: readonly BrandFact[];
  readonly strategyBrief?: StrategyBrief | null;
}

export const generateAds = async (
  productInfo: string,
  promotion: string,
  signal?: AbortSignal,
  options: GenerateAdsOptions = {},
): Promise<AdIdea[]> => {
  const factsBlock = formatBrandFactsForPrompt(options.brandFacts ?? []);
  const briefBlock = isBriefUsable(options.strategyBrief ?? null)
    ? formatStrategyForGeneration(options.strategyBrief ?? null)
    : '';
  const timeBlock = buildTimeContextBlock();
  const nicheBlock = buildNicheContextBlock();
  const systemPrompt = `คุณคือผู้เชี่ยวชาญการตลาด Facebook + TikTok ในไทย ทำงานให้ธุรกิจ "ม่านธารา" (หน้าร้านอยู่ท่าศาลา ลพบุรี)
จงสร้างไอเดียโฆษณา 4 สไตล์ — สามสไตล์แรกพูดกับลูกค้าหลัก (พ่อบ้าน-แม่บ้าน-เจ้าของธุรกิจ ในลพบุรี),
สไตล์ที่ 4 พูดกับ GenZ Thai (อายุ 18-28, อยู่คอนโด/หอ, ติด TikTok, เน้น aesthetic) — ห้ามใช้สำเนียงเดียวกัน

1. จริงใจแก้ปัญหา (เน้นกันร้อน สู้แดดลพบุรี ค่าไฟลด เหตุผลใช้งานจริง)
2. พรีเมียม (Smart & Reliable วัสดุนำเข้า รับประกัน ดูแพง)
3. สั้นกระชับ (ติดไว · งานเนี้ยบ · จบปัญหา — ไม่เกิน 60 คำ)
4. GenZ-coded (POV/behind-the-scenes, aesthetic-first, ไม่ขายตรง)

ข้อบังคับสำหรับสไตล์ที่ 4 (GenZ) — สำคัญมาก:
• สั้น ไม่เกิน 220 ตัวอักษร อ่านจบใน 3 วินาที
• ภาษาแชท: ใช้ "อ่ะ", "งี้", "เลย", "ไหม", "นะ" — ห้ามใช้ "ค่ะ/ครับ", "ท่าน", "พบกับ", "เรียนเชิญ", "พิเศษเฉพาะคุณ"
• เปิดด้วย hook 1 บรรทัด (เช่น "POV:", "เรื่องที่ไม่มีใครบอก:", "วันนี้มาเล่าให้ฟัง...")
• Aesthetic > Feature: พูดเรื่อง vibe, แสง, มุดดี้, golden hour, soft light, สีในห้อง — ก่อนคุณสมบัติสินค้า
• สแลง: ใช้ได้ไม่เกิน 2 คำต่อโฆษณา และ "ใช้เฉพาะคำที่คุณมั่นใจ ≥90% ว่าใช้กันอยู่จริงในเดือนนี้" — ถ้าไม่แน่ใจให้ตัดทิ้ง (สแลงที่ตกยุคทำให้ ad ดูแก่กว่าไม่ใส่)
• Emoji ใช้เป็นเครื่องหมายวรรคตอน 1-2 ตัวเท่านั้น (เลือกให้เข้ากับ mood ของ ad) ห้ามสแปม
• ห้าม corporate-speak: "นวัตกรรม", "ครบครัน", "ตอบโจทย์ทุกไลฟ์สไตล์", "!!!"
• visual_idea ต้องระบุ: aspect ratio (9:16 หรือ 4:5), shot type (close-up/POV/over-shoulder), mood (golden hour / blue hour / overcast)

สำหรับสไตล์ที่ 1-3 ให้คุมโทนเดิม (warm/practical/business) ห้ามเอา GenZ slang มาใช้

บังคับตอบกลับเป็น JSON Array รูปแบบด้านล่างนี้เท่านั้น ห้ามมีคำอธิบายอื่นผสม:
[
  {"style": "จริงใจแก้ปัญหา", "copy": "...", "visual_idea": "..."},
  {"style": "พรีเมียม", "copy": "...", "visual_idea": "..."},
  {"style": "สั้นกระชับ", "copy": "...", "visual_idea": "..."},
  {"style": "GenZ-coded", "copy": "...", "visual_idea": "..."}
]${timeBlock}${nicheBlock}${factsBlock}${briefBlock}`;

  const userPrompt = `สินค้า/บริการที่จะโปรโมท: ${productInfo}\nโปรโมชันหรือจุดเด่น: ${promotion}`;

  try {
    const parsed = await generateAndExtract({
      label: 'generateAds',
      systemPrompt,
      userPrompt,
      schema: AdIdeaArraySchema,
      kind: 'array',
      caller: callerFor('generator'),
      signal,
    });
    return parsed.map(ad => ({ ...ad, clientId: crypto.randomUUID() }));
  } catch (e) {
    logExtractionFailure('generateAds', e);
    return [];
  }
};

// ════════════════════════════════════════════════════════════════════
// evaluateAd — Mirofish-style 4-persona panel with trends injection
// ════════════════════════════════════════════════════════════════════

const fmtTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const buildTrendsBlock = (trends: TrendsSnapshot | null): string => {
  if (!trends || trends.daily_top.length === 0) return '';

  const nowTime = fmtTime(trends.cached_at);
  const prevTime = trends.previous_cached_at ? fmtTime(trends.previous_cached_at) : '';

  const current = trends.daily_top
    .slice(0, 10)
    .map((t, i) => `  ${i + 1}. ${t}`)
    .join('\n');

  const previousBlock = trends.daily_top_previous.length
    ? `\n\nเมื่อ ~30 นาทีก่อน${prevTime ? ` (${prevTime})` : ''}:\n${trends.daily_top_previous
        .slice(0, 10)
        .map((t, i) => `  ${i + 1}. ${t}`)
        .join('\n')}`
    : '';

  const newBlock = trends.new_in_window.length
    ? `\n\nเพิ่งเข้ามาใหม่ใน 30 นาทีนี้ (สำคัญ — GenZ มักจับเทรนด์ที่กำลังลุก):\n${trends.new_in_window
        .map(t => `  • ${t}`)
        .join('\n')}`
    : '';

  const nicheMatches = filterNicheTrends([
    ...trends.daily_top,
    ...trends.daily_top_previous,
  ]);
  const nicheBlock = nicheMatches.length
    ? `\n\n⭐ ตรงกับ niche ของม่านธารา (น้ำหนักสูง):\n${[...new Set(nicheMatches)]
        .map(t => `  ★ ${t}`)
        .join('\n')}`
    : '';

  const related = trends.related.length
    ? `\n\nที่เกี่ยวข้องกับสินค้านี้: ${trends.related.join(', ')}`
    : '';

  return `\n<TRENDS_TODAY date="${trends.cached_at.slice(0, 10)}" geo="TH">
ตอนนี้${nowTime ? ` (${nowTime})` : ''}:
${current}${previousBlock}${newBlock}${nicheBlock}${related}
</TRENDS_TODAY>
ใช้ block นี้เฉพาะกับ persona GenZ: ให้คะแนน scroll_stop เพิ่มถ้าโฆษณาอ้างอิงเทรนด์ได้แนบเนียน (โดยเฉพาะ "เพิ่งเข้ามาใหม่" และ "ตรงกับ niche ⭐") หักถ้าใช้ผิดบริบทหรือพยายามเกินไป.
ห้ามใช้กับ persona พ่อบ้าน/แม่บ้าน/เจ้าของธุรกิจ — พวกเขาไม่ติดเทรนด์ TikTok
ถ้าใช้เทรนด์ใดในการประเมิน ให้ระบุใน field "trends_used"
`;
};

const formatCommunitySimForPrompt = (sim: CommunitySim | null): string => {
  if (!sim) return '';
  const obj = sim.top_objections
    .slice(0, 5)
    .map((o, i) => `  ${i + 1}. (×${o.count}) ${o.text}`)
    .join('\n');
  const quotes = sim.representative_quotes
    .slice(0, 4)
    .map(q => `  [${q.stance}] "${q.text}"`)
    .join('\n');
  return `

═══════════════════════════════════════════════════════════════
<COMMUNITY_SIM_RESULT>  (Super-Judge: real agents already reacted)
Sample: ${sim.responses_total} responses · ${sim.config.agent_count} agents × ${sim.config.rounds} rounds
Sentiment       : positive ${sim.sentiment.positive}% · neutral ${sim.sentiment.neutral}% · negative ${sim.sentiment.negative}%
Click intent    : ${sim.click_intent}% (yes + 0.5 × maybe)
Trust score     : ${sim.trust_score.toFixed(1)} / 5
Virality signal : ${sim.virality_signal}% (would-share=yes)

Top objections from agents:
${obj || '  (none reported)'}

Representative quotes:
${quotes || '  (none)'}

⚠️ Use this signal as ground-truth grounding when scoring. If community
sentiment is mostly negative but a persona would normally rate high,
that's a red flag — let it pull the persona's confidence and verdict
toward what the community actually showed. Cite top objections in
suggestions where relevant.
═══════════════════════════════════════════════════════════════`;
};

const hashCommunitySim = (sim: CommunitySim | null): string => {
  if (!sim) return '';
  // sim_id is unique per run — enough to invalidate cache.
  return sim.sim_id;
};

/**
 * Render the persona pool as a compact reference block for the Judge.
 * The pool now grows dynamically from Strategy Brief expansion (Track
 * F-option-A) — Judge picks 4-12 most-relevant per ad instead of being
 * locked to a fixed 15-persona enum.
 *
 * Each line: `id (label) — description [· segment context if present]`
 * Compact enough to keep prompt size reasonable even at 50 personas.
 */
const buildPersonaPoolBlock = (pool: readonly Persona[]): string => {
  const active = pool.filter(p => p.enabled);
  if (active.length === 0) return '';
  const lines = active.map(p => {
    const tag = p.source_segment_name ? ` [segment: ${p.source_segment_name}]` : '';
    return `  ${p.id} (${p.label}) — ${p.description}${tag}`;
  });
  return `PERSONA POOL — ${active.length} archetypes (เลือก 4-12 ตัวที่เกี่ยวข้องมากที่สุดกับ ad นี้)
${lines.join('\n')}`;
};

const buildJudgePrompt = (
  trends: TrendsSnapshot | null,
  brandFacts: readonly BrandFact[],
  personaPool: readonly Persona[],
  calibration: readonly CalibrationExample[] = [],
  strategyBrief: StrategyBrief | null = null,
  communitySim: CommunitySim | null = null,
  cacheSalt: string = '',
): string => {
  const personaPoolBlock = buildPersonaPoolBlock(personaPool);
  const trendsBlock = buildTrendsBlock(trends);
  const factsBlock = formatBrandFactsForPrompt(brandFacts);
  const calibrationBlock = formatCalibrationForPrompt(calibration);
  const timeBlock = buildTimeContextBlock();
  const nicheBlock = buildNicheContextBlock();
  const briefBlock = isBriefUsable(strategyBrief)
    ? formatStrategyForEvaluation(strategyBrief)
    : '';
  const strategyFitJsonField = briefBlock
    ? `,\n  "strategy_fit": {
    "positioning_score": 0,
    "positioning_critique": "...",
    "jtbd_coverage": [
      {"segment_name": "...", "score": 0, "gap": "..."}
    ],
    "whitespace_capture": 0,
    "whitespace_critique": "..."
  }`
    : '';
  const strategyFitInstructions = briefBlock
    ? `

═══════════════════════════════════════════════════════════════
STRATEGY FIT — เนื่องจากมี <STRATEGY_BRIEF> ติดมา ให้ Judge เพิ่มประเมิน strategy_fit ใน output:
  positioning_score (0-10) : ad เคารพ positioning archetype + value_prop + tone_rules ของ brief แค่ไหน
                              หัก ถ้าใช้ anti-positioning words; เพิ่ม ถ้าสะท้อน brand_promises ตรง
  positioning_critique     : 1 ประโยคสั้นๆ ว่าตรงหรือหลุดตรงไหน (ไม่เกิน 240 ตัวอักษร)
  jtbd_coverage            : per-segment list (ใส่ทุก segment ใน brief — ใช้ชื่อ segment ตรง field "name")
                              score (0-10) = ad address JTBD + winning_angle + objection ของ segment นั้นแค่ไหน
                              gap          = ช่องโหว่หลัก (ถ้าคะแนนเต็ม ใส่ "—")
  whitespace_capture (0-10): ad เล่นมุม whitespace_opportunity ที่ brief เสนอหรือไม่
                              0 = ซ้ำ positioning คู่แข่ง, 10 = ครอบมุมใหม่ตามคำแนะนำเป๊ะ
  whitespace_critique      : 1 ประโยค
ใส่ field "strategy_fit" ใน JSON output ตามรูปแบบด้านล่าง`
    : '';
  return `คุณคือ Consumer Panel Simulator สำหรับ "ม่านธารา" (ท่าศาลา, ลพบุรี)
จงเลือกผู้บริโภค "อย่างน้อย 6 ตัว ไม่เกิน 10 ตัว" (sweet spot สำหรับ B2C) จาก persona pool ด้านล่าง
ที่ "เกี่ยวข้องมากที่สุดกับ ad นี้"  ห้ามให้คะแนน "เฉลี่ยๆ" — ถ้าโฆษณาไม่ตรงกลุ่ม ให้คะแนนต่ำตรงไปตรงมา

═══════════════════════════════════════════════════════════════
${personaPoolBlock}

กฎการเลือกจำนวน:
🎯 **ขั้นต่ำ 6 personas · เป้าหมาย 8 · เพดาน 10** (schema ยอมรับ 3-12 แต่ "6-10" คือ sweet spot จริง)
   - ทำไม 6+ — ad B2C เกือบทุกตัวมี audience overlap 3-5 archetypes หลัก × 2-3 sub variants
   - ถ้าให้ < 6 = blind spot สูง · ถ้าให้ > 10 = noise ครอบงำ signal
   - แม้คิดว่า ad ตรงกลุ่มแคบ ก็ยังต้อง stress-test กับ persona "นอกกลุ่ม" 1-2 ตัว
     เพื่อยืนยันว่ามัน "ไม่หลุด" ในจริง ๆ

กฎการเลือกตัว:
• ถ้า ad เน้น aesthetic/visual → ต้องมี GenZ + มิลเลนเนียล + housewife-urban
• ถ้า ad เน้นตัวเลข/warranty/ROI → ต้องมี family_man + businessman + contractor
• ถ้า ad เน้นราคาถูก → ต้องมี price_hunter + family_man
• ถ้ามี Strategy Brief ติดมา (ด้านล่าง) → priority คือ linked_persona ของ segments ใน brief +
  sub-personas ที่ generate มาจาก segments เหล่านั้น (id ขึ้นต้นด้วย "seg-")
• ถ้า ad เป็น B2B → ต้องมี businessman + businessman_hotelier + contractor + interior_designer
• ห้ามเลือก "พรรค pleaser" ที่ชอบทุกอย่าง — ต้องมีอย่างน้อย 1-2 คนที่ "เฉยๆ หรือไม่ชอบ" ถ้า ad มีจุดอ่อน
• Pool มี sub-personas ที่ขยายจาก segments เดียวกัน — เลือกข้าม segments เพื่อ stress-test ครอบคลุม
${trendsBlock}
═══════════════════════════════════════════════════════════════
สำหรับแต่ละ persona ที่คุณเลือก ให้คะแนน 3 มิติ (สำคัญที่สุด — ห้ามใส่คะแนนเดียวรวม):
  scroll_stop_score (0-10) : 0.5 วินาทีแรก หยุดเลื่อนได้ไหม (gut reaction)
  focused_score    (0-10)  : หลังจ้อง 5 วินาที ตัดสินใจได้ไหม (rational)
  memory_score     (0-10)  : ผ่านไป 1 ชั่วโมง ยังจำได้ไหม (retention)

🎯 ANTI-TEMPLATE rules (สำคัญที่สุด — กันการให้คะแนนแบบ lazy template):
  1. **ห้าม pattern [N, N-1, N-1]** กับทุก persona เช่น [9,8,8]→[8,7,7]→[7,6,6] เป็น template
     LLM ส่วนใหญ่ default แบบนี้ → ห้ามทำ · ทุก persona ต้องคิดแต่ละมิติแยก
  2. **ภายใน 1 persona — 3 มิติต้องกระจายจริง** ไม่ใช่เรียงลำดับ
     ตัวอย่าง: ad 'hook ปังแต่ลืมง่าย' → scroll_stop=9, focused=6, memory=3 (spread 6)
     ตัวอย่าง: ad 'ไม่สะดุดตาแต่อ่านเข้าใจ' → scroll_stop=4, focused=8, memory=7
     ถ้า scroll/focused/memory ใกล้กัน ±1 ตลอดทุก persona = template lazy

แต่ละ persona ต้องตอบ:
  id            : ใช้ id ตรงตามรายการใน pool ด้านบน (เช่น "family_man", "businessman_hotelier", "price_hunter")
  confidence    : ความมั่นใจในการประเมิน — "high" / "med" / "low"
                  high = โฆษณาสื่อสารชัดเจน คุณตัดสินได้แน่นอน
                  med  = ดูได้บางส่วน แต่บางอย่างยังไม่ชัด
                  low  = โฆษณาคลุมเครือ ตีความได้หลายแบบ ตัดสินไม่แน่นอน
                  (ใช้ low อย่างจริงใจถ้าคุณไม่แน่ใจจริงๆ — ดีกว่าให้คะแนนมั่วๆ)
  verdict       : สรุปความรู้สึก 1 ประโยค (ไม่เกิน 100 ตัวอักษร ใช้ภาษาที่ persona ใช้จริง)
  suggestion    : คำแนะนำเฉพาะ 1 ข้อ ที่จะทำให้คะแนนสูงขึ้น (ไม่เกิน 120 ตัวอักษร)

panel_verdict : สรุปฉันทามติของทั้ง panel 1 บรรทัด (เช่น "ปังกับ GenZ แต่หลุดกับพ่อบ้าน")
trends_used   : array ของเทรนด์ที่ใช้ในการประเมิน (ใส่ [] ถ้าไม่ใช้)
average_score : ค่าเฉลี่ยของคะแนนย่อยทั้งหมด (3 มิติ × N personas ที่เลือก) ปัดทศนิยม 1 ตำแหน่ง

═══════════════════════════════════════════════════════════════
STRUCTURAL ANALYSIS — แยกประเมิน ad copy เป็น 3 ส่วน (ที่ระดับ ad ไม่ใช่ persona):
  hook_score    : 1-2 บรรทัดแรกที่ตา hit ก่อน — หยุดสายตาได้ไหม specific เพียงพอไหม
  body_score    : เนื้อหากลาง — มี proof point, ตัวเลข, story arc, persuasion technique
  cta_score     : ปิดท้ายเรียก action — ชัด, urgent, low-friction
  hook_critique / body_critique / cta_critique : วิจารณ์ส่วนนั้น 1 ประโยคสั้น

═══════════════════════════════════════════════════════════════
CHANNEL FIT — ประเมินว่า ad นี้เหมาะกับ channel ไหน (เลือก 2-3 ช่องที่เกี่ยวข้องที่สุด · 0-10):
  facebook_feed    : คอนเทนต์ผสมรูป+ข้อความยาว เห็นเต็ม mobile/desktop ลูกค้าโต-วัยทำงาน
  facebook_reels   : vertical video 9:16 สั้น เน้น hook 0.5s, voice-on
  instagram_feed   : aesthetic-first, square/portrait, ลูกค้า aspirational
  instagram_reels  : vertical video, สาย aesthetic + creator
  tiktok           : vertical video, sound-on, vibe-first, edit เร็ว

ถ้า ad เน้นข้อความ + รูป → facebook_feed/instagram_feed score สูง
ถ้า ad เป็น POV/BTS/sound-driven → tiktok/reels score สูง
ถ้า ad ยาว 4-5 บรรทัด → facebook_feed > reels (เพราะ reels ไม่อ่านข้อความ)
ranked = top 2-3 ช่องที่ดีที่สุด เรียงจากสูงสุดลงต่ำ · **ห้ามใส่ทั้ง 5** เพราะหลายช่องไม่ได้เกี่ยวข้องจริง
best = id ของช่อง top 1 (ต้องอยู่ใน ranked)
reasoning = สั้น ๆ ว่าทำไมเลือก best เหนือกว่า alternatives (~80 ตัวอักษร)
${strategyFitInstructions}

═══════════════════════════════════════════════════════════════
บังคับตอบเป็น JSON object รูปแบบนี้เท่านั้น ห้ามมีข้อความอื่นผสม
**สำคัญเรื่อง quotes:** ใช้ ASCII straight " (U+0022) เท่านั้น ห้ามใช้ smart/curly quotes (‘ ’ “ ”) เด็ดขาด
ตัวอย่างผิด: {"channel": "facebook_feed’, ‘score": 8}  ← curly singles ปะปน
ตัวอย่างถูก: {"channel": "facebook_feed", "score": 8}:
{
  "panel_verdict": "...",
  "trends_used": ["..."],
  "structure": {
    "hook_score": 0, "hook_critique": "...",
    "body_score": 0, "body_critique": "...",
    "cta_score":  0, "cta_critique":  "..."
  },
  "channel_fit": {
    "ranked": [
      {"channel": "tiktok",          "score": 0},
      {"channel": "instagram_reels", "score": 0},
      {"channel": "facebook_feed",   "score": 0}
    ],
    "best": "tiktok",
    "reasoning": "..."
  },
  "personas": [
    /* ใส่ 6-10 entries (ขั้นต่ำ 3 เพื่อให้ schema ผ่าน · เป้าหมาย 8)
       เลือกเฉพาะ persona ที่ "เกี่ยวข้องจริง" จาก pool ด้านบน
       id ต้องตรงเป๊ะกับ id ใน pool */
    {"id": "family_man",  "scroll_stop_score": 0, "focused_score": 0, "memory_score": 0, "confidence": "high", "verdict": "...", "suggestion": "..."},
    {"id": "housewife",   "scroll_stop_score": 0, "focused_score": 0, "memory_score": 0, "confidence": "med",  "verdict": "...", "suggestion": "..."},
    {"id": "price_hunter","scroll_stop_score": 0, "focused_score": 0, "memory_score": 0, "confidence": "low",  "verdict": "...", "suggestion": "..."}
  ],
  "average_score": 0.0${strategyFitJsonField}
}${timeBlock}${nicheBlock}${factsBlock}${calibrationBlock}${briefBlock}${formatCommunitySimForPrompt(communitySim)}${
    cacheSalt ? `\n\n<!-- ensemble run: ${cacheSalt} — independent panel, different perspective -->` : ''
  }`;
};

export interface EvaluateAdOptions {
  readonly trends?: TrendsSnapshot | null;
  readonly brandFacts?: readonly BrandFact[];
  /**
   * Stable salt to differentiate cache entries between ensemble runs.
   * Use 'r2', 'r3' etc. for repeated evaluations; omit for the baseline.
   */
  readonly cacheSalt?: string;
  /**
   * Past saved ads + their real outcomes — Judge sees these as few-shot
   * priors so it can adjust scoring toward what actually works in the shop.
   */
  readonly calibration?: readonly CalibrationExample[];
  /** Strategy Brief — positioning, segments, competitors, benchmarks. */
  readonly strategyBrief?: StrategyBrief | null;
  /**
   * Community-sim aggregate result (Track E.M2 — Super-Judge). When
   * supplied, the Judge prompt gets sentiment + click-intent + objections
   * as additional grounding context. The judge does NOT emit the
   * community_sim block; it just consumes it.
   */
  readonly communitySim?: CommunitySim | null;
  /**
   * Persona pool fed into the Judge prompt. Defaults to the 15 core
   * personas if omitted, but callers typically pass `usePersonaPool().active`
   * which adds Strategy-Brief-expanded sub-personas (Track F-option-A).
   */
  readonly personaPool?: readonly Persona[];
}

const round1 = (v: number): number => Math.round(v * 10) / 10;

const computePanelAverage = (evaluation: AdEvaluation): number => {
  // Confidence + channel weighted — see panelAverage() in schemas.ts.
  // Falls back to plain mean inside panelAverage if no channel is set.
  return round1(panelAverage(evaluation.personas, evaluation.channel_fit.best));
};

const stdOf = (xs: readonly number[]): number => {
  if (xs.length === 0) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / xs.length);
};

/**
 * Detect LLM lazy-scoring patterns the prompt warns against but can't
 * enforce. Surfaces flags into evaluation.quality_flags so the UI can
 * show a "panel may be templating" hint instead of treating the score
 * as trusted data.
 *
 * Flags:
 *   template-pattern     — within every persona, the 3 dimensions are nearly
 *                          identical (std < 0.7) AND there's a clear monotone
 *                          ordering (scroll >= focused >= memory or reverse)
 *                          across ≥80% of personas — the [N, N-1, N-1] tell.
 *   pleaser-bias         — every persona scored ≥5 on every dimension. Real
 *                          ads have ≥1 weak score somewhere; this flag means
 *                          the Judge avoided saying anything is bad.
 *   low-confidence-panel — majority confidence=low; treat scores as noise.
 */
const detectQualityFlags = (evaluation: AdEvaluation): string[] => {
  const flags: string[] = [];
  const personas = evaluation.personas;
  if (personas.length === 0) return flags;

  let lowSpreadCount = 0;
  let monotonicCount = 0;
  let allAboveFive = true;
  let lowConf = 0;
  for (const p of personas) {
    const dims = [p.scroll_stop_score, p.focused_score, p.memory_score];
    if (stdOf(dims) < 0.7) lowSpreadCount += 1;
    // monotonic descending (scroll >= focused >= memory) is the most common
    // template; also count ascending for completeness.
    const desc = dims[0] >= dims[1] && dims[1] >= dims[2];
    const asc = dims[0] <= dims[1] && dims[1] <= dims[2];
    if (desc || asc) monotonicCount += 1;
    if (dims.some(d => d < 5)) allAboveFive = false;
    if (p.confidence === 'low') lowConf += 1;
  }

  const n = personas.length;
  if (lowSpreadCount / n >= 0.8 && monotonicCount / n >= 0.8) {
    flags.push('template-pattern');
  }
  if (allAboveFive) flags.push('pleaser-bias');
  if (lowConf / n > 0.5) flags.push('low-confidence-panel');
  return flags;
};

export const evaluateAd = async (
  ad: AdIdea,
  signal?: AbortSignal,
  options: EvaluateAdOptions = {},
): Promise<AdEvaluation | null> => {
  const trends = options.trends ?? null;
  const brandFacts = options.brandFacts ?? [];
  const calibration = options.calibration ?? [];
  const strategyBrief = options.strategyBrief ?? null;
  const communitySim = options.communitySim ?? null;
  const personaPool = options.personaPool ?? CORE_PERSONA_POOL;
  const salt = options.cacheSalt ?? '';
  const systemPrompt = buildJudgePrompt(
    trends,
    brandFacts,
    personaPool,
    calibration,
    strategyBrief,
    communitySim,
    salt,
  );

  const userPrompt = `ประเมินโฆษณาต่อไปนี้:
ข้อความ: ${ad.copy}
ภาพ: ${ad.visual_idea}`;

  const trendsDate = trends?.cached_at.slice(0, 10) ?? 'no-trends';
  const factsHash = hashBrandFacts(brandFacts);
  const calibHash = hashCalibrationExamples(calibration);
  const briefHash = hashStrategyBrief(strategyBrief);
  const simHash = hashCommunitySim(communitySim);
  const poolHash = hashPersonaPool(personaPool);
  const cacheKeyData = `${ad.copy}\n${ad.visual_idea}\n${trendsDate}\n${factsHash}\n${calibHash}\n${briefHash}\n${simHash}\n${poolHash}\n${salt}`;

  try {
    const parsed = await generateAndExtract({
      label: 'evaluateAd',
      systemPrompt,
      userPrompt,
      schema: AdEvaluationSchema,
      kind: 'object',
      caller: callerFor('judge', cacheKeyData),
      signal,
    });
    // Override LLM-emitted average_score with deterministic client-side
    // computation. LLM math on 18-30 numeric fields is not reliable; the
    // headline number must come from the same scores the UI renders.
    const withClientAvg: AdEvaluation = {
      ...parsed,
      average_score: computePanelAverage(parsed),
      prompt_version: JUDGE_PROMPT_VERSION,
    };
    const flags = detectQualityFlags(withClientAvg);
    return flags.length > 0 ? { ...withClientAvg, quality_flags: flags } : withClientAvg;
  } catch (e) {
    logExtractionFailure('evaluateAd', e);
    return null;
  }
};

// ════════════════════════════════════════════════════════════════════
// runEnsembleEval — call evaluateAd N-1 more times in parallel, then
// aggregate (mean per numeric field, mode per discrete field) and return
// a single AdEvaluation augmented with ensemble metadata (variance, runs).
// ════════════════════════════════════════════════════════════════════

const STD_THRESHOLD = 1.0;

const std = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length,
  );
};

const mean = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
};

const mode = <T extends string>(values: readonly T[]): T => {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0];
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return best;
};

function aggregateEvaluations(runs: readonly AdEvaluation[]): AdEvaluation {
  if (runs.length === 0) throw new Error('aggregateEvaluations: empty input');
  const baseline = runs[0];
  const unstable: string[] = [];
  const stds: number[] = [];

  const trackField = (label: string, vals: readonly number[]): number => {
    const s = std(vals);
    stds.push(s);
    if (s > STD_THRESHOLD) unstable.push(label);
    return round1(mean(vals));
  };

  // structure
  const structure = {
    hook_score: trackField('structure.hook', runs.map(r => r.structure.hook_score)),
    body_score: trackField('structure.body', runs.map(r => r.structure.body_score)),
    cta_score: trackField('structure.cta', runs.map(r => r.structure.cta_score)),
    hook_critique: baseline.structure.hook_critique,
    body_critique: baseline.structure.body_critique,
    cta_critique: baseline.structure.cta_critique,
  };

  // channel_fit — aggregate per channel score, pick best by aggregated mean
  const channelIds = baseline.channel_fit.ranked.map(r => r.channel);
  const aggregatedChannels = channelIds.map(ch => {
    const scores = runs
      .map(r => r.channel_fit.ranked.find(rr => rr.channel === ch)?.score)
      .filter((s): s is number => typeof s === 'number');
    return {
      channel: ch,
      score: trackField(`channel_fit.${ch}`, scores),
    };
  });
  aggregatedChannels.sort((a, b) => b.score - a.score);
  const channel_fit = {
    ranked: aggregatedChannels,
    best: aggregatedChannels[0].channel,
    reasoning: baseline.channel_fit.reasoning,
  };

  // personas
  const personaIds = baseline.personas.map(p => p.id);
  const personas = personaIds.map(pid => {
    const samples = runs
      .map(r => r.personas.find(p => p.id === pid))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    return {
      id: pid,
      scroll_stop_score: trackField(
        `${pid}.scroll_stop`,
        samples.map(s => s.scroll_stop_score),
      ),
      focused_score: trackField(
        `${pid}.focused`,
        samples.map(s => s.focused_score),
      ),
      memory_score: trackField(
        `${pid}.memory`,
        samples.map(s => s.memory_score),
      ),
      confidence: mode(samples.map(s => s.confidence)),
      verdict: samples[0].verdict,
      suggestion: samples[0].suggestion,
    };
  });

  // Derive panel average from the aggregated personas the UI will render,
  // weighted by confidence + channel-fit best. Keeps the headline number
  // consistent with the score bars below it.
  const average_score = round1(panelAverage(personas, channel_fit.best));
  const max_std = stds.length === 0 ? 0 : Math.max(...stds);

  const aggregated: AdEvaluation = {
    panel_verdict: baseline.panel_verdict,
    trends_used: baseline.trends_used,
    structure,
    channel_fit,
    personas,
    average_score,
    prompt_version: baseline.prompt_version ?? JUDGE_PROMPT_VERSION,
    ensemble: {
      runs: runs.length,
      variance: {
        max_std: round1(max_std),
        unstable_fields: unstable,
      },
    },
  };
  const flags = detectQualityFlags(aggregated);
  return flags.length > 0 ? { ...aggregated, quality_flags: flags } : aggregated;
}

export interface EnsembleOptions {
  readonly trends?: TrendsSnapshot | null;
  readonly brandFacts?: readonly BrandFact[];
  readonly calibration?: readonly CalibrationExample[];
  readonly strategyBrief?: StrategyBrief | null;
  readonly personaPool?: readonly Persona[];
  /** Extra runs to perform on top of the baseline (default 2 → 3 total). */
  readonly additionalRuns?: number;
}

export const runEnsembleEval = async (
  ad: AdIdea,
  baseline: AdEvaluation,
  signal?: AbortSignal,
  options: EnsembleOptions = {},
): Promise<AdEvaluation | null> => {
  const extras = Math.max(1, options.additionalRuns ?? 2);
  const salts = Array.from({ length: extras }, (_, i) => `r${i + 2}`);

  const additional = await Promise.all(
    salts.map(salt =>
      evaluateAd(ad, signal, {
        trends: options.trends,
        brandFacts: options.brandFacts,
        calibration: options.calibration,
        strategyBrief: options.strategyBrief,
        personaPool: options.personaPool,
        cacheSalt: salt,
      }),
    ),
  );

  if (signal?.aborted) return null;

  const all: AdEvaluation[] = [baseline, ...additional.filter((r): r is AdEvaluation => r !== null)];
  if (all.length < 2) return null; // need at least 2 to compute variance

  return aggregateEvaluations(all);
};

// ════════════════════════════════════════════════════════════════════
// rewriteAd — generate a single rewrite of an ad that incorporates one
// persona's suggestion, keeping the same `style`.
// ════════════════════════════════════════════════════════════════════

export interface RewriteAdOptions {
  readonly brandFacts?: readonly BrandFact[];
  readonly strategyBrief?: StrategyBrief | null;
}

export const rewriteAd = async (
  ad: AdIdea,
  persona: PersonaEval,
  signal?: AbortSignal,
  options: RewriteAdOptions = {},
): Promise<ParsedAdIdea | null> => {
  const factsBlock = formatBrandFactsForPrompt(options.brandFacts ?? []);
  const briefBlock = isBriefUsable(options.strategyBrief ?? null)
    ? formatStrategyForRewrite(options.strategyBrief ?? null, persona.id)
    : '';
  const timeBlock = buildTimeContextBlock();
  // Persona may be a generated sub-persona (seg-xxx-vN) not in the core
  // PERSONA_LABELS dict. Fall back to the raw id so the rewrite prompt
  // still has *something* readable to address.
  const personaLabel = PERSONA_LABELS[persona.id] ?? persona.id;

  const systemPrompt = `คุณคือ Senior copywriter ของม่านธารา
จง rewrite โฆษณาตาม feedback ที่ได้จาก consumer persona "${personaLabel}"
- รักษา style เดิม: "${ad.style}" (ห้ามเปลี่ยน)
- ปรับ copy + visual_idea ตาม suggestion โดยตรง
- ห้ามเพิ่มข้อมูลที่ไม่มีใน BRAND_FACTS / context
- ความยาวใกล้เคียง ad เดิม
${timeBlock}${factsBlock}${briefBlock}
บังคับตอบเป็น JSON object รูปแบบนี้เท่านั้น ห้ามมีข้อความอื่นผสม
**สำคัญเรื่อง quotes:** ใช้ ASCII straight " (U+0022) เท่านั้น ห้ามใช้ smart/curly quotes (‘ ’ “ ”) เด็ดขาด
ตัวอย่างผิด: {"channel": "facebook_feed’, ‘score": 8}  ← curly singles ปะปน
ตัวอย่างถูก: {"channel": "facebook_feed", "score": 8}:
{"style": "${ad.style}", "copy": "...", "visual_idea": "..."}`;

  const userPrompt = `ad เดิม:
copy: ${ad.copy}
visual_idea: ${ad.visual_idea}

feedback จาก "${personaLabel}":
- verdict: ${persona.verdict}
- suggestion: ${persona.suggestion}
- คะแนน: scroll-stop ${persona.scroll_stop_score} / focused ${persona.focused_score} / memory ${persona.memory_score}
- confidence: ${persona.confidence}

โปรด rewrite ad ตาม suggestion นี้.`;

  try {
    const parsed = await generateAndExtract({
      label: 'rewriteAd',
      systemPrompt,
      userPrompt,
      schema: AdIdeaSchema,
      kind: 'object',
      caller: callerFor('rewriter'),
      signal,
    });
    // force original style (LLM sometimes paraphrases it)
    return { ...parsed, style: ad.style };
  } catch (e) {
    logExtractionFailure('rewriteAd', e);
    return null;
  }
};

// ════════════════════════════════════════════════════════════════════
// translateAd — translate the Thai ad copy + visual_idea into English for
// expat / tourist customers or international portfolio. Style label stays
// in Thai (it's a brand voice marker, not a translatable string).
// ════════════════════════════════════════════════════════════════════

export type TargetLanguage = 'en';

export const LANGUAGE_LABEL: Record<TargetLanguage, string> = {
  en: 'English',
};

export interface TranslatedAd {
  readonly language: TargetLanguage;
  readonly copy: string;
  readonly visual_idea: string;
}

const TranslatedAdSchema = v.object({
  copy: v.pipe(v.string(), v.minLength(1)),
  visual_idea: v.pipe(v.string(), v.minLength(1)),
});

export const translateAd = async (
  ad: AdIdea,
  language: TargetLanguage,
  signal?: AbortSignal,
): Promise<TranslatedAd | null> => {
  const langName = 'natural conversational English';
  const audienceHint =
    'Target: expat or tourist customers near Lopburi. Keep idiomatic & warm — not corporate.';

  const systemPrompt = `You translate Thai Facebook/TikTok ads into ${langName} for "ม่านธารา", a curtain shop in Lopburi, Thailand.

Rules:
- Translate "copy" and "visual_idea" only. Keep the meaning, tone, and call-to-action.
- DO NOT translate the brand name "ม่านธารา" / "Marnthara" — leave it as the romanization "Marnthara".
- Preserve emojis if present (🪟 🕯️ 🌙 etc.).
- Keep line breaks where they matter for readability.
- ${audienceHint}

Output strictly this JSON, no extra text:
{"copy": "...", "visual_idea": "..."}`;

  const userPrompt = `Translate this ad into ${langName}:

copy:
${ad.copy}

visual_idea:
${ad.visual_idea}`;

  try {
    const parsed = await generateAndExtract({
      label: `translateAd[${language}]`,
      systemPrompt,
      userPrompt,
      schema: TranslatedAdSchema,
      kind: 'object',
      caller: callerFor('translator'),
      signal,
    });
    return { language, copy: parsed.copy, visual_idea: parsed.visual_idea };
  } catch (e) {
    logExtractionFailure(`translateAd[${language}]`, e);
    return null;
  }
};

// ════════════════════════════════════════════════════════════════════
// generateImagePrompt — unchanged
// ════════════════════════════════════════════════════════════════════

export const generateImagePrompt = async (
  visualIdea: string,
  signal?: AbortSignal,
): Promise<VisualPrompt | null> => {
  const systemPrompt = `คุณคือ Art Director ระดับโปรของร้าน "ม่านธารา"
จงแปลงไอเดียภาพภาษาไทย ให้กลายเป็นเครื่องมือสำหรับดีไซเนอร์ โดยต้องคุมโทนภาพสไตล์มินิมอล, ดูแพง (Smart), เน้นสีส้ม Hermès Orange (#F37021) ตัดกับสีเทาและดำเสมอ

บังคับตอบเป็น JSON รูปแบบนี้เท่านั้น:
{
  "ai_prompt": "English prompt สำหรับ AI วาดภาพ (Midjourney/Stable Diffusion) ระบุแสงเงา มุมกล้อง และโทนสีให้ชัดเจน",
  "canva_keywords": "keyword1, keyword2, keyword3 (คำค้นหาภาษาอังกฤษสำหรับหาภาพสต็อกหรือ Element ใน Canva)"
}`;

  const userPrompt = `ไอเดียภาพตั้งต้น: ${visualIdea}`;

  try {
    return await generateAndExtract({
      label: 'generateImagePrompt',
      systemPrompt,
      userPrompt,
      schema: VisualPromptSchema,
      kind: 'object',
      caller: callerFor('visual'),
      signal,
    });
  } catch (e) {
    logExtractionFailure('generateImagePrompt', e);
    return null;
  }
};
