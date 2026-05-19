import * as v from 'valibot';
import {
  ChannelIdSchema,
  PersonaIdSchema,
  PERSONA_LABELS,
  type ChannelId,
  type PersonaId,
} from './schemas';

// ════════════════════════════════════════════════════════════════════
// Atomic schemas
// ════════════════════════════════════════════════════════════════════

const shortText = v.pipe(v.string(), v.maxLength(200));
const mediumText = v.pipe(v.string(), v.maxLength(400));
const longText = v.pipe(v.string(), v.maxLength(800));

export const ArchetypeSchema = v.picklist([
  'reliable_craftsman',
  'premium_aesthetic',
  'practical_value',
  'innovative_modern',
] as const);
export type Archetype = v.InferOutput<typeof ArchetypeSchema>;

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  reliable_craftsman: 'ช่างฝีมือไว้ใจได้',
  premium_aesthetic: 'พรีเมียม-สวยงาม',
  practical_value: 'ใช้งานคุ้มราคา',
  innovative_modern: 'ใหม่-ทันสมัย',
};

export const FunnelStageSchema = v.picklist(['cold', 'warm', 'hot'] as const);
export type FunnelStage = v.InferOutput<typeof FunnelStageSchema>;

export const FUNNEL_LABELS: Record<FunnelStage, string> = {
  cold: 'ยังไม่รู้จัก (cold)',
  warm: 'รู้จักแล้ว ยังไม่ตัดสินใจ (warm)',
  hot: 'พร้อมซื้อ (hot)',
};

export const CampaignObjectiveSchema = v.picklist([
  'lead_gen',
  'sales_direct',
  'awareness',
  'retention',
  'reactivation',
] as const);
export type CampaignObjective = v.InferOutput<typeof CampaignObjectiveSchema>;

export const OBJECTIVE_LABELS: Record<CampaignObjective, string> = {
  lead_gen: 'หา leads (inbox/comment)',
  sales_direct: 'ปิดการขายตรง',
  awareness: 'สร้างการรับรู้',
  retention: 'รักษาลูกค้าเดิม',
  reactivation: 'ดึงลูกค้าเก่ากลับ',
};

// ════════════════════════════════════════════════════════════════════
// Positioning
// ════════════════════════════════════════════════════════════════════

export const PositioningBriefSchema = v.object({
  archetype: ArchetypeSchema,
  value_prop: shortText,
  tone_rules: v.pipe(v.array(shortText), v.maxLength(8)),
  brand_promises: v.pipe(v.array(shortText), v.maxLength(8)),
  anti_positioning: v.pipe(v.array(shortText), v.maxLength(6)),
});
export type PositioningBrief = v.InferOutput<typeof PositioningBriefSchema>;

// ════════════════════════════════════════════════════════════════════
// Audience / JTBD
// ════════════════════════════════════════════════════════════════════

export const AudienceSegmentSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(80)),
  linked_persona: v.nullable(PersonaIdSchema),
  jtbd_functional: mediumText,
  jtbd_emotional: mediumText,
  jtbd_social: mediumText,
  top_objection: mediumText,
  winning_angle: mediumText,
  funnel_stage: FunnelStageSchema,
  priority: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(3)),
});
export type AudienceSegment = v.InferOutput<typeof AudienceSegmentSchema>;

// ════════════════════════════════════════════════════════════════════
// Competitor landscape
// ════════════════════════════════════════════════════════════════════

export const CompetitorEntrySchema = v.object({
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(80)),
  positioning: mediumText,
  typical_offer: mediumText,
  weakness: mediumText,
});
export type CompetitorEntry = v.InferOutput<typeof CompetitorEntrySchema>;

export const WhiteSpaceItemSchema = v.object({
  opportunity: mediumText,
  evidence: mediumText,
  recommended_angle: mediumText,
});
export type WhiteSpaceItem = v.InferOutput<typeof WhiteSpaceItemSchema>;

// ════════════════════════════════════════════════════════════════════
// Campaign & Channel
// ════════════════════════════════════════════════════════════════════

