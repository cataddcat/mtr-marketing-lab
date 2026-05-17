import { useSyncExternalStore } from 'react';
import {
  resolveGate,
  subscribeToUsage,
  usageSnapshot,
  type Capability,
  type GateState,
} from '../lib/capabilities';
import { useTier } from './useTier';

/**
 * Read-only gate state for a capability under the current tier. Reactive to
 * both tier changes and daily-usage counter changes.
 */
export const useCapability = (cap: Capability): GateState => {
  const { tier } = useTier();
  // Force re-render when usage counters tick (e.g., user just used a generate).
  useSyncExternalStore(subscribeToUsage, usageSnapshot);
  return resolveGate(tier, cap);
};
