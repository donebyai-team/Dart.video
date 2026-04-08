export type FontSizeToken = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
export type FontWeightToken = 'thin' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
export type LineHeightToken = 'none' | 'tight' | 'normal' | 'relaxed' | 'loose';
export type FontFamilyToken = 'sans' | 'mono';

/**
 * Base font sizes in px, calibrated for a 1080px reference dimension.
 * These are raw numbers — resolveTypography scales them by (aspectPreset / 1080).
 * Do NOT use px strings here; scaling requires numeric values.
 *
 * At 1080px: caption=18, label=22, body=28, subheading=36, heading=60, display=96
 */
export const FONT_SIZE_VALUES: Record<FontSizeToken, number> = {
  xs:   18,
  sm:   22,
  base: 28,
  lg:   36,
  xl:   48,
  '2xl': 60,
  '3xl': 72,
  '4xl': 96,
  '5xl': 128,
  '6xl': 160,
  '7xl': 192,
};

export const FONT_WEIGHT_VALUES: Record<FontWeightToken, number> = {
  thin:      100,
  light:     300,
  normal:    400,
  medium:    500,
  semibold:  600,
  bold:      700,
  extrabold: 800,
};

export const LINE_HEIGHT_VALUES: Record<LineHeightToken, number> = {
  none:    1,
  tight:   1.1,
  normal:  1.4,
  relaxed: 1.6,
  loose:   2,
};

/** Reference dimension for font size scaling. */
export const FONT_SCALE_BASE = 1080;