export const CampaignBriefSchema = v.object({
  objective: CampaignObjectiveSchema,
  offer_structure: mediumText,
  urgency: shortText,
  channel_mix: v.pipe(v.array(ChannelIdSchema), v.minLength(1), v.maxLength(5)),
});
export type CampaignBrief = v.InferOutput<typeof CampaignBriefSchema>;

const PercentileTripletSchema = v.object({
  p25: v.number(),
  p50: v.number(),
  p75: v.number(),
});
export type PercentileTriplet = v.InferOutput<typeof PercentileTripletSchema>;

const RangeSchema = v.object({
  min: v.pipe(v.number(), v.integer()),
  max: v.pipe(v.number(), v.integer()),
});
export type Range = v.InferOutput<typeof RangeSchema>;

export const ChannelBenchmarkSchema = v.object({
  channel: ChannelIdSchema,
  ctr_pct: PercentileTripletSchema,
  cpc_thb: PercentileTripletSchema,
  cpm_thb: PercentileTripletSchema,
  best_time_local: shortText,
  hook_length_chars: RangeSchema,
  notes: mediumText,
});
export type ChannelBenchmark = v.InferOutput<typeof ChannelBenchmarkSchema>;

// ════════════════════════════════════════════════════════════════════
// Umbrella schema
// ════════════════════════════════════════════════════════════════════

export const BriefSourceSchema = v.picklist([
  'live_web',
  'ai_only',
  'cache',
  'hybrid',
] as const);
export type BriefSource = v.InferOutput<typeof BriefSourceSchema>;

export const StrategyBriefSchema = v.object({
  campaign_hash: v.pipe(v.string(), v.minLength(1)),
  product_summary: longText,
  promo_summary: longText,
  positioning: PositioningBriefSchema,
  segments: v.pipe(v.array(AudienceSegmentSchema), v.minLength(1), v.maxLength(5)),
  competitors: v.pipe(v.array(CompetitorEntrySchema), v.maxLength(6)),
  whitespace: v.pipe(v.array(WhiteSpaceItemSchema), v.maxLength(4)),
  campaign: CampaignBriefSchema,
  benchmarks: v.pipe(v.array(ChannelBenchmarkSchema), v.maxLength(5)),
  drafted_at: v.pipe(v.string(), v.minLength(1)),
  source: BriefSourceSchema,
  edited_fields: v.array(v.string()),
});
export type StrategyBrief = v.InferOutput<typeof StrategyBriefSchema>;

/** Local subset of LLM output — we generate `campaign_hash`, `drafted_at`, `source`, `edited_fields` client-side. */
export const StrategyBriefDraftSchema = v.object({
  product_summary: longText,
  promo_summary: longText,
  positioning: PositioningBriefSchema,
  segments: v.pipe(v.array(AudienceSegmentSchema), v.minLength(1), v.maxLength(5)),
  competitors: v.pipe(v.array(CompetitorEntrySchema), v.maxLength(6)),
  whitespace: v.pipe(v.array(WhiteSpaceItemSchema), v.maxLength(4)),
  campaign: CampaignBriefSchema,
  benchmarks: v.pipe(v.array(ChannelBenchmarkSchema), v.maxLength(5)),
});
export type StrategyBriefDraft = v.InferOutput<typeof StrategyBriefDraftSchema>;

export const StrategyBriefsSchema = v.array(StrategyBriefSchema);

// ════════════════════════════════════════════════════════════════════
// Hashing — same djb2-ish pattern as marketing-agent.ts:hashString
// ════════════════════════════════════════════════════════════════════

