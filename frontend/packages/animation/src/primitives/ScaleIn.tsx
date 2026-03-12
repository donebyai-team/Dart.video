import React from 'react';
import { spring } from 'remotion';
import { useDurationCollector } from '../duration/DurationCollector';
import { useStyleContext } from '../styles/StyleContext';
import { getSpringConfig } from '../styles/easingResolver';
import { usePrimitivePatches } from '../patches/PatchContext';

export type ScaleOrigin = 'center' | 'top' | 'bottom' | 'left' | 'right';

export interface ScaleInProps {
  frame: number;
  fps?: number;
  delay?: number;
  duration?: number;
  origin?: ScaleOrigin;
  id?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export const TRANSFORM_ORIGIN_MAP: Record<ScaleOrigin, string> = {
  center: 'center center',
  top:    'center top',
  bottom: 'center bottom',
  left:   'left center',
  right:  'right center',
};

export function ScaleIn({
  frame,
  fps = 30,
  delay = 0,
  duration = 20,
  origin = 'center',
  id,
  children,
  style,
  className,
}: ScaleInProps): React.ReactElement {
  const styleConfig = useStyleContext();
  const registerEndFrame = useDurationCollector();
  const { effectiveDelay, effectiveDuration } = usePrimitivePatches(id, { delay, duration });

  registerEndFrame(effectiveDelay + effectiveDuration);

  const springConfig = getSpringConfig(styleConfig.motion, 'entrance');

  const scale = spring({
    frame: frame - effectiveDelay,
    fps,
    config: { damping: springConfig.damping, stiffness: springConfig.stiffness, mass: springConfig.mass ?? 1, overshootClamping: !springConfig.overshoot },
    durationInFrames: effectiveDuration,
  });

  const { transform: _t, transformOrigin: _to, ...safeStyle } = style ?? {};

  return (
    <div
      id={id}
      className={className}
      style={{
        transform: `scale(${Math.max(0, Math.min(1, scale))})`,
        transformOrigin: TRANSFORM_ORIGIN_MAP[origin],
        ...safeStyle,
      }}
    >
      {children}
    </div>
  );
}
