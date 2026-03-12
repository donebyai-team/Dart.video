import React from 'react';

export type CenterAxis = 'x' | 'y' | 'both';

export interface AbsoluteCenterProps {
  /** Which axis to center on. Default: both. */
  axis?: CenterAxis;
  children: React.ReactNode;
}

/**
 * Centers a child absolutely within its nearest positioned parent.
 */
export function AbsoluteCenter({ axis = 'both', children }: AbsoluteCenterProps): React.ReactElement {
  const style: React.CSSProperties = {
    position: 'absolute',
  };

  if (axis === 'both' || axis === 'x') {
    style.left = '50%';
    style.transform = (style.transform ?? '') + ' translateX(-50%)';
  }
  if (axis === 'both' || axis === 'y') {
    style.top = '50%';
    style.transform = (style.transform ?? '') + ' translateY(-50%)';
  }
  if (axis === 'both') {
    style.transform = 'translate(-50%, -50%)';
  }

  return <div style={style}>{children}</div>;
}
