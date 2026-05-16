import * as v from 'valibot';
import { aiClient, aiJudge } from '../lib/ai-config';
import { extractJson, JsonExtractionError } from '../lib/json-extract';
import {
  AdIdeaArraySchema,
  AdIdeaSchema,
  AdEvaluationSchema,
  VisualPromptSchema,
  PERSONA_LABELS,
  type AdEvaluation,
  type ParsedAdIdea,
  type PersonaEval,
  type VisualPrompt,
} from '../lib/schemas';
import type { TrendsSnapshot } from './trends';
import {
  formatBrandFactsForPrompt,
  hashBrandFacts,
  type BrandFact,
} from '../lib/brand-facts';
import {
  formatQuotesForPrompt,
  hashQuotes,
  type CustomerQuote,
} from '../lib/customer-quotes';
import { buildTimeContextBlock } from '../lib/seasonal-context';
import { buildNicheContextBlock, filterNicheTrends } from '../lib/niche-seeds';
import {
  formatCalibrationForPrompt,
  hashCalibrationExamples,
  type CalibrationExample,
} from '../lib/calibration';

export type { AdEvaluation, VisualPrompt, PersonaEval, PersonaId } from '../lib/schemas';
export { personaAverage, PERSONA_LABELS } from '../lib/schemas';

export interface AdIdea extends ParsedAdIdea {
  clientId: string;
}

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

const chatCaller: Caller = (system, user, signal) =>
  aiClient(system, user, { signal });

const judgeCallerFor = (cacheKeyData: string): Caller =>
  (system, user, signal) => aiJudge(system, user, { signal, cacheKeyData });

// ════════════════════════════════════════════════════════════════════
// generateAds — 4 styles (3 classic + GenZ-coded)
// ════════════════════════════════════════════════════════════════════

export interface GenerateAdsOptions {
  readonly brandFacts?: readonly BrandFact[];
}

