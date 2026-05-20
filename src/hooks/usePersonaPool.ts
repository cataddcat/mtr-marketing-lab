import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CORE_PERSONA_POOL,
  buildLookups,
  loadGeneratedPersonas,
  saveGeneratedPersonas,
  type Persona,
} from '../lib/persona-pool';

export interface UsePersonaPool {
  /** Full pool: core 15 + generated (regardless of enabled). */
  readonly all: readonly Persona[];
  /** Only the generated subset stored in localStorage. */
  readonly generated: readonly Persona[];
  /** Active subset: enabled === true (this is what the Judge sees). */
  readonly active: readonly Persona[];
  /** Lookup maps for fast label/description rendering. */
  readonly labels: Readonly<Record<string, string>>;
  readonly descriptions: Readonly<Record<string, string>>;
  /** Append newly-generated personas; dedupes by id (last write wins). */
  readonly append: (personas: readonly Persona[]) => void;
  /** Toggle a persona's enabled flag. Core personas: in-memory only. */
  readonly toggleEnabled: (id: string) => void;
  /** Patch a single field (label/description/attrs) of a generated persona. */
  readonly update: (id: string, patch: Partial<Omit<Persona, 'id' | 'is_core' | 'created_at'>>) => void;
  /** Remove a generated persona (no-op for core). */
  readonly remove: (id: string) => void;
  /** Wipe all generated personas. */
  readonly clearGenerated: () => void;
}

/**
 * Persona Pool state — combines the always-on core 15 with localStorage-
 * backed generated personas. Designed so the Judge prompt + UI can read
 * a single `active` array without caring where each came from.
 *
 * Core personas have `is_core: true` and CANNOT be removed; their
 * `enabled` toggle is in-memory only (resets on reload).
 */
export const usePersonaPool = (): UsePersonaPool => {
  const [generated, setGenerated] = useState<readonly Persona[]>(() => loadGeneratedPersonas());
  // Core enabled flags are session-only — start from CORE_PERSONA_POOL each load.
  const [coreOverrides, setCoreOverrides] = useState<Readonly<Record<string, boolean>>>({});

  useEffect(() => {
    saveGeneratedPersonas(generated);
  }, [generated]);

  const all = useMemo<readonly Persona[]>(() => {
    const core = CORE_PERSONA_POOL.map(p =>
      coreOverrides[p.id] === undefined ? p : { ...p, enabled: coreOverrides[p.id]! },
    );
    return [...core, ...generated];
  }, [generated, coreOverrides]);

  // Active subset = core ∪ generated, both with `enabled === true`.
  const active = useMemo(() => all.filter(p => p.enabled), [all]);

  const lookups = useMemo(() => buildLookups(generated), [generated]);

  const append = useCallback((personas: readonly Persona[]) => {
    setGenerated(prev => {
      // Dedupe by id (incoming wins) so re-expansion replaces stale entries.
      const byId = new Map<string, Persona>();
      for (const p of prev) byId.set(p.id, p);
      for (const p of personas) byId.set(p.id, { ...p, is_core: false });
      return Array.from(byId.values());
    });
  }, []);

  const toggleEnabled = useCallback((id: string) => {
    const isCore = CORE_PERSONA_POOL.some(p => p.id === id);
    if (isCore) {
      setCoreOverrides(prev => {
        const current = prev[id] ?? CORE_PERSONA_POOL.find(p => p.id === id)!.enabled;
        return { ...prev, [id]: !current };
      });
      return;
    }
    setGenerated(prev => prev.map(p => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<Omit<Persona, 'id' | 'is_core' | 'created_at'>>) => {
      // Core personas: not editable through this API.
      setGenerated(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setGenerated(prev => prev.filter(p => p.id !== id));
  }, []);

  const clearGenerated = useCallback(() => {
    setGenerated([]);
  }, []);

  return {
    all,
    generated,
    active,
    labels: lookups.labels,
    descriptions: lookups.descriptions,
    append,
    toggleEnabled,
    update,
    remove,
    clearGenerated,
  };
};
