import * as v from 'valibot';
import { aiClient } from '../lib/ai-config';
import { extractJson, JsonExtractionError } from '../lib/json-extract';
import {
  StrategyBriefDraftSchema,
  campaignHashOf,
  type StrategyBrief,
  type StrategyBriefDraft,
} from '../lib/strategy-brief';
import {
  formatBrandFactsForPrompt,
  type BrandFact,
} from '../lib/brand-facts';
import { buildTimeContextBlock } from '../lib/seasonal-context';
import { buildNicheContextBlock } from '../lib/niche-seeds';

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

const buildSystemPrompt = (brandFactsBlock: string): string => {
  const timeBlock = buildTimeContextBlock();
  const nicheBlock = buildNicheContextBlock();

  return `คุณคือ Strategy Consultant ระดับซีเนียร์ของแบรนด์ "ม่านธารา" (หน้าร้านท่าศาลา-ลพบุรี — ขายม่าน+blind+ผ้าม่าน+งานติดตั้ง)
งานของคุณ: อ่าน product + promotion + brand facts ที่ให้มา แล้ว draft Strategy Brief เพื่อเป็น ground truth สำหรับสร้างและประเมินโฆษณา

กฎสำคัญ:
1. ห้ามแต่งข้อมูลที่ไม่ปรากฏชัด — ถ้าไม่รู้ ใช้ช่วงกว้างและระบุว่าเป็นการประมาณ
2. Benchmark CTR/CPC ใช้ค่าประมาณช่วงกว้างของ FB/IG/TikTok ads ในไทย ปี 2026 (CTR FB feed 0.5-2.5%, CTR Reels 1-4%, CTR TikTok 1-5%; CPC FB ฿3-20, TikTok ฿4-15). ค่าเหล่านี้เป็น prior — ห้าม claim ว่าตัวเลขแม่นยำสำหรับ niche ม่าน
3. Segments ต้อง map กับ Marnthara: family_man (พ่อบ้านลพบุรี), housewife (แม่บ้าน), businessman (เจ้าของธุรกิจ), genz (Gen Z thai) — แต่ขยายเป็น sub-segment ที่เฉพาะเจาะจงกว่า (เช่น "พ่อบ้านลพบุรีบ้านชั้นเดียวงบ <฿20K", "GenZ คอนโดกรุงเทพ aesthetic-first")
4. Competitor + whitespace: ใช้ความรู้ทั่วไปของตลาดม่านไทย — ไม่ระบุชื่อร้านจริงถ้าไม่แน่ใจ
5. ทุก segment ต้อง winning_angle ที่ actionable (เป็นมุมที่ ad จะใช้ hook ได้ตรง)

archetype values: 'reliable_craftsman' | 'premium_aesthetic' | 'practical_value' | 'innovative_modern'
funnel_stage values: 'cold' | 'warm' | 'hot'
priority: 1, 2, หรือ 3 (1=สำคัญสุด)
objective values: 'lead_gen' | 'sales_direct' | 'awareness' | 'retention' | 'reactivation'
channel values: 'facebook_feed' | 'facebook_reels' | 'instagram_feed' | 'instagram_reels' | 'tiktok'
linked_persona values: 'family_man' | 'housewife' | 'businessman' | 'genz' | null

ตอบกลับเป็น JSON object รูปแบบนี้เท่านั้น (ห้ามมีคำอธิบายอื่นผสม):
{
  "product_summary": "1-2 ประโยคที่เก็บใจความสินค้า",
  "promo_summary": "1-2 ประโยคที่เก็บใจความโปร (ถ้าไม่มีโปร ให้ว่า 'ไม่มีโปรเฉพาะ')",
  "positioning": {
    "archetype": "...",
    "value_prop": "1-liner ที่บอกว่าทำไมเลือกเรา",
    "tone_rules": ["...", "..."],
    "brand_promises": ["...", "..."],
    "anti_positioning": ["...", "..."]
  },
  "segments": [
    {
      "name": "...",
      "linked_persona": "family_man",
      "jtbd_functional": "งานที่ลูกค้าจ้างเราทำ (functional)",
      "jtbd_emotional": "...อารมณ์ที่ลูกค้าต้องการ",
      "jtbd_social": "...ภาพลักษณ์ทางสังคม",
      "top_objection": "...",
      "winning_angle": "มุมที่ ad ใช้ hook ได้ตรงสุด",
      "funnel_stage": "warm",
      "priority": 1
    }
    // 2-3 segments
  ],
  "competitors": [
    {"name": "...", "positioning": "...", "typical_offer": "...", "weakness": "..."}
    // 2-3 entries
  ],
  "whitespace": [
    {"opportunity": "...", "evidence": "...", "recommended_angle": "..."}
    // 1-3 items
  ],
  "campaign": {
    "objective": "lead_gen",
    "offer_structure": "...",
    "urgency": "...",
    "channel_mix": ["facebook_feed", "facebook_reels", "tiktok"]
  },
  "benchmarks": [
    {
      "channel": "facebook_feed",
      "ctr_pct": {"p25": 0.8, "p50": 1.4, "p75": 2.2},
      "cpc_thb": {"p25": 4, "p50": 8, "p75": 14},
      "cpm_thb": {"p25": 40, "p50": 80, "p75": 140},
      "best_time_local": "19:00-22:00",
      "hook_length_chars": {"min": 40, "max": 90},
      "notes": "..."
    }
    // 2-4 entries ที่ match channel_mix
  ]
}${timeBlock}${nicheBlock}${brandFactsBlock}`;
};