export const generateAds = async (
  productInfo: string,
  promotion: string,
  signal?: AbortSignal,
  options: GenerateAdsOptions = {},
): Promise<AdIdea[]> => {
  const factsBlock = formatBrandFactsForPrompt(options.brandFacts ?? []);
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
• อนุญาตสแลง 2026: ปังมาก, ฉ่ำ, ลั่น, ตัวแม่, อยู่หมัด, จี๊ดด, ฟิน — แต่ไม่ยัด ไม่เกิน 2 คำต่อโฆษณา
• Emoji ใช้เป็นเครื่องหมายวรรคตอน 1-2 ตัวเท่านั้น (preferred: 🪟 🕯️ 🌙 ☁️ 🤎) ห้ามสแปม
• ห้าม corporate-speak: "นวัตกรรม", "ครบครัน", "ตอบโจทย์ทุกไลฟ์สไตล์", "!!!"
• visual_idea ต้องระบุ: aspect ratio (9:16 หรือ 4:5), shot type (close-up/POV/over-shoulder), mood (golden hour / blue hour / overcast)

สำหรับสไตล์ที่ 1-3 ให้คุมโทนเดิม (warm/practical/business) ห้ามเอา GenZ slang มาใช้

บังคับตอบกลับเป็น JSON Array รูปแบบด้านล่างนี้เท่านั้น ห้ามมีคำอธิบายอื่นผสม:
[
  {"style": "จริงใจแก้ปัญหา", "copy": "...", "visual_idea": "..."},
  {"style": "พรีเมียม", "copy": "...", "visual_idea": "..."},
  {"style": "สั้นกระชับ", "copy": "...", "visual_idea": "..."},
  {"style": "GenZ-coded", "copy": "...", "visual_idea": "..."}
]${timeBlock}${nicheBlock}${factsBlock}`;

  const userPrompt = `สินค้า/บริการที่จะโปรโมท: ${productInfo}\nโปรโมชันหรือจุดเด่น: ${promotion}`;

  try {
    const parsed = await generateAndExtract({
      label: 'generateAds',
      systemPrompt,
      userPrompt,
      schema: AdIdeaArraySchema,
      kind: 'array',
      caller: chatCaller,
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

const buildCompetitorBlock = (competitor: string | null): string => {
  if (!competitor || competitor.trim().length === 0) return '';
  return `
═══════════════════════════════════════════════════════════════
COMPETITOR REFERENCE — โฆษณาของคู่แข่งในตลาดเดียวกัน:

"""
${competitor.trim()}
"""

เปรียบเทียบ ad ของเรากับคู่แข่งนี้แบบ panel-level (ไม่ใช่ per-persona):
  winner          : 'ours' / 'theirs' / 'tie' (ฝ่ายที่ panel ส่วนใหญ่จะ engage มากกว่า)
  margin          : 0-10 (ห่างกันแค่ไหน — 0 = เกือบเสมอ, 10 = ขาดลอย)
  ours_strengths  : 2-3 ข้อสั้นๆ ที่ ad เราเหนือกว่าคู่แข่ง
  theirs_strengths: 2-3 ข้อสั้นๆ ที่ ad คู่แข่งเหนือกว่าเรา
  recommendation  : 1 ประโยคที่ควรปรับ ad ของเราเพื่อปิดช่องว่าง (ไม่เกิน 200 ตัวอักษร)

ใส่เพิ่มใน field "competitor" ของ JSON output.`;
};

const buildJudgePrompt = (
  trends: TrendsSnapshot | null,
  brandFacts: readonly BrandFact[],
  competitor: string | null = null,
  customerQuotes: readonly CustomerQuote[] = [],
  calibration: readonly CalibrationExample[] = [],
): string => {
  const trendsBlock = buildTrendsBlock(trends);
  const factsBlock = formatBrandFactsForPrompt(brandFacts);
  const quotesBlock = formatQuotesForPrompt(customerQuotes);
  const calibrationBlock = formatCalibrationForPrompt(calibration);
  const timeBlock = buildTimeContextBlock();
  const nicheBlock = buildNicheContextBlock();
  const competitorBlock = buildCompetitorBlock(competitor);
  const competitorJsonField = competitor
    ? `,\n  "competitor": {"winner": "ours|theirs|tie", "margin": 0, "ours_strengths": ["..."], "theirs_strengths": ["..."], "recommendation": "..."}`
    : '';
  return `คุณคือ Consumer Panel Simulator สำหรับ "ม่านธารา" (ท่าศาลา, ลพบุรี)
จงสวมบทบาทผู้บริโภค 4 คนนี้พร้อมกัน แต่ละคนเห็นโฆษณานี้ใน feed Facebook/IG/TikTok ขณะอยู่ในบริบทเฉพาะของตัวเอง
ห้ามให้คะแนน "เฉลี่ยๆ" — ถ้าโฆษณาไม่ตรงกลุ่ม ให้คะแนนต่ำตรงไปตรงมา

═══════════════════════════════════════════════════════════════
PERSONA 1 — family_man (พ่อบ้าน)
อายุ 38-55 · มีรถกระบะ · ทำงานช่าง/ราชการ/เกษตร · ห่วงค่าไฟ-รับประกัน-ความทนทาน
บริบทตอนเห็นโฆษณา: นั่งดู FB หลังกินข้าวเย็น ลูกดูทีวีอยู่ข้างๆ
ชอบ: ตัวเลข, ปีรับประกัน, "ติดง่ายเอง?", หน้าร้านจริง, ภาพช่างทำงาน
เกลียด: คำอู้อี้, "พรีเมียม" ไม่บอกราคา, รูปสตูดิโอจัดฉาก

PERSONA 2 — housewife (แม่บ้าน)
อายุ 35-58 · ดูแลบ้าน/ครัว · ห่วงแสงร้อน-ฝุ่น-ลูก-สุนัข-การทำความสะอาด
บริบทตอนเห็นโฆษณา: นั่งเล่น FB ระหว่างซักผ้า ลพบุรีเที่ยง 36°C
ชอบ: before/after, "ลด 4-6°C", การประเมินฟรี, ภาพบ้านจริง
เกลียด: ฮาร์ดเซลล์, รูปอวด, ภาษาขายของ

PERSONA 3 — businessman (เจ้าของธุรกิจ)
อายุ 30-50 · ร้านอาหาร/โรงแรม/ออฟฟิศ ลพบุรี-สิงห์บุรี
บริบทตอนเห็นโฆษณา: รอลูกค้าระหว่าง slow hour ที่ร้าน เปิดมือถือดูข่าว
ชอบ: ROI ชัด, รับงานหลายห้อง, ใบกำกับภาษี, ทีมงานติดตั้งเอง
เกลียด: โฆษณาที่พูดแต่บ้านพักอาศัย ไม่มีข้อมูล B2B

PERSONA 4 — genz (Gen Z ไทย) ← ใช้เกณฑ์คนละชุดเลย ห้ามคิดแบบ persona 1-3
อายุ 18-28 · อยู่คอนโด/หอ/บ้านพ่อแม่ · ติด TikTok+Reels 4+ ชม./วัน · งบจำกัดแต่จ่ายเพื่อ "vibe ของห้อง"
บริบทตอนเห็นโฆษณา: doom-scroll TikTok ก่อนนอน 23:30 น. feed เป็น aesthetic content
ชอบ: POV, BTS, golden/blue hour, soft light, มินิมอล, ภาษาแชท, สแลง 2026
เกลียด: "ค่ะ/ครับ" หนัก, "พิเศษเฉพาะคุณ", "!!!", emoji สแปม, รูปกราฟิกจัดเต็ม
${trendsBlock}
═══════════════════════════════════════════════════════════════
สำหรับแต่ละ persona ให้คะแนน 3 มิติ (สำคัญที่สุด — ห้ามใส่คะแนนเดียวรวม):
  scroll_stop_score (0-10) : 0.5 วินาทีแรก หยุดเลื่อนได้ไหม (gut reaction)
  focused_score    (0-10)  : หลังจ้อง 5 วินาที ตัดสินใจได้ไหม (rational)
  memory_score     (0-10)  : ผ่านไป 1 ชั่วโมง ยังจำได้ไหม (retention)

แต่ละ persona ต้องตอบ:
  confidence    : ความมั่นใจในการประเมิน — "high" / "med" / "low"
                  high = โฆษณาสื่อสารชัดเจน คุณตัดสินได้แน่นอน
                  med  = ดูได้บางส่วน แต่บางอย่างยังไม่ชัด
                  low  = โฆษณาคลุมเครือ ตีความได้หลายแบบ ตัดสินไม่แน่นอน
                  (ใช้ low อย่างจริงใจถ้าคุณไม่แน่ใจจริงๆ — ดีกว่าให้คะแนนมั่วๆ)
  verdict       : สรุปความรู้สึก 1 ประโยค (ไม่เกิน 100 ตัวอักษร ใช้ภาษาที่ persona ใช้จริง)
  suggestion    : คำแนะนำเฉพาะ 1 ข้อ ที่จะทำให้คะแนนสูงขึ้น (ไม่เกิน 120 ตัวอักษร)

panel_verdict : สรุปฉันทามติของทั้ง panel 1 บรรทัด (เช่น "ปังกับ GenZ แต่หลุดกับพ่อบ้าน")
trends_used   : array ของเทรนด์ที่ใช้ในการประเมิน (ใส่ [] ถ้าไม่ใช้)
average_score : ค่าเฉลี่ยของ 12 คะแนนย่อย (3 มิติ × 4 personas) ปัดทศนิยม 1 ตำแหน่ง

═══════════════════════════════════════════════════════════════
STRUCTURAL ANALYSIS — แยกประเมิน ad copy เป็น 3 ส่วน (ที่ระดับ ad ไม่ใช่ persona):
  hook_score    : 1-2 บรรทัดแรกที่ตา hit ก่อน — หยุดสายตาได้ไหม specific เพียงพอไหม
  body_score    : เนื้อหากลาง — มี proof point, ตัวเลข, story arc, persuasion technique
  cta_score     : ปิดท้ายเรียก action — ชัด, urgent, low-friction
  hook_critique / body_critique / cta_critique : วิจารณ์ส่วนนั้น 1 ประโยคสั้น

═══════════════════════════════════════════════════════════════
CHANNEL FIT — ประเมินว่า ad นี้เหมาะกับ channel ไหน (0-10 แต่ละช่อง):
  facebook_feed    : คอนเทนต์ผสมรูป+ข้อความยาว เห็นเต็ม mobile/desktop ลูกค้าโต-วัยทำงาน
  facebook_reels   : vertical video 9:16 สั้น เน้น hook 0.5s, voice-on
  instagram_feed   : aesthetic-first, square/portrait, ลูกค้า aspirational
  instagram_reels  : vertical video, สาย aesthetic + creator
  tiktok           : vertical video, sound-on, vibe-first, edit เร็ว

ถ้า ad เน้นข้อความ + รูป → facebook_feed/instagram_feed score สูง
ถ้า ad เป็น POV/BTS/sound-driven → tiktok/reels score สูง
ถ้า ad ยาว 4-5 บรรทัด → facebook_feed > reels (เพราะ reels ไม่อ่านข้อความ)
ranked = list เรียงจากคะแนนสูงสุดลงต่ำ (ใส่ทั้ง 5 ช่อง)
best = id ของช่อง top 1
reasoning = สั้น ๆ ว่าทำไมเลือก best (~80 ตัวอักษร)

═══════════════════════════════════════════════════════════════
บังคับตอบเป็น JSON object รูปแบบนี้เท่านั้น ห้ามมีข้อความอื่นผสม:
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
      {"channel": "facebook_reels",  "score": 0},
      {"channel": "instagram_feed",  "score": 0},
      {"channel": "facebook_feed",   "score": 0}
    ],
    "best": "tiktok",
    "reasoning": "..."
  },
  "personas": [
    {"id": "family_man",  "scroll_stop_score": 0, "focused_score": 0, "memory_score": 0, "confidence": "high", "verdict": "...", "suggestion": "..."},
    {"id": "housewife",   "scroll_stop_score": 0, "focused_score": 0, "memory_score": 0, "confidence": "high", "verdict": "...", "suggestion": "..."},
    {"id": "businessman", "scroll_stop_score": 0, "focused_score": 0, "memory_score": 0, "confidence": "high", "verdict": "...", "suggestion": "..."},
    {"id": "genz",        "scroll_stop_score": 0, "focused_score": 0, "memory_score": 0, "confidence": "high", "verdict": "...", "suggestion": "..."}
  ],
  "average_score": 0.0${competitorJsonField}
}${timeBlock}${nicheBlock}${factsBlock}${quotesBlock}${calibrationBlock}${competitorBlock}`;
};

export interface EvaluateAdOptions {
  readonly trends?: TrendsSnapshot | null;
  readonly brandFacts?: readonly BrandFact[];
  /**
   * Stable salt to differentiate cache entries between ensemble runs.
   * Use 'r2', 'r3' etc. for repeated evaluations; omit for the baseline.
   */
  readonly cacheSalt?: string;
  /** Optional competitor ad text — adds comparison block to the output. */
  readonly competitorAd?: string;
  /** Real customer quotes to ground the Judge with actual voice references. */
  readonly customerQuotes?: readonly CustomerQuote[];
  /**
   * Past saved ads + their real outcomes — Judge sees these as few-shot
   * priors so it can adjust scoring toward what actually works in the shop.
   */
  readonly calibration?: readonly CalibrationExample[];
}

const hashString = (s: string): string => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h.toString(36);
};

export const evaluateAd = async (
  ad: AdIdea,
  signal?: AbortSignal,
  options: EvaluateAdOptions = {},
): Promise<AdEvaluation | null> => {
  const trends = options.trends ?? null;
  const brandFacts = options.brandFacts ?? [];
  const customerQuotes = options.customerQuotes ?? [];
  const calibration = options.calibration ?? [];
  const competitor = options.competitorAd?.trim() ? options.competitorAd.trim() : null;
  const systemPrompt = buildJudgePrompt(trends, brandFacts, competitor, customerQuotes, calibration);

  const userPrompt = `ประเมินโฆษณาต่อไปนี้:
