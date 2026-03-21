import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { useStyleContext } from '../../styles/StyleContext';
import { getEasing, interpolateWithEasing } from '../../styles/easingResolver';
import { usePrimitivePatches, usePatchedProp, useStyleOverride } from '../../patches/PatchContext';
import { splitStyles, mergeChildStyles } from '../../styles/styleUtils';
import { type Easing } from '../../styles/types';
import { type SlideDirection } from './SlideIn';
import { applySpeedFactor, useSpeedFactor } from '../../duration';

export interface SlideOutProps {
  startAt?: number;
  durationInFrames?: number;
  easing?: Easing;
  to?: SlideDirection;
  distance?: number;
  id?: string;
  asChild?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function SlideOut({
  startAt = 0,
  durationInFrames = 30,
  easing,
  to = 'bottom',
  distance = 100,
  id,
  asChild = false,
  children,
  style,
  className,
}: SlideOutProps): React.ReactElement | null {
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();

  const speedFactor = useSpeedFactor();
  const adjustedStartAt = applySpeedFactor(startAt, speedFactor);
  const adjustedDurationInFrames = applySpeedFactor(durationInFrames, speedFactor);
  

  const { effectiveStartAt, effectiveDurationInFrames } = usePrimitivePatches(id, { startAt: adjustedStartAt, durationInFrames: adjustedDurationInFrames });
  const patchedTo = usePatchedProp<SlideDirection>(id, 'to', to);
  const patchedDistance = usePatchedProp(id, 'distance', distance);
  const styleOverride = useStyleOverride(id);

  const resolvedEasing = easing ?? getEasing(styleConfig.motion, 'exit');

  const progress = interpolateWithEasing(
    frame,
    [effectiveStartAt, effectiveStartAt + effectiveDurationInFrames],
    [0, 1],
    resolvedEasing,
  );

  const offset = patchedDistance * progress;
  const transform = (() => {
    switch (patchedTo) {
      case 'left':   return `translateX(-${offset}px)`;
      case 'right':  return `translateX(${offset}px)`;
      case 'top':    return `translateY(-${offset}px)`;
      case 'bottom': return `translateY(${offset}px)`;
    }
  })();

  if (asChild) {
    if (!React.isValidElement(children)) return null;
    return <span id={id}>{mergeChildStyles(children as React.ReactElement, { transform })}</span>;
  }

  const [wrapperStyle, childStyle] = splitStyles(style);

  return (
    <div id={id} className={className} style={{ ...wrapperStyle, transform, ...styleOverride }}>
      {React.isValidElement(children) ? mergeChildStyles(children as React.ReactElement, childStyle) : children}
    </div>
  );
}
