import { BrandTheme } from './types';

/** Neutral light brand — white canvas, near-black text. */
export const lightTheme: BrandTheme = {
  primary:   '#18181b',
  secondary: '#6366f1',
  bg:        '#ffffff',
  text:      '#0a0a0a',
};

/** Dark brand — near-black canvas, white text, indigo accent. */
export const darkTheme: BrandTheme = {
  primary:   '#6366f1',
  secondary: '#a5b4fc',
  bg:        '#0a0a0a',
  text:      '#fafafa',
};

/** Default — same as light. */
export const defaultTheme: BrandTheme = lightTheme;
