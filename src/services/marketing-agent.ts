import * as v from 'valibot';
import { aiClient, aiJudge } from '../lib/ai-config';
import { extractJson, JsonExtractionError } from '../lib/json-extract';
import {
  AdIdeaArraySchema,
  AdEvaluationSchema,
  VisualPromptSchema,
  type AdEvaluation,
  type ParsedAdIdea,
  type VisualPrompt,
} from '../lib/schemas';
import type { TrendsSnapshot } from './trends';
import {
  formatBrandFactsForPrompt,
  hashBrandFacts,
  type BrandFact,
} from '../lib/brand-facts';

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
]${factsBlock}`;

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

const buildTrendsBlock = (trends: TrendsSnapshot | null): string => {
  if (!trends || trends.daily_top.length === 0) return '';
  const top = trends.daily_top.slice(0, 10).map((t, i) => `  ${i + 1}. ${t}`).join('\n');
  const related = trends.related.length
    ? `\nที่เกี่ยวข้องกับสินค้านี้: ${trends.related.join(', ')}`
    : '';
  return `\n<TRENDS_TODAY date="${trends.cached_at.slice(0, 10)}" geo="TH">
${top}${related}
</TRENDS_TODAY>
ใช้ block นี้เฉพาะกับ persona GenZ: ให้คะแนน scroll_stop เพิ่มถ้าโฆษณาอ้างอิงเทรนด์ได้แนบเนียน หักถ้าใช้ผิดบริบทหรือพยายามเกินไป.
ห้ามใช้กับ persona พ่อบ้าน/แม่บ้าน/เจ้าของธุรกิจ — พวกเขาไม่ติดเทรนด์ TikTok
ถ้าใช้เทรนด์ใดในการประเมิน ให้ระบุใน field "trends_used"
`;
};

const buildJudgePrompt = (
  trends: TrendsSnapshot | null,
  brandFacts: readonly BrandFact[],
): string => {
  const trendsBlock = buildTrendsBlock(trends);
  const factsBlock = formatBrandFactsForPrompt(brandFacts);
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
  verdict       : สรุปความรู้สึก 1 ประโยค (ไม่เกิน 100 ตัวอักษร ใช้ภาษาที่ persona ใช้จริง)
  suggestion    : คำแนะนำเฉพาะ 1 ข้อ ที่จะทำให้คะแนนสูงขึ้น (ไม่เกิน 120 ตัวอักษร)

panel_verdict : สรุปฉันทามติของทั้ง panel 1 บรรทัด (เช่น "ปังกับ GenZ แต่หลุดกับพ่อบ้าน")
trends_used   : array ของเทรนด์ที่ใช้ในการประเมิน (ใส่ [] ถ้าไม่ใช้)
average_score : ค่าเฉลี่ยของ 12 คะแนนย่อย (3 มิติ × 4 personas) ปัดทศนิยม 1 ตำแหน่ง

บังคับตอบเป็น JSON object รูปแบบนี้เท่านั้น ห้ามมีข้อความอื่นผสม:
{
  "panel_verdict": "...",
  "trends_used": ["..."],
  "personas": [
    {"id": "family_man",  "scroll_stop_score": 0, "focused_score": 0, "memory_score": 0, "verdict": "...", "suggestion": "..."},
    {"id": "housewife",   "scroll_stop_score": 0, "focused_score": 0, "memory_score": 0, "verdict": "...", "suggestion": "..."},
    {"id": "businessman", "scroll_stop_score": 0, "focused_score": 0, "memory_score": 0, "verdict": "...", "suggestion": "..."},
    {"id": "genz",        "scroll_stop_score": 0, "focused_score": 0, "memory_score": 0, "verdict": "...", "suggestion": "..."}
  ],
  "average_score": 0.0
}${factsBlock}`;
};

export interface EvaluateAdOptions {
  readonly trends?: TrendsSnapshot | null;
  readonly brandFacts?: readonly BrandFact[];
}

export const evaluateAd = async (
  ad: AdIdea,
  signal?: AbortSignal,
  options: EvaluateAdOptions = {},
): Promise<AdEvaluation | null> => {
  const trends = options.trends ?? null;
  const brandFacts = options.brandFacts ?? [];
  const systemPrompt = buildJudgePrompt(trends, brandFacts);

  const userPrompt = `ประเมินโฆษณาต่อไปนี้:
ข้อความ: ${ad.copy}
ภาพ: ${ad.visual_idea}`;

  const trendsDate = trends?.cached_at.slice(0, 10) ?? 'no-trends';
  const factsHash = hashBrandFacts(brandFacts);
  const cacheKeyData = `${ad.copy}\n${ad.visual_idea}\n${trendsDate}\n${factsHash}`;

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
