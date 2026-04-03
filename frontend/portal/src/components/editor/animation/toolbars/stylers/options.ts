import { FONT_WEIGHT_VALUES } from '@coasterai/animation'

// ─── Style Override Section ──────────────────────────────────────────────────
// Collapsible section that shows common style controls for any visual element.
// Always available for text-related components. Collapsed by default per spec.
//
// Token values sourced from @coasterai/animation/tokens:
//   FontWeightToken: thin=100, light=300, normal=400, medium=500, semibold=600, bold=700, extrabold=800
//   LetterSpacing:   tight=-0.025em, normal=0, wide=0.025em (maps to StyleConfig.type.tracking)

/** Font weight options derived from animation token FONT_WEIGHT_VALUES. */
export const FONT_WEIGHT_OPTIONS = Object.entries(FONT_WEIGHT_VALUES).map(([key, value]) => ({
  label: key.charAt(0).toUpperCase() + key.slice(1),
  value: String(value),
}))

/** Letter spacing options matching StyleConfig.type.tracking token. */
export const LETTER_SPACING_OPTIONS = [
  { label: 'Tight', value: '-0.025em' },
  { label: 'Normal', value: '0em' },
  { label: 'Wide', value: '0.025em' },
]

// ─── Utility: toHex ─────────────────────────────────────────────────────────

export function toHex(color: unknown): string {
  if (!color || typeof color !== 'string') return '#ffffff'
    const c = color.trim()
    if (c.startsWith('#')) return c.slice(0, 7)
    const m = c.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (m)
      return (
        '#' +
        [m[1], m[2], m[3]]
          .map(n => parseInt(n).toString(16).padStart(2, '0'))
          .join('')
      )
    return '#ffffff'
  }