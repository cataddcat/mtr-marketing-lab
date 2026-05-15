import * as v from 'valibot';
import { aiClient } from '../lib/ai-config';
import { extractJson, JsonExtractionError } from '../lib/json-extract';
import {
  AdIdeaArraySchema,
  AdEvaluationSchema,
  VisualPromptSchema,
  type AdEvaluation,
  type ParsedAdIdea,
  type VisualPrompt,
} from '../lib/schemas';

export type { AdEvaluation, VisualPrompt } from '../lib/schemas';

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

interface GenerateAndExtractArgs<TSchema extends v.GenericSchema> {
  readonly label: string;
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly schema: TSchema;
  readonly kind: 'object' | 'array';
  readonly signal?: AbortSignal;
}

const generateAndExtract = async <TSchema extends v.GenericSchema>(
  args: GenerateAndExtractArgs<TSchema>,
): Promise<v.InferOutput<TSchema>> => {
  const { label, systemPrompt, userPrompt, schema, kind, signal } = args;

  const initial = await aiClient(systemPrompt, userPrompt, { signal });
  try {
    return extractJson(initial, { schema, kind });
  } catch (firstErr) {
    if (!(firstErr instanceof JsonExtractionError)) throw firstErr;

    console.warn(
      `[${label}] schema mismatch on first attempt — retrying with repair prompt. Issues: ${firstErr.message}`,
    );

    const repairPrompt = buildRepairPrompt(userPrompt, firstErr);
    const retry = await aiClient(systemPrompt, repairPrompt, { signal });
    return extractJson(retry, { schema, kind });
  }
};

export const generateAds = async (
  productInfo: string,
  promotion: string,
  signal?: AbortSignal,
): Promise<AdIdea[]> => {
  const systemPrompt = `คุณคือผู้เชี่ยวชาญการตลาด Facebook ในไทย ทำงานให้ธุรกิจ "ม่านธารา" (หน้าร้านอยู่ท่าศาลา ลพบุรี)
จงสร้างไอเดียโฆษณา 3 สไตล์:
1. จริงใจแก้ปัญหา (เน้นกันร้อน สู้แดดลพบุรี)
2. พรีเมียม (Smart & Reliable)
3. สั้นกระชับ (ติดไว งานเนี้ยบ จบปัญหา)

บังคับตอบกลับเป็น JSON Array รูปแบบด้านล่างนี้เท่านั้น ห้ามมีคำอธิบายอื่นผสม:
[
  {"style": "ชื่อสไตล์", "copy": "ข้อความแคปชั่นโฆษณา", "visual_idea": "ไอเดียภาพหรืออินโฟกราฟิกที่ต้องใช้"}
]`;

  const userPrompt = `สินค้า/บริการที่จะโปรโมท: ${productInfo}\nโปรโมชันหรือจุดเด่น: ${promotion}`;

  try {
    const parsed = await generateAndExtract({
      label: 'generateAds',
      systemPrompt,
      userPrompt,
      schema: AdIdeaArraySchema,
      kind: 'array',
      signal,
    });
    return parsed.map(ad => ({ ...ad, clientId: crypto.randomUUID() }));
  } catch (e) {
    logExtractionFailure('generateAds', e);
    return [];
  }
};

export const evaluateAd = async (
  ad: AdIdea,
  signal?: AbortSignal,
): Promise<AdEvaluation | null> => {
  const systemPrompt = `คุณคือระบบจำลองลูกค้า 3 กลุ่มในลพบุรี (พ่อบ้าน, แม่บ้าน, เจ้าของธุรกิจ)
จงวิเคราะห์ข้อความและภาพโฆษณานี้ ว่าโดนใจแต่ละกลุ่มแค่ไหน (คะแนน 0-10)

บังคับตอบเป็น JSON รูปแบบนี้เท่านั้น:
{
  "housewife_score": 8, "housewife_comment": "เหตุผลสั้นๆ",
  "businessman_score": 9, "businessman_comment": "เหตุผลสั้นๆ",
  "family_man_score": 7, "family_man_comment": "เหตุผลสั้นๆ",
  "average_score": 8.0
}`;

  const userPrompt = `ประเมินโฆษณาต่อไปนี้:\nข้อความ: ${ad.copy}\nภาพ: ${ad.visual_idea}`;

  try {
    return await generateAndExtract({
      label: 'evaluateAd',
      systemPrompt,
      userPrompt,
      schema: AdEvaluationSchema,
      kind: 'object',
      signal,
    });
  } catch (e) {
    logExtractionFailure('evaluateAd', e);
    return null;
  }
};

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
      signal,
    });
  } catch (e) {
    logExtractionFailure('generateImagePrompt', e);
    return null;
  }
};
