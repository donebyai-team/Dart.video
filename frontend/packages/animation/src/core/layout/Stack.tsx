import React from 'react';
import { SpacingValue } from '../../tokens/spacing';

export type StackAlign = 'flex-start' | 'center' | 'flex-end' | 'stretch';
export type StackJustify = 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';

export interface StackProps {
  /** Gap between children — must come from spacing tokens. */
  gap?: SpacingValue;
  align?: StackAlign;
  justify?: StackJustify;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * Vertical flex layout. Gap must use spacing token values.
 */
export function Stack({
  gap = 0,
  align = 'flex-start',
  justify = 'flex-start',
  style,
  children,
}: StackProps): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: `${gap * 4}px`,
        alignItems: align,
        justifyContent: justify,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
