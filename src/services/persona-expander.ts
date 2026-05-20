/**
 * Persona Expander (Track F-option-A) — generates N sub-personas per
 * Strategy-Brief segment by varying the demographic axes the user cares
 * about (age, income, life-stage, channel habit).
 *
 * Why this exists: a single segment like "พ่อบ้านลพบุรี 35-55" is too
 * coarse for the Judge to stress-test an ad against. Splitting it into
 * 6-8 sub-personas (different income brackets × life stages × channels)
 * gives the Judge a meaningful range while staying anchored to the
 * user-curated Strategy Brief instead of generic global-LLM stereotypes.
 */
import * as v from 'valibot';

import { callAI } from '../lib/ai-providers';
import { extractJson, JsonExtractionError } from '../lib/json-extract';
import type { StrategyBrief, AudienceSegment } from '../lib/strategy-brief';
import { segmentVariantId, type Persona } from '../lib/persona-pool';

// The schema we accept FROM the LLM — no id/is_core/enabled/created_at
// (those are injected after parsing). Matches the prompt instructions.
const VariantSchema = v.object({
  label: v.pipe(v.string(), v.minLength(1), v.maxLength(60)),
  description: v.pipe(v.string(), v.minLength(1), v.maxLength(280)),
  attrs: v.optional(
    v.object({
      age_range: v.optional(v.pipe(v.string(), v.maxLength(60))),
      income_range: v.optional(v.pipe(v.string(), v.maxLength(60))),
      life_stage: v.optional(v.pipe(v.string(), v.maxLength(60))),
      channel_habit: v.optional(v.pipe(v.string(), v.maxLength(60))),
      key_objection: v.optional(v.pipe(v.string(), v.maxLength(280))),
    }),
  ),
});

const VariantsResponseSchema = v.object({
  variants: v.pipe(v.array(VariantSchema), v.minLength(1), v.maxLength(12)),
});

export interface ExpandPersonasArgs {
  /** Strategy Brief whose segments will be expanded. */
  readonly brief: StrategyBrief;
  /**
   * How many sub-personas per segment. Default 3 → 5 segments = 15 personas.
   * Judge picks 6-10 per ad so 15 is the practical floor that gives the LLM
   * room to choose without burning tokens on variants it ignores. Bump to
   * 5-7 only when the user wants extreme audience stress-testing.
   */
  readonly variantsPerSegment?: number;
  readonly signal?: AbortSignal;
}

const SYSTEM_PROMPT = `คุณคือ market-research analyst สำหรับร้านม่านในลพบุรี
หน้าที่: รับ "audience segment" จาก Strategy Brief แล้วแตกออกเป็น sub-personas ที่หลากหลายตามแกน:
  • age (5-10 ปี ช่วงย่อย)
  • income (low/mid/high ใน range เดียวกัน)
  • life_stage (ผ่อนบ้าน / มีลูกเล็ก / ลูกโตแล้ว / เกษียณ ฯลฯ)
  • channel_habit (FB feed / IG Stories / TikTok / LINE OA / mixed)
  • key_objection (มุมที่ persona นี้ "ไม่กดทักทันที" คืออะไร)

กฎสำคัญ:
1. ทุก sub-persona ต้องอยู่ใน Lopburi/Singburi/Angthong market context (ไม่ใช่ Bangkok)
2. label สั้น ≤60 ตัวอักษร · description ≤280 ตัวอักษร · ภาษาไทย
3. variation ต้อง real — ไม่ใช่แค่ rephrase ของกันและกัน คน 2 คนต้องมีอย่างน้อย 2 แกนที่ต่าง
4. คง JTBD + winning_angle ของ segment ต้นทาง — sub-persona ทุกตัวต้องอยู่ในสายงานเดียวกัน
5. ห้ามใส่ field id, is_core, enabled, created_at — จะถูก inject ภายหลัง

ตอบเป็น JSON object เดียวรูปแบบ:
{
  "variants": [
    {
      "label": "...",
      "description": "...",
      "attrs": {
        "age_range": "...",
        "income_range": "...",
        "life_stage": "...",
        "channel_habit": "...",
        "key_objection": "..."
      }
    }
  ]
}

ห้ามมีข้อความอื่นนอก JSON`;

const buildUserPrompt = (segment: AudienceSegment, n: number): string => `\
แตก segment นี้เป็น ${n} sub-personas:

ชื่อ segment: ${segment.name}
JTBD (functional): ${segment.jtbd_functional}
JTBD (emotional): ${segment.jtbd_emotional}
JTBD (social): ${segment.jtbd_social}
Top objection: ${segment.top_objection}
Winning angle: ${segment.winning_angle}
Funnel stage: ${segment.funnel_stage}
Linked persona (core): ${segment.linked_persona ?? '—'}

ส่ง JSON เดียวรูปแบบ { "variants": [...] } เท่านั้น`;

/**
 * Call the LLM once per segment with limited concurrency (2) so free-tier
 * LLM providers don't rate-limit us. Returns aggregated Persona[] ready
 * for `usePersonaPool().append()`.
 */
export const expandPersonasFromBrief = async (
  args: ExpandPersonasArgs,
): Promise<Persona[]> => {
  const { brief, variantsPerSegment = 3, signal } = args;
  const segments = brief.segments;
  if (segments.length === 0) return [];

  const results: Persona[] = [];
  const CONCURRENCY = 2;

  for (let i = 0; i < segments.length; i += CONCURRENCY) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const batch = segments.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async segment => {
        try {
          const raw = await callAI(
            'strategist',
            SYSTEM_PROMPT,
            buildUserPrompt(segment, variantsPerSegment),
            {
              signal,
              temperature: 0.7,
              cacheKeyData: `persona-expand:${segment.name}:${variantsPerSegment}:${brief.campaign_hash}`,
            },
          );
          const extracted = extractJson(raw, {
            schema: VariantsResponseSchema,
            kind: 'object',
          });
          const now = new Date().toISOString();
          return extracted.variants.map(
            (variant, idx): Persona => ({
              id: segmentVariantId(segment.name, idx + 1),
              label: variant.label,
              description: variant.description,
              attrs: variant.attrs,
              source_segment_name: segment.name,
              is_core: false,
              enabled: true,
              created_at: now,
            }),
          );
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') throw err;
          if (err instanceof JsonExtractionError) {
            console.warn('[persona-expander] JSON parse failed for', segment.name);
          } else {
            console.error('[persona-expander]', err);
          }
          return [];
        }
      }),
    );
    for (const arr of batchResults) results.push(...arr);
  }

  return results;
};
