/** Per-element patch entry. Keyed by element ID in the PatchOverlay. */
export interface ElementPatchEntry {
  [prop: string]: unknown;
  /** CSS style overrides — always wins over component style */
  style?: Record<string, string | number>;
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
