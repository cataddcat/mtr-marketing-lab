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

export const AdEvaluationSchema = v.object({
  panel_verdict: v.pipe(v.string(), v.maxLength(200)),
  trends_used: v.array(v.string()),
  structure: StructureScoreSchema,
  channel_fit: ChannelFitSchema,
  personas: v.pipe(v.array(PersonaEvalSchema), v.length(4)),
  average_score: score,
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
