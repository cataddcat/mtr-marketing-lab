/**
 * Score → semantic class lookup.
 *
 * Bands match how the Judge prompt scores 0-10 in practice:
 *   0.0 – 4.9  bad   (red)        "drop or rewrite"
 *   5.0 – 6.4  warn  (gold)       "ok-ish, leaves money on the table"
 *   6.5 – 7.9  ok    (steel)      "shippable"
 *   8.0 – 8.9  good  (sage)       "strong"
 *   9.0+       great (deep sage)  "panel agrees · ship it"
 *
 * Color tokens come from theme.css. In light mode these are sage/gold/steel
 * print-feel colors; in dark mode they become vibrant signaling colors.
 */

export type ScoreClass = 'bad' | 'warn' | 'ok' | 'good' | 'great';

export function scoreClass(n: number | null | undefined): ScoreClass | null {
  if (n == null) return null;
  if (n < 5)   return 'bad';
  if (n < 6.5) return 'warn';
  if (n < 8)   return 'ok';
  if (n < 9)   return 'good';
  return 'great';
}

export function scoreLabel(n: number | null | undefined): string {
  const c = scoreClass(n);
  if (!c) return '—';
  return ({
    bad:   'Drop',
    warn:  'Rework',
    ok:    'Shippable',
    good:  'Strong',
    great: 'Ship it',
  })[c];
}

/** Returns the CSS var that holds the bar/text color for this score class. */
export function scoreColorVar(c: ScoreClass | null): string {
  if (!c) return 'var(--color-fg-3)';
  return ({
    bad:   'var(--color-danger)',
    warn:  'var(--color-warning)',
    ok:    'var(--color-info)',
    good:  'var(--color-success)',
    great: 'var(--color-great)',
  })[c];
}
