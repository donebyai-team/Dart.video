import React from 'react';

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
