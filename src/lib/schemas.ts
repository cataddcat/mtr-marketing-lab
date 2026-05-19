import * as v from 'valibot';

const score = v.pipe(v.number(), v.minValue(0), v.maxValue(10));
const nonEmpty = v.pipe(v.string(), v.minLength(1));

export const AdIdeaSchema = v.object({
  style: nonEmpty,
  copy: nonEmpty,
  visual_idea: nonEmpty,
});

export const AdIdeaArraySchema = v.array(AdIdeaSchema);

// ════════════════════════════════════════════════════════════════════
// Persona pool — expanded from 4 → 15 (Track F3).
// The original 4 IDs (family_man / housewife / businessman / genz) are
// PRESERVED so existing saved ads, demo data, and Strategy Brief segments
// keep working without migration. The 11 new IDs cover the long-tail
// audiences the original 4 were too coarse to describe (Bkk-commuter
// pa-baan, urban-condo housewife, hotelier, contractor, etc.).
//
// The Judge is now told to pick 3-6 RELEVANT personas from the pool —
// not score the entire 15 every call (that would blow the token budget
// for little signal). See PersonaEvalSchema's relaxed length constraint.
// ════════════════════════════════════════════════════════════════════
export const PersonaIdSchema = v.picklist([
  // Original 4 — kept for backward compatibility with existing saved ads.
  'family_man',
  'housewife',
  'businessman',
  'genz',
  // Refined splits of the original 4.
  'family_man_commuter',
  'housewife_urban',
  'businessman_hotelier',
  'genz_first_condo',
  // New segments uncovered by the original 4.
  'contractor',
  'interior_designer',
  'millennial_remote_worker',
  'retiree_downsize',
  'landlord_rental',
  'wedding_couple',
  'price_hunter',
] as const);

export const ConfidenceSchema = v.picklist(['high', 'med', 'low'] as const);

export const PersonaEvalSchema = v.object({
  id: PersonaIdSchema,
  scroll_stop_score: score,
  focused_score: score,
  memory_score: score,
  confidence: ConfidenceSchema,
  verdict: v.pipe(v.string(), v.maxLength(160)),
  suggestion: v.pipe(v.string(), v.maxLength(200)),
});

export const StructureScoreSchema = v.object({
  hook_score: score,
  hook_critique: v.pipe(v.string(), v.maxLength(200)),
  body_score: score,
  body_critique: v.pipe(v.string(), v.maxLength(200)),
  cta_score: score,
  cta_critique: v.pipe(v.string(), v.maxLength(200)),
});

export const ChannelIdSchema = v.picklist([
  'facebook_feed',
  'facebook_reels',
  'instagram_feed',
  'instagram_reels',
  'tiktok',
] as const);

export const ChannelFitItemSchema = v.object({
  channel: ChannelIdSchema,
  score: score,
});

export const ChannelFitSchema = v.object({
  ranked: v.pipe(v.array(ChannelFitItemSchema), v.minLength(3), v.maxLength(5)),
  best: ChannelIdSchema,
  reasoning: v.pipe(v.string(), v.maxLength(240)),
});

export const VarianceSchema = v.object({
  max_std: v.number(),
  unstable_fields: v.array(v.string()),
});

export const EnsembleMetaSchema = v.object({
  runs: v.pipe(v.number(), v.minValue(1)),
  variance: VarianceSchema,
});

export const WinnerSchema = v.picklist(['ours', 'theirs', 'tie'] as const);

export const CompetitorComparisonSchema = v.object({
  winner: WinnerSchema,
  margin: score,
  ours_strengths: v.pipe(
    v.array(v.pipe(v.string(), v.maxLength(160))),
    v.maxLength(5),
  ),
  theirs_strengths: v.pipe(
    v.array(v.pipe(v.string(), v.maxLength(160))),
    v.maxLength(5),
  ),
  recommendation: v.pipe(v.string(), v.maxLength(280)),
});

export const BenchmarkBucketSchema = v.picklist(['above', 'on', 'below'] as const);
export type BenchmarkBucket = v.InferOutput<typeof BenchmarkBucketSchema>;

export const JtbdCoverageItemSchema = v.object({
  segment_name: nonEmpty,
  score: score,
  gap: v.pipe(v.string(), v.maxLength(200)),
});

export const StrategyFitSchema = v.object({
  positioning_score: score,
  positioning_critique: v.pipe(v.string(), v.maxLength(240)),
  jtbd_coverage: v.pipe(v.array(JtbdCoverageItemSchema), v.maxLength(5)),
  whitespace_capture: score,
  whitespace_critique: v.pipe(v.string(), v.maxLength(240)),
  benchmark_alignment: v.object({
    channel: ChannelIdSchema,
    estimated_ctr_pct: v.number(),
    vs_benchmark: BenchmarkBucketSchema,
    note: v.pipe(v.string(), v.maxLength(200)),
  }),
});
export type JtbdCoverageItem = v.InferOutput<typeof JtbdCoverageItemSchema>;
export type StrategyFit = v.InferOutput<typeof StrategyFitSchema>;

