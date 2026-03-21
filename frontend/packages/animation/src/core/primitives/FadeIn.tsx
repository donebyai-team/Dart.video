import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { useStyleContext } from '../../styles/StyleContext';
import { getEasing, interpolateWithEasing } from '../../styles/easingResolver';
import { usePrimitivePatches, useStyleOverride } from '../../patches/PatchContext';
import { splitStyles, mergeChildStyles } from '../../styles/styleUtils';
import { type Easing } from '../../styles/types';
import { applySpeedFactor, useSpeedFactor } from '../../duration';

export interface FadeInProps {
  startAt?: number;
  durationInFrames?: number;
  easing?: Easing;
  /** Injected by compiler AST pass. Forwarded to DOM for click-to-toolbar. */
  id?: string;
  /** Merge animation directly into child instead of wrapping in a div. Requires one child element. */
  asChild?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function FadeIn({
  startAt = 0,
  durationInFrames = 30,
  easing,
  id,
  asChild = false,
  children,
  style,
  className,
}: FadeInProps): React.ReactElement | null {
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();

  const speedFactor = useSpeedFactor();
  const adjustedStartAt = applySpeedFactor(startAt, speedFactor);
  const adjustedDurationInFrames = applySpeedFactor(durationInFrames, speedFactor);

  const { effectiveStartAt, effectiveDurationInFrames } = usePrimitivePatches(id, { startAt: adjustedStartAt, durationInFrames: adjustedDurationInFrames });
  const styleOverride = useStyleOverride(id);


  const resolvedEasing = easing ?? getEasing(styleConfig.motion, 'entrance');

  const opacity = interpolateWithEasing(
    frame,
    [effectiveStartAt, effectiveStartAt + effectiveDurationInFrames],
    [0, 1],
    resolvedEasing,
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