ข้อความ: ${ad.copy}
ภาพ: ${ad.visual_idea}`;

  const trendsDate = trends?.cached_at.slice(0, 10) ?? 'no-trends';
  const factsHash = hashBrandFacts(brandFacts);
  const quotesHash = hashQuotes(customerQuotes);
  const calibHash = hashCalibrationExamples(calibration);
  const salt = options.cacheSalt ?? '';
  const compHash = competitor ? hashString(competitor) : '';
  const cacheKeyData = `${ad.copy}\n${ad.visual_idea}\n${trendsDate}\n${factsHash}\n${quotesHash}\n${calibHash}\n${salt}\n${compHash}`;

  try {
    return await generateAndExtract({
      label: 'evaluateAd',
      systemPrompt,
      userPrompt,
      schema: AdEvaluationSchema,
      kind: 'object',
      caller: judgeCallerFor(cacheKeyData),
      signal,
    });
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

const round1 = (v: number): number => Math.round(v * 10) / 10;

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

  const average_score = round1(mean(runs.map(r => r.average_score)));
  const max_std = stds.length === 0 ? 0 : Math.max(...stds);

  // competitor — only present if all runs supplied one (defensive)
  let competitor: AdEvaluation['competitor'] = undefined;
  const compRuns = runs
    .map(r => r.competitor)
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (compRuns.length > 0) {
    competitor = {
      winner: mode(compRuns.map(c => c.winner)),
      margin: trackField('competitor.margin', compRuns.map(c => c.margin)),
      ours_strengths: compRuns[0].ours_strengths,
      theirs_strengths: compRuns[0].theirs_strengths,
      recommendation: compRuns[0].recommendation,
    };
  }

  return {
    panel_verdict: baseline.panel_verdict,
    trends_used: baseline.trends_used,
    structure,
    channel_fit,
    personas,
    average_score,
    ensemble: {
      runs: runs.length,
      variance: {
        max_std: round1(max_std),
        unstable_fields: unstable,
      },
    },
    ...(competitor ? { competitor } : {}),
  };
}

export interface EnsembleOptions {
  readonly trends?: TrendsSnapshot | null;
  readonly brandFacts?: readonly BrandFact[];
  readonly competitorAd?: string;
  readonly customerQuotes?: readonly CustomerQuote[];
  readonly calibration?: readonly CalibrationExample[];
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
        competitorAd: options.competitorAd,
        customerQuotes: options.customerQuotes,
        calibration: options.calibration,
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
}

export const rewriteAd = async (
  ad: AdIdea,
  persona: PersonaEval,
  signal?: AbortSignal,
  options: RewriteAdOptions = {},
): Promise<ParsedAdIdea | null> => {
  const factsBlock = formatBrandFactsForPrompt(options.brandFacts ?? []);
  const timeBlock = buildTimeContextBlock();
  const personaLabel = PERSONA_LABELS[persona.id];

  const systemPrompt = `คุณคือ Senior copywriter ของม่านธารา
