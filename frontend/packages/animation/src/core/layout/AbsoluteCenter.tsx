import React from 'react';
import { useAspectPreset } from '../../styles';

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
  const preset = useAspectPreset();
  // const defaultWidth = preset.width * 0.75;
  const defaultWidth = preset.width;

  const style: React.CSSProperties = { position: 'absolute' };

  if (axis === 'both') {
    style.left = '50%';
    style.top = '50%';
    style.transform = 'translate(-50%, -50%)';
  } else if (axis === 'x') {
    style.left = '50%';
    style.transform = 'translateX(-50%)';
  } else if (axis === 'y') {
    style.top = '50%';
    style.transform = 'translateY(-50%)';
  }

  return (
    <div style={{ ...style, width: defaultWidth, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {children}
    </div>
  );
}
