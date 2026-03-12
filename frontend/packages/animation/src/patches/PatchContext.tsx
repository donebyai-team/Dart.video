import React, { createContext, useContext } from 'react';
import { PatchOverlay, createEmptyPatchOverlay } from './types';

/**
 * PatchContext holds the active PatchOverlay for the current animation.
 * Every primitive reads from this to apply user edits non-destructively.
 *
 * The overlay contains two things primitives care about:
 *   1. Element-specific patches (value, swap, position, size) keyed by element id
 *   2. A global speed patch that scales all delay/duration across all elements
 */
export const PatchContext = createContext<PatchOverlay>(createEmptyPatchOverlay());

export function usePatchOverlay(): PatchOverlay {
  return useContext(PatchContext);
}

export interface PatchContextProviderProps {
  overlay: PatchOverlay;
  children: React.ReactNode;
}

export function PatchContextProvider({ overlay, children }: PatchContextProviderProps): React.ReactElement {
  return (
    <PatchContext.Provider value={overlay}>
      {children}
    </PatchContext.Provider>
  );
}

export interface TimingDefaults {
  delay: number;
  duration: number;
}

export interface ResolvedTiming {
  /** delay after element-specific patch + global speed factor applied */
  effectiveDelay: number;
  /** duration after element-specific patch + global speed factor applied */
  effectiveDuration: number;
}

/**
 * Returns effective delay and duration for a primitive, accounting for:
 *   1. Element-specific value patches (user changed this element's delay/duration)
 *   2. Global speed patch (user changed overall animation speed)
 *
 * Formula:
 *   effectiveDelay    = (elementPatch.delay    ?? defaults.delay)    / speedFactor
 *   effectiveDuration = (elementPatch.duration ?? defaults.duration) / speedFactor
 *
 * This replaces calling applySpeedFactor directly in primitives —
 * primitives that have an id should use this hook instead.
 */
export function usePrimitivePatches(
  id: string | undefined,
  defaults: TimingDefaults,
): ResolvedTiming {
  const overlay = useContext(PatchContext);

  const speedFactor = overlay.speed?.factor ?? 1;

  let patchedDelay = defaults.delay;
  let patchedDuration = defaults.duration;

  if (id) {
    const elementPatches = overlay.elements[id] ?? [];
    for (const patch of elementPatches) {
      if (patch.type === 'value') {
        if (patch.prop === 'delay' && typeof patch.value === 'number') {
          patchedDelay = patch.value;
        }
        if (patch.prop === 'duration' && typeof patch.value === 'number') {
          patchedDuration = patch.value;
        }
      }
    }
  }

  return {
    effectiveDelay: speedFactor === 1 ? patchedDelay : Math.round(patchedDelay / speedFactor),
    effectiveDuration: speedFactor === 1 ? patchedDuration : Math.round(patchedDuration / speedFactor),
  };
}

/**
 * Returns patched value for any non-timing prop on an element.
 * Returns the default if no patch exists.
 */
export function usePatchedProp<T>(
  id: string | undefined,
  prop: string,
  defaultValue: T,
): T {
  const overlay = useContext(PatchContext);
  if (!id) return defaultValue;

  const elementPatches = overlay.elements[id] ?? [];
  for (const patch of elementPatches) {
    if (patch.type === 'value' && patch.prop === prop) {
      return patch.value as T;
    }
  }
  return defaultValue;
}
