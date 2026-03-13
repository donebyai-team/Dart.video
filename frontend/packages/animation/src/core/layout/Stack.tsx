import React from 'react';
import { SpacingValue } from '../../tokens/spacing';

export type StackAlign = 'start' | 'center' | 'end' | 'stretch';
export type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

export interface StackProps {
  /** Gap between children — must come from spacing tokens. */
  children: React.ReactNode;
  direction?: 'row' | 'column';
  wrap?: boolean;
  className?: string;
  style?: React.CSSProperties;

  /** Gap between children — must come from spacing tokens. */
  gap?: SpacingValue;
  align?: StackAlign;
  justify?: StackJustify;
}

/**
 * Vertical flex layout. Gap must use spacing token values.
 */
export function Stack({
  direction = 'column',
  gap = 0,
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className,
  style,
  children,
}: StackProps): React.ReactElement {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: direction,
        gap: `${gap}px`,
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? 'wrap' : 'nowrap',
        ...style,
      }}
    >
      {children}
    </div>

  );
}