// ════════════════════════════════════════════════════════════════════
// Community Simulation (Track E.M2 — Super-Judge)
// MTR-side aggregated view of a MiroFish run. MiroFish itself stays
// generic; this shape is the MTR-specific projection of its outputs.
// ════════════════════════════════════════════════════════════════════

export const SentimentSchema = v.object({
  positive: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
  neutral: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
  negative: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
});

export const ObjectionItemSchema = v.object({
  text: v.pipe(v.string(), v.maxLength(180)),
  count: v.pipe(v.number(), v.minValue(0)),
});

export const QuoteItemSchema = v.object({
  persona: v.pipe(v.string(), v.maxLength(60)),
  text: v.pipe(v.string(), v.maxLength(280)),
  stance: v.picklist(['positive', 'neutral', 'negative'] as const),
});

export const CommunitySimConfigSchema = v.object({
  agent_count: v.pipe(v.number(), v.minValue(1)),
  rounds: v.pipe(v.number(), v.minValue(1)),
});

export const CommunitySimSchema = v.object({
  // External keys for traceability back to MiroFish.
  sim_id: nonEmpty,
  project_id: nonEmpty,
  run_at: nonEmpty, // ISO string
  config: CommunitySimConfigSchema,

  // Aggregated metrics — what the UI surfaces.
  sentiment: SentimentSchema,
  // 0-100 estimated click intent (would-click yes / (yes+no+maybe×0.5))
  click_intent: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
  // 1-5 average trust score
  trust_score: v.pipe(v.number(), v.minValue(1), v.maxValue(5)),
  // 0-100 share/forward intent
  virality_signal: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),

  top_objections: v.pipe(v.array(ObjectionItemSchema), v.maxLength(5)),
  representative_quotes: v.pipe(v.array(QuoteItemSchema), v.maxLength(6)),

  // Raw counts so the UI can show "based on N agent responses".
  responses_total: v.pipe(v.number(), v.minValue(0)),
});

export type Sentiment = v.InferOutput<typeof SentimentSchema>;
export type ObjectionItem = v.InferOutput<typeof ObjectionItemSchema>;
export type QuoteItem = v.InferOutput<typeof QuoteItemSchema>;
export type CommunitySim = v.InferOutput<typeof CommunitySimSchema>;
export type CommunitySimConfig = v.InferOutput<typeof CommunitySimConfigSchema>;

export const AdEvaluationSchema = v.object({
  panel_verdict: v.pipe(v.string(), v.maxLength(200)),
  trends_used: v.array(v.string()),
  structure: StructureScoreSchema,
  channel_fit: ChannelFitSchema,
  // Loosened from exact length 4 to a 3-6 range so the Judge can pick the
  // most relevant subset from the 15-persona pool instead of scoring all 15
  // (token explosion) or always being stuck with the original 4 (too coarse).
  personas: v.pipe(v.array(PersonaEvalSchema), v.minLength(3), v.maxLength(6)),
  average_score: score,
  // Optional client-side metadata — never produced by the LLM. Set after
  // aggregating multiple judge runs (ensemble) so the UI can show stability.
  ensemble: v.optional(EnsembleMetaSchema),
  // Optional comparison block — produced by the LLM only when a competitor
  // ad text is supplied to evaluateAd().
  competitor: v.optional(CompetitorComparisonSchema),
  // Optional strategy-fit block — produced by the LLM only when a
  // StrategyBrief is supplied (Track A Phase 2).
  strategy_fit: v.optional(StrategyFitSchema),
  // Optional community-sim block — attached after a MiroFish run finishes
  // (Track E.M2). Never produced by the LLM directly; the judge prompt
  // *uses* it as additional context but does not emit it.
  community_sim: v.optional(CommunitySimSchema),
});

export const VisualPromptSchema = v.object({
  ai_prompt: nonEmpty,
  canva_keywords: nonEmpty,
});

export type ParsedAdIdea = v.InferOutput<typeof AdIdeaSchema>;
export type PersonaId = v.InferOutput<typeof PersonaIdSchema>;
export type Confidence = v.InferOutput<typeof ConfidenceSchema>;
export type PersonaEval = v.InferOutput<typeof PersonaEvalSchema>;
export type StructureScore = v.InferOutput<typeof StructureScoreSchema>;
export type ChannelId = v.InferOutput<typeof ChannelIdSchema>;
export type ChannelFitItem = v.InferOutput<typeof ChannelFitItemSchema>;
export type ChannelFit = v.InferOutput<typeof ChannelFitSchema>;
export type Variance = v.InferOutput<typeof VarianceSchema>;
export type EnsembleMeta = v.InferOutput<typeof EnsembleMetaSchema>;
export type Winner = v.InferOutput<typeof WinnerSchema>;
export type CompetitorComparison = v.InferOutput<typeof CompetitorComparisonSchema>;
export type AdEvaluation = v.InferOutput<typeof AdEvaluationSchema>;
export type VisualPrompt = v.InferOutput<typeof VisualPromptSchema>;

