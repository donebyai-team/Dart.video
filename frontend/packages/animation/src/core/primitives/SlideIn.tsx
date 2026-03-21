import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { useDurationCollector } from '../../duration/DurationCollector';
import { useStyleContext } from '../../styles/StyleContext';
import { getEasing, interpolateWithEasing } from '../../styles/easingResolver';
import { usePrimitivePatches, usePatchedProp, useStyleOverride } from '../../patches/PatchContext';
import { splitStyles, mergeChildStyles } from '../../styles/styleUtils';
import { type Easing } from '../../styles/types';
import { applySpeedFactor, useSpeedFactor } from '../../duration';

export type SlideDirection = 'left' | 'right' | 'top' | 'bottom';

export interface SlideInProps {
  startAt?: number;
  durationInFrames?: number;
  easing?: Easing;
  from?: SlideDirection;
  distance?: number;
  id?: string;
  asChild?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function SlideIn({
  startAt = 0,
  durationInFrames = 30,
  easing,
  from = 'bottom',
  distance = 100,
  id,
  asChild = false,
  children,
  style,
  className,
}: SlideInProps): React.ReactElement | null {
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();

  const speedFactor = useSpeedFactor();
  const adjustedStartAt = applySpeedFactor(startAt, speedFactor);
  const adjustedDurationInFrames = applySpeedFactor(durationInFrames, speedFactor);


  const { effectiveStartAt, effectiveDurationInFrames } = usePrimitivePatches(id, { startAt: adjustedStartAt, durationInFrames: adjustedDurationInFrames });
  const patchedFrom = usePatchedProp<SlideDirection>(id, 'from', from);
  const patchedDistance = usePatchedProp(id, 'distance', distance);
  const styleOverride = useStyleOverride(id);


  const resolvedEasing = easing ?? getEasing(styleConfig.motion, 'entrance');

  const progress = interpolateWithEasing(
    frame,
    [effectiveStartAt, effectiveStartAt + effectiveDurationInFrames],
    [0, 1],
    resolvedEasing,
  );

  const offset = patchedDistance * (1 - progress);
  const transform = (() => {
    switch (patchedFrom) {
      case 'left':   return `translateX(-${offset}px)`;
      case 'right':  return `translateX(${offset}px)`;
      case 'top':    return `translateY(-${offset}px)`;
      case 'bottom': return `translateY(${offset}px)`;
    }
  })();

  const animationStyle: React.CSSProperties = { transform };

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