จง rewrite โฆษณาตาม feedback ที่ได้จาก consumer persona "${personaLabel}"
- รักษา style เดิม: "${ad.style}" (ห้ามเปลี่ยน)
- ปรับ copy + visual_idea ตาม suggestion โดยตรง
- ห้ามเพิ่มข้อมูลที่ไม่มีใน BRAND_FACTS / context
- ความยาวใกล้เคียง ad เดิม
${timeBlock}${factsBlock}
บังคับตอบเป็น JSON object รูปแบบนี้เท่านั้น ห้ามมีข้อความอื่นผสม:
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
      caller: chatCaller,
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
// translateAd — translate the Thai ad copy + visual_idea into another language
// (English / Chinese) for foreign customers or international portfolio. Style
// label stays in Thai (it's a brand voice marker, not a translatable string).
// ════════════════════════════════════════════════════════════════════

export type TargetLanguage = 'en' | 'zh';

export const LANGUAGE_LABEL: Record<TargetLanguage, string> = {
  en: 'English',
  zh: '中文 (Mandarin)',
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
  const langName = language === 'en' ? 'natural conversational English' : 'simplified Mandarin Chinese (简体中文)';
  const audienceHint =
    language === 'en'
      ? 'Target: expat or tourist customers near Lopburi. Keep idiomatic & warm — not corporate.'
      : 'Target audience: 中国游客或来泰国的中国人. 口语化, 不要正式套话.';

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
      caller: chatCaller,
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
      caller: chatCaller,
      signal,
    });
  } catch (e) {
    logExtractionFailure('generateImagePrompt', e);
    return null;
  }
};