export const CHANNEL_LABELS: Record<ChannelId, string> = {
  facebook_feed: 'Facebook Feed',
  facebook_reels: 'Facebook Reels',
  instagram_feed: 'Instagram Feed',
  instagram_reels: 'Instagram Reels',
  tiktok: 'TikTok',
};

export const personaAverage = (p: PersonaEval): number =>
  (p.scroll_stop_score + p.focused_score + p.memory_score) / 3;

export const PERSONA_LABELS: Record<PersonaId, string> = {
  // Original 4 — labels refined to reflect the typical Marnthara segment.
  family_man: 'พ่อบ้านลพบุรี',
  housewife: 'แม่บ้านชานเมือง',
  businessman: 'เจ้าของธุรกิจขนาดเล็ก',
  genz: 'นักศึกษา/GenZ หอ',
  // Refined splits.
  family_man_commuter: 'พ่อบ้าน กทม.-ปริมณฑล',
  housewife_urban: 'แม่บ้านคอนโดเมือง',
  businessman_hotelier: 'เจ้าของโรงแรมบูทีค',
  genz_first_condo: 'GenZ คอนโดใหม่',
  // New segments.
  contractor: 'รับเหมา/ตกแต่งภายใน',
  interior_designer: 'นักออกแบบ interior',
  millennial_remote_worker: 'มิลเลนเนียล WFH',
  retiree_downsize: 'ผู้สูงวัยปรับปรุงบ้าน',
  landlord_rental: 'เจ้าของบ้านให้เช่า',
  wedding_couple: 'คู่แต่งงานใหม่',
  price_hunter: 'นักล่าราคาถูก',
};

/**
 * Persona pool metadata — used by the Judge prompt to know which personas
 * to consider, and by future UI selectors. Keep descriptions short (under
 * 120 chars) so the prompt stays compact.
 */
export const PERSONA_DESCRIPTIONS: Record<PersonaId, string> = {
  family_man:
    'พ่อบ้าน 35-55 ตจว. มีลูก-มีบ้านเดี่ยว ใส่ใจค่าไฟ/warranty มากกว่า aesthetic',
  housewife:
    'แม่บ้าน 35-55 ชานเมือง ตกแต่งบ้านเอง ใส่ใจ "ดูแล้วน่าอยู่ ลูกแพ้ฝุ่นน้อย"',
  businessman:
    'เจ้าของธุรกิจเล็ก (ร้าน/คาเฟ่/สปา) ต้องการ vibe + ออกใบกำกับภาษี + งานเสร็จก่อนเปิดร้าน',
  genz:
    'นักศึกษาหอ/คอนโด 19-23 งบ ฿2-5k เน้น aesthetic + share IG/TikTok',
  family_man_commuter:
    'พ่อบ้าน กทม.-ปริมณฑล 30-45 ผ่อนบ้าน ทำงาน 9-5 ตัดสินใจเรื่องบ้านร่วมกับภรรยา',
  housewife_urban:
    'แม่บ้านคอนโดเมือง 28-40 รายได้สูง ใส่ใจ designer/brand-name + curated look',
  businessman_hotelier:
    'เจ้าของโรงแรมบูทีค/รีสอร์ต ต้องการ batch order, premium fabric, ดูดี-ทน-ซักได้',
  genz_first_condo:
    'GenZ 22-28 เพิ่งย้ายเข้าคอนโดแรก งบ ฿5-10k/ห้อง mood-driven, vibe-first',
  contractor:
    'รับเหมา/ตกแต่งภายใน refer client เน้น margin + งานเร็ว + ไม่มีปัญหากับ end customer',
  interior_designer:
    'นักออกแบบ interior เน้น fabric library, custom color, สั่งทำ + ทันโปรเจกต์',
  millennial_remote_worker:
    'WFH 30-38 ตกแต่งห้องทำงานบ้าน ใส่ใจกันแสง + เสียง + Zoom background',
  retiree_downsize:
    'ผู้สูงวัย 55+ ปรับปรุงบ้านเก่า เน้น "ทน-ซักง่าย-ไม่ต้องเปลี่ยนบ่อย"',
  landlord_rental:
    'เจ้าของบ้าน/คอนโด ให้เช่า ต้องการ "ดูดีในรูป + ราคาประหยัด + ติดเร็ว"',
  wedding_couple:
    'คู่แต่งงานใหม่ ตกแต่งบ้านครั้งแรก งบใหญ่ ตัดสินใจร่วม ใส่ใจ "สวย-ทน-คุ้ม"',
  price_hunter:
    'ลูกค้าที่หาราคาถูกที่สุด — รับ promo, ต่อรอง, เปรียบ 3 ร้าน, deal-driven',
};