export const campaignHashOf = (product: string, promo: string): string => {
  const s = `${product.trim().toLowerCase()}||${promo.trim().toLowerCase()}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h.toString(36);
};

export const hashStrategyBrief = (brief: StrategyBrief | null): string => {
  if (!brief) return 'no-brief';
  return `${brief.campaign_hash}|${brief.positioning.archetype}|${brief.campaign.objective}|${brief.segments
    .map(s => s.name)
    .join(',')}`;
};

// ════════════════════════════════════════════════════════════════════
// Channel labels (re-export for convenience)
// ════════════════════════════════════════════════════════════════════

const CHANNEL_TH_LABEL: Record<ChannelId, string> = {
  facebook_feed: 'Facebook Feed',
  facebook_reels: 'Facebook Reels',
  instagram_feed: 'Instagram Feed',
  instagram_reels: 'Instagram Reels',
  tiktok: 'TikTok',
};

const personaLabel = (id: PersonaId | null): string => {
  if (!id) return '—';
  return PERSONA_LABELS[id];
};

// ════════════════════════════════════════════════════════════════════
// Prompt formatters
// ════════════════════════════════════════════════════════════════════

const formatList = (items: readonly string[], bullet = '•'): string =>
  items.map(s => `  ${bullet} ${s}`).join('\n');

/**
 * Slim block for generation — keeps the prompt budget tight. Includes
 * positioning + top 2 priority segments + campaign objective.
 */
export const formatStrategyForGeneration = (brief: StrategyBrief | null): string => {
  if (!brief) return '';
  const p = brief.positioning;
  const topSegments = [...brief.segments]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 2);

  const segmentLines = topSegments
    .map(
      s =>
        `  • [#${s.priority}] ${s.name}${
          s.linked_persona ? ` (~ ${personaLabel(s.linked_persona)})` : ''
        }
    - JTBD: ${s.jtbd_functional}
    - winning angle: ${s.winning_angle}
    - top objection: ${s.top_objection}
    - funnel: ${FUNNEL_LABELS[s.funnel_stage]}`,
    )
    .join('\n');

  const channelLine = brief.campaign.channel_mix
    .slice(0, 3)
    .map(c => CHANNEL_TH_LABEL[c])
    .join(' → ');

  return `\n<STRATEGY_BRIEF source="${brief.source}">
POSITIONING:
  archetype: ${ARCHETYPE_LABELS[p.archetype]}
  value_prop: ${p.value_prop}
${p.tone_rules.length ? `  tone rules:\n${formatList(p.tone_rules, '·')}\n` : ''}${
    p.brand_promises.length ? `  promises:\n${formatList(p.brand_promises, '·')}\n` : ''
  }${p.anti_positioning.length ? `  anti-positioning (อย่าทำ):\n${formatList(p.anti_positioning, '·')}\n` : ''}
TOP SEGMENTS:
${segmentLines}

CAMPAIGN:
  objective: ${OBJECTIVE_LABELS[brief.campaign.objective]}
  offer: ${brief.campaign.offer_structure}
  urgency: ${brief.campaign.urgency || '(ไม่มี)'}
  channels (priority): ${channelLine || '(ไม่ระบุ)'}
</STRATEGY_BRIEF>

ใช้ block นี้เป็น ground truth ขณะสร้างทุกชิ้น:
- ทุก ad ต้องเคารพ tone rules + brand promises + anti-positioning ของ POSITIONING
- ad style ที่ผลิตควรพูดกับ TOP SEGMENTS ตามลำดับ priority (ad ใหญ่สุดควรชน segment #1)
- offer + urgency จาก CAMPAIGN ต้องสะท้อนใน body หรือ CTA อย่างน้อย 1 ใน 4 styles
`;
};

/**
 * Full block for evaluation — adds competitors + whitespace + benchmarks.
 * Use sparingly because it costs tokens.
 */
export const formatStrategyForEvaluation = (brief: StrategyBrief | null): string => {
  if (!brief) return '';
  const slim = formatStrategyForGeneration(brief);

  const competitorBlock = brief.competitors.length
    ? `\n<STRATEGY_COMPETITORS>
${brief.competitors
  .map(
    c =>
      `  • ${c.name}
    - positioning: ${c.positioning}
    - typical offer: ${c.typical_offer}
    - weakness: ${c.weakness}`,
  )
  .join('\n')}
</STRATEGY_COMPETITORS>\n`
    : '';

  const whitespaceBlock = brief.whitespace.length
    ? `\n<STRATEGY_WHITESPACE>
${brief.whitespace
  .map(
    (w, i) =>
      `  ${i + 1}. ${w.opportunity}
     evidence: ${w.evidence}
     recommended angle: ${w.recommended_angle}`,
  )
  .join('\n')}
หากโฆษณาเล่นมุมเหล่านี้ → +1 บน scroll_stop หรือ memory ของ panel ที่ตรง segment
หากซ้ำ positioning ของคู่แข่ง → −1 (เพราะแข่งบนสนามที่เขาเก่งกว่า)
</STRATEGY_WHITESPACE>\n`
    : '';

  const benchmarkBlock = brief.benchmarks.length
    ? `\n<CHANNEL_BENCHMARKS>
(ประมาณการจาก AI; ถ้าไม่มีข้อมูลแม่นยำ ใช้ช่วงกว้าง)
${brief.benchmarks
  .map(
    b =>
      `  • ${CHANNEL_TH_LABEL[b.channel]}: CTR p50 ≈ ${b.ctr_pct.p50.toFixed(2)}% (p25-p75: ${b.ctr_pct.p25.toFixed(2)}-${b.ctr_pct.p75.toFixed(2)}), CPC p50 ≈ ฿${b.cpc_thb.p50.toFixed(0)}, hook ${b.hook_length_chars.min}-${b.hook_length_chars.max} ตัวอักษร, best time ${b.best_time_local}${b.notes ? `\n      note: ${b.notes}` : ''}`,
  )
  .join('\n')}
</CHANNEL_BENCHMARKS>\n`
    : '';

  return `${slim}${competitorBlock}${whitespaceBlock}${benchmarkBlock}`;
};

/**
 * Persona-aware slim block for the rewrite path — positioning + the single
 * segment that's linked to the persona being addressed (falls back to the
 * top priority segment if no match).
 */
export const formatStrategyForRewrite = (
  brief: StrategyBrief | null,
  personaId: PersonaId,
): string => {
  if (!brief) return '';
  const p = brief.positioning;
  const match =
    brief.segments.find(s => s.linked_persona === personaId) ??
    [...brief.segments].sort((a, b) => a.priority - b.priority)[0];
  if (!match) return '';

  return `\n<STRATEGY_BRIEF_FOR_REWRITE>
positioning archetype: ${ARCHETYPE_LABELS[p.archetype]}
value_prop: ${p.value_prop}
${p.tone_rules.length ? `tone rules: ${p.tone_rules.join(' · ')}\n` : ''}${
    p.anti_positioning.length ? `อย่าทำ: ${p.anti_positioning.join(' · ')}\n` : ''
  }segment focus: ${match.name}
  - JTBD: ${match.jtbd_functional}
  - winning angle: ${match.winning_angle}
  - objection to address: ${match.top_objection}
</STRATEGY_BRIEF_FOR_REWRITE>
ใช้ block นี้: rewrite ต้องเคารพ tone + anti-positioning, และพยายามแก้ objection ของ segment นี้.
`;
};

/** Sanity check helper — does this brief look usable enough to inject? */
export const isBriefUsable = (brief: StrategyBrief | null): brief is StrategyBrief => {
  if (!brief) return false;
  if (!brief.positioning.value_prop.trim()) return false;
  if (brief.segments.length === 0) return false;
  return true;
};

/** Short one-liner for the banner — "Reliable Craftsman · lead_gen · 3 segments" */
export const summarizeBrief = (brief: StrategyBrief | null): string => {
  if (!brief) return 'ยังไม่มี Strategy Brief';
  const arch = ARCHETYPE_LABELS[brief.positioning.archetype];
  const obj = OBJECTIVE_LABELS[brief.campaign.objective];
  const segs = brief.segments.length;
  return `${arch} · ${obj} · ${segs} segment${segs === 1 ? '' : 's'}`;
};
