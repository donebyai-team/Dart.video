/** Per-element patch entry. Keyed by element ID in the PatchOverlay. */
export interface ElementPatchEntry {
  [prop: string]: unknown;
  /** CSS style overrides — always wins over component style */
  style?: Record<string, string | number>;
  /** Swap to a different component type */
  swap?: string;
}

/**
 * Full patch overlay — a flat object keyed by element ID.
 *
 * Example:
 * ```
 * {
 *   'text-0':    { variant: 'heading', style: { color: '#6366f1' } },
 *   'slidein-0': { durationInFrames: 40 },
 *   'counter-0': { to: 23 },
 * }
 * ```
 */
export type PatchOverlay = Record<string, ElementPatchEntry>;

export function createEmptyPatchOverlay(): PatchOverlay {
  return {};
}

/** Apply a single prop value override to the overlay. */
export function applyValuePatch(
  overlay: PatchOverlay,
  id: string,
  prop: string,
  value: unknown,
): PatchOverlay {
  const entry = overlay[id] ?? {};
  return {
    ...overlay,
    [id]: {
      ...entry,
      [prop]: value,
    },
  };
}

/** Merge a set of value overrides onto the overlay. */
export function applyValuePatches(
  overlay: PatchOverlay,
  id: string,
  values: Record<string, unknown>,
): PatchOverlay {
  const entry = overlay[id] ?? {};
  return {
    ...overlay,
    [id]: {
      ...entry,
      ...values,
    },
  };
}

/** Merge CSS style overrides onto the overlay. */
export function applyStyleOverride(
  overlay: PatchOverlay,
  id: string,
  style: Record<string, string | number>,
): PatchOverlay {
  const entry = overlay[id] ?? {};
  return {
    ...overlay,
    [id]: {
      ...entry,
      style: { ...((entry.style as Record<string, string | number> | undefined) ?? {}), ...style },
    },
  };
}

/** Set a component swap on the overlay. */
export function applySwapPatch(
  overlay: PatchOverlay,
  id: string,
  newComponent: string,
): PatchOverlay {
  const entry = overlay[id] ?? {};
  return {
    ...overlay,
    [id]: {
      ...entry,
      swap: newComponent,
    },
  };
}
