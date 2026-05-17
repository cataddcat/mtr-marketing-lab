import { getSupabase } from '../lib/auth-client';
import { BrandFactsSchema, type BrandFact } from '../lib/brand-facts';
import { CustomerQuotesSchema, type CustomerQuote } from '../lib/customer-quotes';
import { StrategyBriefsSchema, type StrategyBrief } from '../lib/strategy-brief';
import * as v from 'valibot';

const LOCAL_KEYS = {
  brandFacts: 'mtr_brand_facts',
  customerQuotes: 'mtr_customer_quotes',
  savedAds: 'mtr_saved_ads',
  strategyBriefs: 'mtr_strategy_briefs',
} as const;

export interface MigrationSummary {
  brandFacts: number;
  customerQuotes: number;
  savedAds: number;
  strategyBriefs: number;
  errors: string[];
}

const readJson = <T,>(key: string, schema: v.GenericSchema<unknown, T>): T | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = v.safeParse(schema, JSON.parse(raw));
    return parsed.success ? parsed.output : null;
  } catch {
    return null;
  }
};

/** What's in localStorage right now — for displaying a preview before migrating. */
export const inspectLocalData = () => ({
  brandFacts: readJson<readonly BrandFact[]>(LOCAL_KEYS.brandFacts, BrandFactsSchema)?.length ?? 0,
  customerQuotes:
    readJson<readonly CustomerQuote[]>(LOCAL_KEYS.customerQuotes, CustomerQuotesSchema)?.length ?? 0,
  savedAds: countSavedAds(),
  strategyBriefs:
    readJson<readonly StrategyBrief[]>(LOCAL_KEYS.strategyBriefs, StrategyBriefsSchema)?.length ?? 0,
});

const countSavedAds = (): number => {
  try {
    const raw = localStorage.getItem(LOCAL_KEYS.savedAds);
    if (!raw) return 0;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
};

/** Has the user been through migration before? Stored locally to avoid prompting again. */
const MIGRATION_FLAG = 'mtr_migration_completed_v1';
export const hasMigrated = (): boolean => localStorage.getItem(MIGRATION_FLAG) === '1';
export const markMigrated = (): void => {
  try {
    localStorage.setItem(MIGRATION_FLAG, '1');
  } catch {
    // ignore
  }
};

export const clearMigratedFlag = (): void => {
  try {
    localStorage.removeItem(MIGRATION_FLAG);
  } catch {
    // ignore
  }
};

/**
 * Bulk upload localStorage data → user's rows in Supabase.
 * Returns a per-table summary + any errors. Does NOT delete local data.
 */
export const importLocalToCloud = async (userId: string): Promise<MigrationSummary> => {
  const sb = getSupabase();
  if (!sb) {
    return {
      brandFacts: 0,
      customerQuotes: 0,
      savedAds: 0,
      strategyBriefs: 0,
      errors: ['Supabase ยังไม่ได้ตั้งค่า'],
    };
  }

  const summary: MigrationSummary = {
    brandFacts: 0,
    customerQuotes: 0,
    savedAds: 0,
    strategyBriefs: 0,
    errors: [],
  };

  // brand_facts — single row per user with all facts as JSONB
  const facts = readJson<readonly BrandFact[]>(LOCAL_KEYS.brandFacts, BrandFactsSchema);
  if (facts && facts.length > 0) {
    const { error } = await sb
      .from('brand_facts')
      .upsert({ user_id: userId, facts: facts as unknown as object });
    if (error) summary.errors.push(`brand_facts: ${error.message}`);
    else summary.brandFacts = facts.length;
  }

  // customer_quotes — single row
  const quotes = readJson<readonly CustomerQuote[]>(
    LOCAL_KEYS.customerQuotes,
    CustomerQuotesSchema,
  );
  if (quotes && quotes.length > 0) {
    const { error } = await sb
      .from('customer_quotes')
      .upsert({ user_id: userId, quotes: quotes as unknown as object });
    if (error) summary.errors.push(`customer_quotes: ${error.message}`);
    else summary.customerQuotes = quotes.length;
  }

  // saved_ads — one row per ad
  try {
    const raw = localStorage.getItem(LOCAL_KEYS.savedAds);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const rows = parsed
          .filter(
            (a): a is { id: string } =>
              a !== null && typeof a === 'object' && typeof (a as { id?: unknown }).id === 'string',
          )
          .map(a => {
            const local = a as Record<string, unknown>;
            return {
              id: local.id as string,
              user_id: userId,
              ad: {
                clientId: local.clientId,
                style: local.style,
                copy: local.copy,
                visual_idea: local.visual_idea,
              },
              evaluation: local.evaluation ?? null,
              performance: local.performance ?? null,
              outcome: (local.outcome as string | undefined) ?? null,
            };
          });
        if (rows.length > 0) {
          const { error } = await sb.from('saved_ads').upsert(rows);
          if (error) summary.errors.push(`saved_ads: ${error.message}`);
          else summary.savedAds = rows.length;
        }
      }
    }
  } catch (err) {
    summary.errors.push(
      `saved_ads parse: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // strategy_briefs — one row per brief, key on campaign_hash
  const briefs = readJson<readonly StrategyBrief[]>(
    LOCAL_KEYS.strategyBriefs,
    StrategyBriefsSchema,
  );
  if (briefs && briefs.length > 0) {
    const rows = briefs.map(b => ({
      user_id: userId,
      campaign_hash: b.campaign_hash,
      brief: b as unknown as object,
      edited_fields: b.edited_fields,
      drafted_at: b.drafted_at,
    }));
    const { error } = await sb
      .from('strategy_briefs')
      .upsert(rows, { onConflict: 'user_id,campaign_hash' });
    if (error) summary.errors.push(`strategy_briefs: ${error.message}`);
    else summary.strategyBriefs = rows.length;
  }

  if (summary.errors.length === 0) markMigrated();
  return summary;
};
