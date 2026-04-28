import { BrandTheme } from './types';
import { ColorTokens } from '../tokens/colors';

/** Parse a hex color into [r, g, b] (0–255). */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Relative luminance (WCAG). */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** True if the color is perceived as dark. */
function isDark(hex: string): boolean {
  return luminance(hex) < 0.179;
}

/** Mix two hex colors by [t] (0 = a, 1 = b). */
function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return '#' + [r, g, bl].map(v => v.toString(16).padStart(2, '0')).join('');
}

/** WCAG contrast ratio between two colors */
function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/** Best contrasting text color (white or black) for a given background. */
function contrastText(bg: string): string {
  const black = '#000000';
  const white = '#ffffff';

  const contrastBlack = contrastRatio(bg, black);
  const contrastWhite = contrastRatio(bg, white);

  return contrastBlack > contrastWhite ? black : white;
}

/**
 * Derives a full 26-slot ColorTokens palette from a 5-slot BrandTheme.
 * Neutral tones (card, muted, border) are derived from bg.
 * Status colors (success, warning, info, destructive) are fixed.
 */
export function derivePalette(brand: BrandTheme): ColorTokens {
 const dark = isDark(brand.bg);

  const step1 = dark
    ? mix(brand.bg, '#ffffff', 0.06)
    : mix(brand.bg, '#000000', 0.04);

  const step2 = dark
    ? mix(brand.bg, '#ffffff', 0.12)
    : mix(brand.bg, '#000000', 0.08);

  const mutedText = dark
    ? mix(brand.text, brand.bg, 0.4)
    : mix(brand.text, brand.bg, 0.3);

  return {
    background: brand.bg,
    foreground: brand.text,
    card: step1,
    cardForeground: brand.text,
    popover: step1,
    popoverForeground: brand.text,
    primary: brand.primary,
    primaryForeground: contrastText(brand.primary),
    secondary: brand.secondary,
    secondaryForeground: contrastText(brand.secondary),
    muted: step1,
    mutedForeground: mutedText,
    accent: brand.accent,
    accentForeground: contrastText(brand.accent),
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',
    border: step2,
    input: step2,
    ring: brand.primary,
    success: '#22c55e',
    successForeground: '#ffffff',
    warning: '#f59e0b',
    warningForeground: '#000000',
    info: '#3b82f6',
    infoForeground: '#ffffff',
  };
}
