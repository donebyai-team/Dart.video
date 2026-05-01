import React, { createContext, useContext } from 'react';
import { PatchOverlay, createEmptyPatchOverlay } from './types';
import { deepMerge } from './utils';
import { useAspectPreset } from '../styles/AspectPresetContext';
import { useStyleContext } from '../styles/StyleContext';
import { useTheme } from '../theme/ThemeContext';
import { resolveTypography } from '../tokens/resolveTypography';
import type { TypographyVariant } from '../tokens/semantic';
import { parsePixelValue } from '../components/scenes/text/measureText';

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

type TransformPart = string | null | undefined | false;

function composeTransforms(...transforms: TransformPart[]): string | undefined {
  const parts = transforms.filter((transform): transform is string => Boolean(transform && transform.trim()));
  return parts.length > 0 ? parts.join(' ') : undefined;
}

export interface UseElementOptionsWithProps<T> {
  base?: React.CSSProperties | ((props: T) => React.CSSProperties);
  transform?: TransformPart | ((props: T) => TransformPart);
  typography?: boolean;
  includeUserStyle?: boolean;
}

export interface UseElementResult<T> {
  id: string | undefined;
  props: T;
  rootProps: {
    id: string | undefined;
    className?: string;
  };
  typography: React.CSSProperties | undefined;
  fontSizePx: number;
  rootStyle: (options?: UseElementOptionsWithProps<T>) => React.CSSProperties;
  childStyle: (options?: UseElementOptionsWithProps<T>) => React.CSSProperties;
  textStyle: (options?: UseElementOptionsWithProps<T>) => React.CSSProperties;
}

/**
 * Single entrypoint for element props and style resolution.
 *
 * Merge order:
 *   defaults < input props < patch props
 *
 * rootStyle handles object-level style:
 *   optional typography < base < props.style, with transform composed as
 *   drag transform + component transform + props.style.transform
 *
 * childStyle handles internal animation pieces and intentionally does not
 * include drag or patched root transforms. textStyle is for inner text nodes.
 */
export function useElement<T extends object>(
  id: string | undefined,
  defaults: T,
  inputProps?: Partial<T>,
  options: UseElementOptionsWithProps<T> = {},
): UseElementResult<T> {
  const overlay = useContext(PatchContext);
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();

  const propsWithInput = inputProps ? deepMerge(defaults, inputProps) : defaults;
  const patchEntry = id ? (overlay[id] as Partial<T> | undefined) : undefined;
  const props = patchEntry ? deepMerge(propsWithInput, patchEntry) : propsWithInput;

  const style = ((props as { style?: React.CSSProperties }).style) ?? {};
  const { transform: styleTransform, ...styleWithoutTransform } = style;
  const dragX = typeof (props as any).dragX === 'number' ? (props as any).dragX : 0;
  const dragY = typeof (props as any).dragY === 'number' ? (props as any).dragY : 0;
  const dragTransform = dragX || dragY ? `translate(${dragX}px, ${dragY}px)` : undefined;
  const className = typeof (props as any).className === 'string' ? (props as any).className : undefined;
  const variant = (props as { variant?: TypographyVariant }).variant;
  const typography = variant ? resolveTypography(variant, styleConfig, theme, preset) : undefined;
  const typographyFontSizePx = parsePixelValue(typography?.fontSize, 16);
  const fontSizePx = parsePixelValue(styleWithoutTransform.fontSize, typographyFontSizePx);

  const resolveBaseStyle = (styleOptions: UseElementOptionsWithProps<T>): React.CSSProperties | undefined => {
    const base = styleOptions.base;
    return typeof base === 'function' ? base(props) : base;
  };

  const rootStyle = (styleOptions: UseElementOptionsWithProps<T> = options): React.CSSProperties => {
    const componentTransform = typeof styleOptions.transform === 'function' ? styleOptions.transform(props) : styleOptions.transform;
    const transform = composeTransforms(dragTransform, componentTransform, styleTransform);
    const baseStyle = resolveBaseStyle(styleOptions);

    return {
      ...(styleOptions.typography ? typography : undefined),
      ...baseStyle,
      ...styleWithoutTransform,
      ...(transform ? { transform } : {}),
      ...(dragTransform ? { willChange: 'transform' } : {}),
    };
  };

  const childStyle = (styleOptions: UseElementOptionsWithProps<T> = {}): React.CSSProperties => {
    const componentTransform = typeof styleOptions.transform === 'function' ? styleOptions.transform(props) : styleOptions.transform;
    const baseStyle = resolveBaseStyle(styleOptions);

    return {
      ...baseStyle,
      ...(componentTransform ? { transform: componentTransform } : {}),
      ...(componentTransform ? { willChange: 'transform' } : {}),
    };
  };

  const textStyle = (styleOptions: UseElementOptionsWithProps<T> = {}): React.CSSProperties => {
    const componentTransform = typeof styleOptions.transform === 'function' ? styleOptions.transform(props) : styleOptions.transform;
    const baseStyle = resolveBaseStyle(styleOptions);
    const includeUserStyle = styleOptions.includeUserStyle ?? true;

    return {
      ...(styleOptions.typography === false ? undefined : typography),
      ...(includeUserStyle ? styleWithoutTransform : undefined),
      ...baseStyle,
      ...(componentTransform ? { transform: componentTransform } : {}),
      ...(componentTransform ? { willChange: 'transform' } : {}),
    };
  };

  return {
    id,
    props,
    rootProps: { id, className },
    typography,
    fontSizePx,
    rootStyle,
    childStyle,
    textStyle,
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
