import React from 'react';
import { spring } from 'remotion';
import { useDurationCollector } from '../duration/DurationCollector';
import { useStyleContext } from '../styles/StyleContext';
import { getSpringConfig } from '../styles/easingResolver';
import { usePrimitivePatches } from '../patches/PatchContext';

export interface FadeOutProps {
  frame: number;
  fps?: number;
  delay?: number;
  duration?: number;
  id?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function FadeOut({
  frame,
  fps = 30,
  delay = 0,
  duration = 15,
  id,
  children,
  style,
  className,
}: FadeOutProps): React.ReactElement {
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

  const { opacity: _o, ...safeStyle } = style ?? {};

  return (
    <div
      id={id}
      className={className}
      style={{ opacity: 1 - Math.max(0, Math.min(1, progress)), ...safeStyle }}
    >
      {children}
    </div>
  );
}
