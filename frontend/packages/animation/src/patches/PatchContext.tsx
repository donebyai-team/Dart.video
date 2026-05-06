import React, { createContext, useContext } from 'react';
import { PatchOverlay, createEmptyPatchOverlay } from './types';
import { deepMerge } from './utils';
import { useAspectPreset, useStyleContext } from '../styles';
import { useTheme } from '../theme';
import { resolveTypography, TypographyVariant } from '../tokens';
import { composeTransforms } from './transform';
import { loadFontViaStylesheet } from './font';

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

  // load font
  const fontFamily = entry?.style?.fontFamily;
  if (fontFamily) {
    loadFontViaStylesheet(String(fontFamily))
  }

  return (entry?.style as Record<string, string | number> | undefined) ?? {};
}

export interface UseElementResult<T> {
  id: string;
  props: Omit<T, 'style'>; // contains all merged props excluding any style
  containerStyle: React.CSSProperties // contains the drag transform style
  style: React.CSSProperties   // user overriden style including typography
}

// useElement returns the resolved props and styles for an element.
//
// Each element is wrapped in a container:
// - `containerStyle` is applied to the outer container (e.g. drag transform).
// - `style` is applied to the element itself (user overrides + typography).
//
// `props` contains all merged properties with `style` removed.
//
// All returned styles should be applied after the base scene styles.
// Example: { ...baseStyle, ...containerStyle }
export function useElement<T>(
  id: string,
  defaultValue?: T,
): UseElementResult<T> {
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();
  const overlay = useContext(PatchContext);

  const patchEntry = overlay[id] as Partial<T>;
  const merged = patchEntry ? deepMerge(defaultValue, patchEntry) : defaultValue ? defaultValue : {};

  // 🔥 extract style out of props
  const { style: rawStyle, ...props } = (merged as T & { style?: React.CSSProperties });

  const style = rawStyle ?? {};
  const { transform: styleTransform, ...styleWithoutTransform } = style;

  // construct container style
  const dragX = typeof (props as any).dragX === 'number' ? (props as any).dragX : 0;
  const dragY = typeof (props as any).dragY === 'number' ? (props as any).dragY : 0;
  const dragTransform = dragX || dragY ? `translate(${dragX}px, ${dragY}px)` : undefined;
  const transform = composeTransforms(dragTransform, styleTransform);

  // typography
  const variant = (props as { variant?: TypographyVariant }).variant;
  const typography = variant
    ? resolveTypography(variant, styleConfig, theme, preset)
    : undefined;

  return {
    id,
    props,
    containerStyle: transform ? { transform } : {},
    style: typography ? { ...typography, ...styleWithoutTransform } : styleWithoutTransform,
  };
}
