/** Named color token pairs. Background + foreground always come together. */
export type ColorTokenName =
  | 'background'
  | 'foreground'
  | 'card'
  | 'cardForeground'
  | 'popover'
  | 'popoverForeground'
  | 'primary'
  | 'primaryForeground'
  | 'secondary'
  | 'secondaryForeground'
  | 'muted'
  | 'mutedForeground'
  | 'accent'
  | 'accentForeground'
  | 'destructive'
  | 'destructiveForeground'
  | 'border'
  | 'input'
  | 'ring'
  | 'success'
  | 'successForeground'
  | 'warning'
  | 'warningForeground'
  | 'info'
  | 'infoForeground';

export type ColorTokens = Record<ColorTokenName, string>;
