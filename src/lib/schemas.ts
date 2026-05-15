import * as v from 'valibot';

const score = v.pipe(v.number(), v.minValue(0), v.maxValue(10));
const nonEmpty = v.pipe(v.string(), v.minLength(1));

export const AdIdeaSchema = v.object({
  style: nonEmpty,
  copy: nonEmpty,
  visual_idea: nonEmpty,
});

export const AdIdeaArraySchema = v.array(AdIdeaSchema);

export const AdEvaluationSchema = v.object({
  housewife_score: score,
  housewife_comment: v.string(),
  businessman_score: score,
  businessman_comment: v.string(),
  family_man_score: score,
  family_man_comment: v.string(),
  average_score: score,
});

export const VisualPromptSchema = v.object({
  ai_prompt: nonEmpty,
  canva_keywords: nonEmpty,
});

export type ParsedAdIdea = v.InferOutput<typeof AdIdeaSchema>;
export type AdEvaluation = v.InferOutput<typeof AdEvaluationSchema>;
export type VisualPrompt = v.InferOutput<typeof VisualPromptSchema>;
