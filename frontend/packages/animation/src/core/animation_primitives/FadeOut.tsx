import React from 'react';
import { useCurrentFrame } from 'remotion';
import { interpolateWithEasing } from '../../styles/easingResolver';
import { usePrimitivePatches, useStyleOverride } from '../../patches/PatchContext';
import { splitStyles, mergeChildStyles } from '../../styles/styleUtils';
import { type Easing } from '../../styles/types';
import { applySpeedFactor, useSpeedFactor } from '../../duration';

export interface FadeOutProps {
  startAt?: number;
  durationInFrames?: number;
  easing?: Easing;
  id?: string;
  asChild?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function FadeOut({
  startAt = 0,
  durationInFrames = 30,
  easing,
  id,
  asChild = false,
  children,
  style,
  className,
}: FadeOutProps): React.ReactElement | null {
  const frame = useCurrentFrame();

  const speedFactor = useSpeedFactor();
  const adjustedStartAt = applySpeedFactor(startAt, speedFactor);
  const adjustedDurationInFrames = applySpeedFactor(durationInFrames, speedFactor);

  const { effectiveStartAt, effectiveDurationInFrames } = usePrimitivePatches(id, { startAt: adjustedStartAt, durationInFrames: adjustedDurationInFrames });
  const styleOverride = useStyleOverride(id);

  const opacity = interpolateWithEasing(
    frame,
    [effectiveStartAt, effectiveStartAt + effectiveDurationInFrames],
    [1, 0],
    'ease-in',
  );

  const animationStyle: React.CSSProperties = { opacity };

  if (asChild) {
    if (!React.isValidElement(children)) return null;
    return <span id={id}>{mergeChildStyles(children as React.ReactElement, animationStyle)}</span>;
  }

  const [wrapperStyle, childStyle] = splitStyles(style);

  return (
    <div id={id} className={className} style={{ ...wrapperStyle, ...animationStyle, ...styleOverride }}>
      {React.isValidElement(children) ? mergeChildStyles(children as React.ReactElement, childStyle) : children}
    </div>
  );
}
