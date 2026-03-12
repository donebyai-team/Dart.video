/** Change a single prop value on a primitive-backed element. */
export interface ValuePatch {
  type: 'value';
  /** Element ID in format {componentType}-{index}, e.g. "fadein-0" */
  id: string;
  prop: string;
  value: unknown;
}

/** Replace one component type with another via a defined swap rule. */
export interface SwapPatch {
  type: 'swap';
  id: string;
  swapTo: string;
  /** Props to set on the new component. */
  props: Record<string, unknown>;
}

/** Override absolute position of a top-level element. */
export interface PositionPatch {
  type: 'position';
  id: string;
  x: number;
  y: number;
}

/** Override width/height of a scene component or layout container. */
export interface SizePatch {
  type: 'size';
  id: string;
  width: number;
  height: number;
}

/** Global timing multiplier. speedFactor > 1 = faster, < 1 = slower. */
export interface SpeedPatch {
  type: 'speed';
  factor: number;
}

export type AnimationPatch = ValuePatch | SwapPatch | PositionPatch | SizePatch | SpeedPatch;

/** All patches for a single animation, keyed by element ID for fast lookup. */
export interface PatchOverlay {
  /** Per-element patches. Key: element ID. */
  elements: Record<string, (ValuePatch | SwapPatch | PositionPatch | SizePatch)[]>;
  /** Global speed patch (at most one). */
  speed?: SpeedPatch;
}

export function createEmptyPatchOverlay(): PatchOverlay {
  return { elements: {} };
}

export function applyPatchToOverlay(overlay: PatchOverlay, patch: AnimationPatch): PatchOverlay {
  if (patch.type === 'speed') {
    return { ...overlay, speed: patch };
  }

  const existing = overlay.elements[patch.id] ?? [];
  // Replace existing patch of same type+prop, or append
  const filtered = existing.filter((p) => {
    if (p.type !== patch.type) return true;
    if (p.type === 'value' && patch.type === 'value') {
      return p.prop !== patch.prop;
    }
    return false;
  });

  return {
    ...overlay,
    elements: {
      ...overlay.elements,
      [patch.id]: [...filtered, patch],
    },
  };
}
