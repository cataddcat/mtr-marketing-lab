import { useCallback, useSyncExternalStore } from 'react';
import {
  findFeedback,
  removeFeedback,
  snapshot,
  subscribe,
  upsertFeedback,
  type FeedbackRecord,
  type FeedbackSignal,
  type FeedbackTarget,
} from '../lib/feedback';

export interface UseFeedbackBinding {
  readonly current: FeedbackRecord | undefined;
  readonly setSignal: (signal: FeedbackSignal, reason?: string) => void;
  readonly clear: () => void;
}

/**
 * Bind a feedback widget to a specific content hash. All instances of this
 * hook for the same contentHash share state via a singleton store + an
 * external store subscription, so updating in one widget reflects in all.
 */
export const useFeedback = (target: FeedbackTarget | null): UseFeedbackBinding => {
  // Subscribe to the entire snapshot so changes anywhere trigger a re-read.
  // The snapshot is identity-stable until something changes, satisfying React's
  // requirement for useSyncExternalStore.
  const all = useSyncExternalStore(subscribe, snapshot);
  const current = target ? all.find(r => r.target.contentHash === target.contentHash) : undefined;

  const setSignal = useCallback(
    (signal: FeedbackSignal, reason?: string) => {
      if (!target) return;
      // toggle off if user clicks the already-set signal with no new reason
      const existing = findFeedback(target.contentHash);
      if (existing && existing.signal === signal && !reason) {
        removeFeedback(target.contentHash);
        return;
      }
      upsertFeedback(target, signal, reason);
    },
    [target],
  );

  const clear = useCallback(() => {
    if (!target) return;
    removeFeedback(target.contentHash);
  }, [target]);

  return { current, setSignal, clear };
};

/** Convenience helper for components that need the full feedback list (Library aggregate, etc.) */
export const useAllFeedback = (): readonly FeedbackRecord[] =>
  useSyncExternalStore(subscribe, snapshot);
