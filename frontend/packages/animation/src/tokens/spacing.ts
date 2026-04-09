/** Numeric spacing scale. LLM uses these values directly: spacing[4], spacing[8], etc. */
export const SPACING_SCALE = [0, 1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 72, 80, 96] as const;
export type SpacingValue = typeof SPACING_SCALE[number];

/** Allowed spacing values for LLM prompt (a subset for clarity). */
export const PROMPT_SPACING_VALUES: SpacingValue[] = [4, 8, 12, 16, 24, 32, 48, 64, 96];

/** Convert spacing token to CSS pixel value. */
export function spacingToCss(value: SpacingValue): string {
  return `${value * 4}px`;
}
