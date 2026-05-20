/**
 * Single source of truth for the Judge prompt version.
 *
 * Bump this whenever the Judge system prompt changes meaningfully
 * (rubric, scoring instructions, anti-template rules, persona-pool
 * instructions). Calibration filters out saved ads whose prompt_version
 * differs so old scores don't drag the new prompt's calibration.
 *
 * Format: YYYY-MM-DD of the change.
 *
 * Extracted into a leaf module so both `services/marketing-agent.ts`
 * (the producer) and `lib/calibration.ts` (the consumer/filter) can
 * import it without creating a circular dependency.
 */
export const JUDGE_PROMPT_VERSION = '2026-05-21';
