import { FontSizeToken, FontWeightToken } from './typography';

/** Semantic typography variants. LLM only sees these names. */
export const TYPOGRAPHY_VARIANT_NAMES = ['subheading', 'heading', 'headingLg', 'display', 'displayLg', 'displayXl', 'display2xl'] as const;
export type TypographyVariant = (typeof TYPOGRAPHY_VARIANT_NAMES)[number];

export interface TypographyVariantConfig {
  fontSize: FontSizeToken;
  fontWeight: FontWeightToken;
  lineHeight: number;
}

export const TYPOGRAPHY_VARIANTS: Record<TypographyVariant, TypographyVariantConfig> = {
  // caption:    { fontSize: 'xs',  fontWeight: 'normal',    lineHeight: 1.4 },
  // label:      { fontSize: 'sm',  fontWeight: 'medium',    lineHeight: 1.4 },
  // body:       { fontSize: 'base', fontWeight: 'normal',   lineHeight: 1.6 },
  subheading: { fontSize: 'lg',  fontWeight: 'medium',    lineHeight: 1.4 },
  heading:    { fontSize: '2xl', fontWeight: 'bold',      lineHeight: 1.1 },
  headingLg:  { fontSize: '3xl', fontWeight: 'bold',      lineHeight: 1.1 },
  display:    { fontSize: '4xl', fontWeight: 'extrabold', lineHeight: 1.0 },
  displayLg:  { fontSize: '5xl', fontWeight: 'extrabold', lineHeight: 1.0 },
  displayXl:  { fontSize: '6xl', fontWeight: 'extrabold', lineHeight: 1.0 },
  display2xl: { fontSize: '7xl', fontWeight: 'extrabold', lineHeight: 1.0 },
};
