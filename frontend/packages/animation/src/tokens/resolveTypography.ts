import React from 'react';
import { TypographyVariant, TYPOGRAPHY_VARIANTS } from './semantic';
import { FONT_SIZE_VALUES, FONT_WEIGHT_VALUES, FONT_SCALE_BASE } from './typography';
import { FontFamily, StyleConfig } from '../styles/types';
import { ResolvedTheme } from '../theme/types';
import { AspectPreset, useAspectPreset } from '../styles/AspectPresetContext';
import { useStyleContext } from '../styles/StyleContext';
import { useTheme } from '../theme/ThemeContext';

const LETTER_SPACING_MAP: Record<string, string> = {
  tight:  '-0.05em',
  normal: '0em',
  wide:   '0.1em',
};


/**
 * Resolves a FontFamily token to a full CSS font-family stack.
 * - sans/mono/serif: pulls from the brand-resolved theme stacks
 * - handwritten: style-owned fixed fallback stack (not a brand decision)
 */
export function resolveFont(family: FontFamily, theme: ResolvedTheme): string {
  const resolvedFont = (() => {
    switch (family) {
      case 'mono':        return theme.fontMono;
      case 'serif':       return theme.fontSerif;
      default:            return theme.font; // 'sans' and any future additions
    }
  })();

  return resolvedFont;
}

/**
 * Computes the font scale factor for a given composition.
 * Uses the shorter dimension so all social presets (all 1080 on one axis) stay consistent.
 * A 540x540 gets 0.5x; a 4K 3840x2160 gets 2x.
 */
export function getFontScale(preset: AspectPreset): number {
  return Math.min(preset.width, preset.height) / FONT_SCALE_BASE;
}

/**
 * Resolves a TypographyVariant + StyleConfig + ResolvedTheme + AspectPreset into CSS properties.
 * - Font size: base token × scale (scale = min(w,h) / 1080)
 * - color: foreground for display/heading/subheading/body; mutedForeground for label/caption
 * - fontFamily, transform, tracking: from theme + style
 */
export function resolveTypography(
  variant: TypographyVariant,
  styleConfig: StyleConfig,
  theme: ResolvedTheme,
  preset: AspectPreset,
): React.CSSProperties {
  const variantConfig = TYPOGRAPHY_VARIANTS[variant] || TYPOGRAPHY_VARIANTS.display;
  const scale = getFontScale(preset);
  const color = theme.colors.foreground;

  const fontFamily = resolveFont(styleConfig.type.family, theme);

  return {
    fontSize:      Math.round(FONT_SIZE_VALUES[variantConfig.fontSize] * scale),
    fontWeight:    FONT_WEIGHT_VALUES[variantConfig.fontWeight],
    lineHeight:    variantConfig.lineHeight,
    fontFamily,
    textTransform: styleConfig.type.transform === 'none' ? undefined : styleConfig.type.transform,
    letterSpacing: LETTER_SPACING_MAP[styleConfig.type.tracking] ?? '0em',
    color,
  };
}

export function useTypography(variant: TypographyVariant): React.CSSProperties {
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();

  return resolveTypography(variant, styleConfig, theme, preset);
}
