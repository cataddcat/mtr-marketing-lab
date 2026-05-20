/**
 * Generator-panel input draft persistence.
 *
 * Auto-saves the two textareas (product / promo) to localStorage so a hard
 * refresh, accidental tab close, or browser crash doesn't wipe the user's
 * in-progress brief. Restored on next mount.
 *
 * Storage is intentionally NOT shared with `mtr_saved_ads` etc. — those
 * survive demo bundle ops; the draft is a transient scratchpad.
 */

const STORAGE_KEY = 'mtr_input_draft';

export interface InputDraft {
  product: string;
  promo: string;
}

const EMPTY: InputDraft = { product: '', promo: '' };

export const loadInputDraft = (): InputDraft => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return EMPTY;
    const p = parsed as Record<string, unknown>;
    return {
      product: typeof p.product === 'string' ? p.product : '',
      promo: typeof p.promo === 'string' ? p.promo : '',
    };
  } catch {
    return EMPTY;
  }
};

export const persistInputDraft = (draft: InputDraft): void => {
  try {
    // Empty draft → wipe the key so localStorage stays clean.
    if (!draft.product && !draft.promo) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // localStorage full / disabled — silent (in-memory state still works).
  }
};

export const clearInputDraft = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};
