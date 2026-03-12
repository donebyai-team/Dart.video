import React from 'react';
import { spring } from 'remotion';
import { useDurationCollector } from '../duration/DurationCollector';
import { useStyleContext } from '../styles/StyleContext';
import { getSpringConfig } from '../styles/easingResolver';
import { usePrimitivePatches } from '../patches/PatchContext';
import { ScaleOrigin, TRANSFORM_ORIGIN_MAP } from './ScaleIn';

export interface ScaleOutProps {
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

export function ScaleOut({
  frame,
  fps = 30,
  delay = 0,
  duration = 15,
  origin = 'center',
  id,
  children,
  style,
  className,
}: ScaleOutProps): React.ReactElement {
  const styleConfig = useStyleContext();
  const registerEndFrame = useDurationCollector();
  const { effectiveDelay, effectiveDuration } = usePrimitivePatches(id, { delay, duration });

  registerEndFrame(effectiveDelay + effectiveDuration);

  const springConfig = getSpringConfig(styleConfig.motion, 'exit');

  const progress = spring({
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
        transform: `scale(${1 - Math.max(0, Math.min(1, progress))})`,
        transformOrigin: TRANSFORM_ORIGIN_MAP[origin],
        ...safeStyle,
      }}
    >
      {children}
    </div>
  );
}