const buildUserPrompt = (product: string, promo: string): string =>
  `product: ${product || '(ยังไม่ระบุ)'}\npromotion: ${promo || '(ไม่มี)'}`;

const buildRepairPrompt = (original: string, err: JsonExtractionError): string =>
  `${original}\n\n⚠️ คำตอบก่อนหน้าไม่ผ่าน schema. ปัญหา:\n${formatIssuesForRepair(err)}\n\nโปรดตอบใหม่เป็น JSON object เดียวที่ผ่าน schema ห้ามมีข้อความอื่น.`;

export interface FetchStrategyBriefOptions {
  readonly brandFacts?: readonly BrandFact[];
  readonly signal?: AbortSignal;
}

/**
 * Draft a Strategy Brief from product + promo + brand facts.
 *
 * Phase-1: uses the existing AI proxy chat endpoint (no web grounding).
 * Returns `null` if the AI response can't be parsed; throws if the network
 * fails or the request is aborted.
 */
export const fetchStrategyBrief = async (
  product: string,
  promo: string,
  options: FetchStrategyBriefOptions = {},
): Promise<StrategyBrief | null> => {
  const factsBlock = formatBrandFactsForPrompt(options.brandFacts ?? []);
  const systemPrompt = buildSystemPrompt(factsBlock);
  const userPrompt = buildUserPrompt(product, promo);

  let raw: string;
  try {
    raw = await aiClient(systemPrompt, userPrompt, { signal: options.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw err;
  }

  let draft: StrategyBriefDraft;
  try {
    draft = extractJson(raw, { schema: StrategyBriefDraftSchema, kind: 'object' });
  } catch (firstErr) {
    if (!(firstErr instanceof JsonExtractionError)) {
      logExtractionFailure('fetchStrategyBrief', firstErr);
      return null;
    }
    console.warn(
      `[fetchStrategyBrief] schema mismatch — retrying with repair prompt. Issues: ${firstErr.message}`,
    );
    const repairPrompt = buildRepairPrompt(userPrompt, firstErr);
    let retryRaw: string;
    try {
      retryRaw = await aiClient(systemPrompt, repairPrompt, { signal: options.signal });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      throw err;
    }
    try {
      draft = extractJson(retryRaw, { schema: StrategyBriefDraftSchema, kind: 'object' });
    } catch (retryErr) {
      logExtractionFailure('fetchStrategyBrief[retry]', retryErr);
      return null;
    }
  }

  const brief: StrategyBrief = {
    campaign_hash: campaignHashOf(product, promo),
    ...draft,
    drafted_at: new Date().toISOString(),
    source: 'ai_only',
    edited_fields: [],
  };

  // Final validation — ensure shape lines up (defensive, schemas should agree).
  const parsed = v.safeParse(
    v.object({
      campaign_hash: v.string(),
      ...StrategyBriefDraftSchema.entries,
      drafted_at: v.string(),
      source: v.string(),
      edited_fields: v.array(v.string()),
    }),
    brief,
  );
  if (!parsed.success) {
    console.warn('[fetchStrategyBrief] assembled brief failed final validation', parsed.issues);
    return null;
  }

  return brief;
};
