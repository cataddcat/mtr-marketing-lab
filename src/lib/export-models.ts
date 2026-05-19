/**
 * Canonical, export-target-agnostic model for everything we ship to Obsidian
 * (and later MiroFish). Built once from app state, then handed to per-target
 * serializers.
 */

import type { BrandFact } from './brand-facts';
import type { StrategyBrief } from './strategy-brief';
import type { AdEvaluation, PersonaId } from './schemas';
import type { PerformanceMetrics } from './performance';
import type { FeedbackRecord } from './feedback';

export type Outcome = 'used-good' | 'used-bad';

export interface SavedAdLike {
  id: string;
  clientId: string;
  style: string;
  copy: string;
  visual_idea: string;
  evaluation: AdEvaluation | null;
  outcome?: Outcome;
  performance?: PerformanceMetrics;
}

export interface ExportInput {
  readonly brandFacts: readonly BrandFact[];
  readonly briefs: readonly StrategyBrief[];
  readonly savedAds: readonly SavedAdLike[];
  readonly feedback: readonly FeedbackRecord[];
  readonly exportedAt: string;
}

export interface AdExportRow {
  id: string;
  ad: SavedAdLike;
  /** Which brief (if any) is the closest match — used to wikilink */
  briefId: string | null;
  /** Persona ids that scored well (avg >= 7) — used to wikilink */
  strongPersonas: PersonaId[];
}

const PERSONA_STRONG_THRESHOLD = 7;

const personaAverage = (p: {
  scroll_stop_score: number;
  focused_score: number;
  memory_score: number;
}): number => (p.scroll_stop_score + p.focused_score + p.memory_score) / 3;

/** Light pre-processing — flatten saved ads with derived links. */
export const buildAdRows = (
  ads: readonly SavedAdLike[],
  briefs: readonly StrategyBrief[],
): AdExportRow[] => {
  // Heuristic: until we capture which brief was active at save time, link to
  // the most recently-drafted brief overall (best we can do without metadata).
  // Future: stamp ad.briefCampaignHash at save time and look up via briefs map.
  const latestBrief = [...briefs].sort((a, b) =>
    b.drafted_at.localeCompare(a.drafted_at),
  )[0];

  return ads.map(ad => {
    const strong = ad.evaluation
      ? ad.evaluation.personas
          .filter(p => personaAverage(p) >= PERSONA_STRONG_THRESHOLD)
          .map(p => p.id)
      : [];
    return {
      id: ad.id,
      ad,
      briefId: latestBrief?.campaign_hash ?? null,
      strongPersonas: strong,
    };
  });
};

/** Group ads by style for nicer folder layout. */
export const groupAdsByCampaign = (rows: readonly AdExportRow[]): Record<string, AdExportRow[]> => {
  const out: Record<string, AdExportRow[]> = {};
  for (const row of rows) {
    const key = row.briefId ?? 'no-brief';
    if (!out[key]) out[key] = [];
    out[key].push(row);
  }
  return out;
};
