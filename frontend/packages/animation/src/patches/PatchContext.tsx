import React, { createContext, useContext } from 'react';
import { PatchOverlay, createEmptyPatchOverlay } from './types';
import { deepMerge } from './utils';

/**
 * PatchContext holds the active PatchOverlay for the current animation.
 * Every primitive reads from this to apply user edits non-destructively.
 *
 * The overlay is a flat object keyed by element ID. Each entry contains:
 *   - direct prop overrides
 *   - style: CSS property overrides (always wins)
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
 * accounting for:
 *   1. User patches on these timing props
 *   2. Global speed factor (> 1 = faster, < 1 = slower)
 */
export function usePrimitivePatches(
  id: string | undefined,
  defaults: TimingDefaults,
): ResolvedTiming {
  const overlay = useContext(PatchContext);

  let startAt = defaults.startAt;
  let duration = defaults.durationInFrames;

  if (id) {
    const entry = overlay[id];
    if (typeof entry?.startAt === 'number') startAt = entry.startAt;
    if (typeof entry?.durationInFrames === 'number') duration = entry.durationInFrames;
  }

  return { effectiveStartAt: startAt, effectiveDurationInFrames: duration };
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
  if (!prop) return entry as T;
  if (entry && prop in entry) return entry[prop] as T;
  return defaultValue;
}

export function usePatchedProps<T>(
  id: string | undefined,
  defaultValue: T,
): T {
  const overlay = useContext(PatchContext);

  if (!id) return defaultValue;

  const entry = overlay[id] as Partial<T> | undefined;
  if (!entry) return defaultValue;

  return deepMerge(defaultValue, entry);
}

type TransformPart = string | null | undefined | false;

function composeTransforms(...transforms: TransformPart[]): string | undefined {
  const parts = transforms.filter((transform): transform is string => Boolean(transform && transform.trim()));
  return parts.length > 0 ? parts.join(' ') : undefined;
}

export interface UseElementOptionsWithProps<T> {
  baseStyle?: React.CSSProperties | ((props: T) => React.CSSProperties);
  transform?: TransformPart | ((props: T) => TransformPart);
}

export interface UseElementResult<T> {
  props: T;
  style: React.CSSProperties;
  getStyle: (options?: UseElementOptionsWithProps<T>) => React.CSSProperties;
}

/**
 * Single entrypoint for element props and style resolution.
 *
 * Merge order:
 *   defaults < input props < patch props
 *
 * Style order:
 *   base style < props.style, with transform composed as
 *   drag transform + component transform + props.style.transform
 */
export function useElement<T extends object>(
  id: string | undefined,
  defaults: T,
  inputProps?: Partial<T>,
  options: UseElementOptionsWithProps<T> = {},
): UseElementResult<T> {
  const overlay = useContext(PatchContext);

  const propsWithInput = inputProps ? deepMerge(defaults, inputProps) : defaults;
  const patchEntry = id ? (overlay[id] as Partial<T> | undefined) : undefined;
  const props = patchEntry ? deepMerge(propsWithInput, patchEntry) : propsWithInput;

  const style = ((props as { style?: React.CSSProperties }).style) ?? {};
  const { transform: styleTransform, ...styleWithoutTransform } = style;
  const dragX = typeof (props as any).dragX === 'number' ? (props as any).dragX : 0;
  const dragY = typeof (props as any).dragY === 'number' ? (props as any).dragY : 0;
  const dragTransform = dragX || dragY ? `translate(${dragX}px, ${dragY}px)` : undefined;
  const getStyle = (styleOptions: UseElementOptionsWithProps<T> = options): React.CSSProperties => {
    const componentTransform = typeof styleOptions.transform === 'function' ? styleOptions.transform(props) : styleOptions.transform;
    const transform = composeTransforms(dragTransform, componentTransform, styleTransform);
    const baseStyle = typeof styleOptions.baseStyle === 'function' ? styleOptions.baseStyle(props) : styleOptions.baseStyle;

    return {
      ...baseStyle,
      ...styleWithoutTransform,
      ...(transform ? { transform } : {}),
      ...(dragTransform ? { willChange: 'transform' } : {}),
    };
  };

  return {
    props,
    style: getStyle(options),
    getStyle,
  };
}

export function useArrayPatch(source: string) {
  const patches = useContext(PatchContext)
  const regex = new RegExp(`^\\w+-${source}-(\\d+)$`)

  const byIndex: Record<number, Record<string, any>> = {}

  for (const [eid, patch] of Object.entries(patches)) {
    const match = eid.match(regex)
    if (!match) continue
    const index = parseInt(match[1])
    byIndex[index] ??= {}
    byIndex[index][eid] = patch
  }

  return Object.entries(byIndex)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([_, item]) => item)
}

/**
 * Returns the style override object for an element.
 * Merge this on top of component style — user overrides always win.
 */
export function useStyleOverride(id: string | undefined): Record<string, string | number> {
  const overlay = useContext(PatchContext);
  if (!id) return {};
  const entry = overlay[id];
  return (entry?.style as Record<string, string | number> | undefined) ?? {};
}
