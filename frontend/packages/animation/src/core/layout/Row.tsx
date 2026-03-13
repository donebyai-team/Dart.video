import React from 'react';
import { SpacingValue } from '../../tokens/spacing';

export type RowAlign = 'flex-start' | 'center' | 'flex-end' | 'stretch';
export type RowJustify = 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';

export interface RowProps {
  /** Gap between children — must come from spacing tokens. */
  gap?: SpacingValue;
  align?: RowAlign;
  justify?: RowJustify;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * Horizontal flex layout. Gap must use spacing token values.
 */
export function Row({
  gap = 0,
  align = 'center',
  justify = 'flex-start',
  style,
  children,
}: RowProps): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
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
