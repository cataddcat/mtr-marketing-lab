import * as v from 'valibot';

/**
 * Manual performance metrics attached to a saved ad after the user actually
 * runs it on Facebook/Instagram/TikTok. Closes the feedback loop without
 * requiring FB Ads Manager API integration (which is a 2-3 week project
 * for a small shop's marketing lab).
 *
 * Schema is forward-compatible — when FB API integration is added later,
 * the same fields can be populated automatically.
 */

const nonNeg = v.pipe(v.number(), v.minValue(0));

export const PerformanceMetricsSchema = v.object({
  reach: v.optional(nonNeg),
  impressions: v.optional(nonNeg),
  engagement: v.optional(nonNeg),
  clicks: v.optional(nonNeg),
  saves: v.optional(nonNeg),
  shares: v.optional(nonNeg),
  cost_thb: v.optional(nonNeg),
  notes: v.optional(v.pipe(v.string(), v.maxLength(500))),
  recorded_at: v.optional(v.string()),
});

export type PerformanceMetrics = v.InferOutput<typeof PerformanceMetricsSchema>;

export const isPerformanceEmpty = (p: PerformanceMetrics | undefined): boolean => {
  if (!p) return true;
  const hasNumber =
    (typeof p.reach === 'number' && p.reach > 0) ||
    (typeof p.impressions === 'number' && p.impressions > 0) ||
    (typeof p.engagement === 'number' && p.engagement > 0) ||
    (typeof p.clicks === 'number' && p.clicks > 0) ||
    (typeof p.saves === 'number' && p.saves > 0) ||
    (typeof p.shares === 'number' && p.shares > 0) ||
    (typeof p.cost_thb === 'number' && p.cost_thb > 0);
  const hasNotes = typeof p.notes === 'string' && p.notes.trim().length > 0;
  return !hasNumber && !hasNotes;
};

export const ctrPercent = (p: PerformanceMetrics): number | null => {
  if (typeof p.clicks !== 'number' || typeof p.impressions !== 'number') return null;
  if (p.impressions === 0) return null;
  return (p.clicks / p.impressions) * 100;
};

export const costPerClick = (p: PerformanceMetrics): number | null => {
  if (typeof p.cost_thb !== 'number' || typeof p.clicks !== 'number') return null;
  if (p.clicks === 0) return null;
  return p.cost_thb / p.clicks;
};

export const costPerReach = (p: PerformanceMetrics): number | null => {
  if (typeof p.cost_thb !== 'number' || typeof p.reach !== 'number') return null;
  if (p.reach === 0) return null;
  return (p.cost_thb / p.reach) * 1000; // baht per 1000 reach
};
