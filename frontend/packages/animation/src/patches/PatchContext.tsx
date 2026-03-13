import React, { createContext, useContext } from 'react';
import { PatchOverlay, createEmptyPatchOverlay } from './types';

/**
 * PatchContext holds the active PatchOverlay for the current animation.
 * Every primitive reads from this to apply user edits non-destructively.
 *
 * The overlay is a flat object keyed by element ID. Each entry contains:
 *   - value: prop value overrides
 *   - styleOverride: CSS property overrides (always wins)
 *   - swap: component replacement target
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
  startAt: number;
  durationInFrames: number;
}

export interface ResolvedTiming {
  /** startAt after patch applied */
  effectiveStartAt: number;
  /** durationInFrames after patch applied */
  effectiveDurationInFrames: number;
}

/**
 * Returns effective startAt and durationInFrames for a primitive,
 * accounting for user value patches on these timing props.
 */
export function usePrimitivePatches(
  id: string | undefined,
  defaults: TimingDefaults,
): ResolvedTiming {
  const overlay = useContext(PatchContext);

  if (!id) return { effectiveStartAt: defaults.startAt, effectiveDurationInFrames: defaults.durationInFrames };

  const entry = overlay[id];
  if (!entry?.value) return { effectiveStartAt: defaults.startAt, effectiveDurationInFrames: defaults.durationInFrames };

  return {
    effectiveStartAt:
      typeof entry.value.startAt === 'number' ? entry.value.startAt : defaults.startAt,
    effectiveDurationInFrames:
      typeof entry.value.durationInFrames === 'number' ? entry.value.durationInFrames : defaults.durationInFrames,
  };
}

/**
 * Returns the patched value for any prop on an element.
 * If no patch exists, returns the default.
 */
export function usePatchedProp<T>(
  id: string | undefined,
  prop: string,
  defaultValue: T,
): T {
  const overlay = useContext(PatchContext);
  if (!id) return defaultValue;

  const entry = overlay[id];
  if (entry?.value && prop in entry.value) return entry.value[prop] as T;
  return defaultValue;
}

/**
 * Returns the style override object for an element.
 * Merge this on top of component style — user overrides always win.
 */
export function useStyleOverride(id: string | undefined): Record<string, string | number> {
  const overlay = useContext(PatchContext);
  if (!id) return {};
  return overlay[id]?.styleOverride ?? {};
}
