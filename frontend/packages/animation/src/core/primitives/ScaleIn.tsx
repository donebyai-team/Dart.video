import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { useDurationCollector } from '../../duration/DurationCollector';
import { useStyleContext } from '../../styles/StyleContext';
import { getEasing, interpolateWithEasing } from '../../styles/easingResolver';
import { usePrimitivePatches, useStyleOverride } from '../../patches/PatchContext';
import { splitStyles, mergeChildStyles } from '../../styles/styleUtils';
import { type Easing } from '../../styles/types';

export interface ScaleInProps {
  startAt?: number;
  durationInFrames?: number;
  easing?: Easing;
  initialScale?: number;
  id?: string;
  asChild?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function ScaleIn({
  startAt = 0,
  durationInFrames = 30,
  easing,
  initialScale = 0,
  id,
  asChild = false,
  children,
  style,
  className,
}: ScaleInProps): React.ReactElement | null {
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();
  const registerEndFrame = useDurationCollector();
  const { effectiveStartAt, effectiveDurationInFrames } = usePrimitivePatches(id, { startAt, durationInFrames });
  const styleOverride = useStyleOverride(id);

  useMemo(() => { registerEndFrame(effectiveStartAt + effectiveDurationInFrames); }, [effectiveStartAt, effectiveDurationInFrames]);

  const resolvedEasing = easing ?? getEasing(styleConfig.motion, 'entrance');

  const scale = interpolateWithEasing(
    frame,
    [effectiveStartAt, effectiveStartAt + effectiveDurationInFrames],
    [initialScale, 1],
    resolvedEasing,
  );

  const animationStyle: React.CSSProperties = { transform: `scale(${Math.max(0, scale)})` };

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
