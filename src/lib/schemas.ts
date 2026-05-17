import * as v from 'valibot';

const score = v.pipe(v.number(), v.minValue(0), v.maxValue(10));
const nonEmpty = v.pipe(v.string(), v.minLength(1));

export const AdIdeaSchema = v.object({
  style: nonEmpty,
  copy: nonEmpty,
  visual_idea: nonEmpty,
});

export const AdIdeaArraySchema = v.array(AdIdeaSchema);

export const PersonaIdSchema = v.picklist([
  'family_man',
  'housewife',
  'businessman',
  'genz',
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

export const AdEvaluationSchema = v.object({
  panel_verdict: v.pipe(v.string(), v.maxLength(200)),
  trends_used: v.array(v.string()),
  structure: StructureScoreSchema,
  channel_fit: ChannelFitSchema,
  personas: v.pipe(v.array(PersonaEvalSchema), v.length(4)),
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
  family_man: 'พ่อบ้าน',
  housewife: 'แม่บ้าน',
  businessman: 'เจ้าของธุรกิจ',
  genz: 'GenZ',
};
