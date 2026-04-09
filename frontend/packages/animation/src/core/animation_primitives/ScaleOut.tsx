import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useStyleContext } from '../../styles/StyleContext';
import { interpolateWithEasing } from '../../styles/easingResolver';
import { usePrimitivePatches, useStyleOverride } from '../../patches/PatchContext';
import { splitStyles, mergeChildStyles } from '../../styles/styleUtils';
import { type Easing } from '../../styles/types';
import { applySpeedFactor, useSpeedFactor } from '../../duration';

export interface ScaleOutProps {
  startAt?: number;
  durationInFrames?: number;
  easing?: Easing;
  finalScale?: number;
  id?: string;
  asChild?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function ScaleOut({
  startAt = 0,
  durationInFrames = 30,
  easing,
  finalScale = 0,
  id,
  asChild = false,
  children,
  style,
  className,
}: ScaleOutProps): React.ReactElement | null {
  const frame = useCurrentFrame();

  const speedFactor = useSpeedFactor();
  const adjustedStartAt = applySpeedFactor(startAt, speedFactor);
  const adjustedDurationInFrames = applySpeedFactor(durationInFrames, speedFactor);
  

  const { effectiveStartAt, effectiveDurationInFrames } = usePrimitivePatches(id, { startAt: adjustedStartAt, durationInFrames: adjustedDurationInFrames });
  const styleOverride = useStyleOverride(id);

  const scale = interpolateWithEasing(
    frame,
    [effectiveStartAt, effectiveStartAt + effectiveDurationInFrames],
    [1, finalScale],
    'ease-in',
  );

  if (asChild) {
    if (!React.isValidElement(children)) return null;
    return <span id={id}>{mergeChildStyles(children as React.ReactElement, { transform: `scale(${Math.max(0, scale)})` })}</span>;
  }

  const [wrapperStyle, childStyle] = splitStyles(style);

  return (
    <div id={id} className={className} style={{ ...wrapperStyle, transform: `scale(${Math.max(0, scale)})`, ...styleOverride }}>
      {React.isValidElement(children) ? mergeChildStyles(children as React.ReactElement, childStyle) : children}
    </div>
  );
}
