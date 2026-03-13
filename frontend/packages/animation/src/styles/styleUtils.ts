import React from 'react';

/**
 * CSS properties that control layout and positioning.
 * These go on the animation wrapper div, not the child.
 */
const layoutKeys = new Set([
  'position', 'top', 'left', 'right', 'bottom', 'zIndex',
  'transform', 'pointerEvents', 'inset',
  'insetBlock', 'insetBlockEnd', 'insetBlockStart',
  'insetInline', 'insetInlineEnd', 'insetInlineStart',
] as const);

/**
 * Splits CSS properties into [wrapperStyle, childStyle].
 * Layout/positioning styles go on the wrapper; visual styles pass through to children.
 */
export function splitStyles(style: React.CSSProperties = {}): [React.CSSProperties, React.CSSProperties] {
  const wrapper: React.CSSProperties = {};
  const child: React.CSSProperties = {};
  for (const [key, value] of Object.entries(style)) {
    if (layoutKeys.has(key as any)) {
      (wrapper as any)[key] = value;
    } else {
      (child as any)[key] = value;
    }
  }
  return [wrapper, child];
}

/**
 * Merges animation styles into a child element via cloneElement (asChild mode).
 * Child's own styles take precedence over animation styles.
 */
export function mergeChildStyles(
  child: React.ReactElement,
  animationStyle: React.CSSProperties,
): React.ReactElement {
  const existing = (child.props as any).style ?? {};
  return React.cloneElement(child, { style: { ...animationStyle, ...existing } } as any);
}
