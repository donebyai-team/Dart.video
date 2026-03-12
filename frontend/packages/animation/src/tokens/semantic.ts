import { FontSizeToken, FontWeightToken } from './typography';

/** Semantic typography variants. LLM only sees these names. */
export type TypographyVariant = 'caption' | 'label' | 'body' | 'subheading' | 'heading' | 'display';

export interface TypographyVariantConfig {
  fontSize: FontSizeToken;
  fontWeight: FontWeightToken;
  lineHeight: number;
}

export const TYPOGRAPHY_VARIANTS: Record<TypographyVariant, TypographyVariantConfig> = {
  caption:    { fontSize: 'xs',  fontWeight: 'normal',    lineHeight: 1.4 },
  label:      { fontSize: 'sm',  fontWeight: 'medium',    lineHeight: 1.4 },
  body:       { fontSize: 'base', fontWeight: 'normal',   lineHeight: 1.6 },
  subheading: { fontSize: 'lg',  fontWeight: 'medium',    lineHeight: 1.4 },
  heading:    { fontSize: '2xl', fontWeight: 'bold',      lineHeight: 1.1 },
  display:    { fontSize: '4xl', fontWeight: 'extrabold', lineHeight: 1.0 },
};
