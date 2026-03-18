import { BrandTheme } from './types';

/** Neutral light brand — white canvas, near-black text. */
export const lightTheme: BrandTheme = {
  primary:   '#18181b',
  secondary: '#6366f1',
  accent:    '#D97706', // slightly darker orange
  bg:        '#f8fafc', // ✅ not pure white (very light neutral)
  text:      '#0a0a0a', // ok for fallback
};

/** Dark brand — near-black canvas, white text, indigo accent. */
export const darkTheme: BrandTheme = {
  primary:   '#6366f1',
  secondary: '#a5b4fc',
  accent:    '#F59E0B', // already correct
  bg:        '#0a0a0a',
  text:      '#fafafa',
};

/** Default — same as light. */
export const defaultTheme: BrandTheme = lightTheme;
