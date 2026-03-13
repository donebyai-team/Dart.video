import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { useDurationCollector } from '../../duration/DurationCollector';
import { useStyleContext } from '../../styles/StyleContext';
import { getEasing, interpolateWithEasing } from '../../styles/easingResolver';
import { usePrimitivePatches, useStyleOverride } from '../../patches/PatchContext';
import { splitStyles, mergeChildStyles } from '../../styles/styleUtils';
import { type Easing } from '../../styles/types';

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
  const styleConfig = useStyleContext();
  const registerEndFrame = useDurationCollector();
  const { effectiveStartAt, effectiveDurationInFrames } = usePrimitivePatches(id, { startAt, durationInFrames });
  const styleOverride = useStyleOverride(id);

  useMemo(() => { registerEndFrame(effectiveStartAt + effectiveDurationInFrames); }, [effectiveStartAt, effectiveDurationInFrames]);

  const resolvedEasing = easing ?? getEasing(styleConfig.motion, 'exit');

  const scale = interpolateWithEasing(
    frame,
    [effectiveStartAt, effectiveStartAt + effectiveDurationInFrames],
    [1, finalScale],
    resolvedEasing,
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
