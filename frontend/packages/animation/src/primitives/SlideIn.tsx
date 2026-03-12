import React from 'react';
import { spring } from 'remotion';
import { useDurationCollector } from '../duration/DurationCollector';
import { useStyleContext } from '../styles/StyleContext';
import { getSpringConfig } from '../styles/easingResolver';
import { usePrimitivePatches } from '../patches/PatchContext';
import { SpacingValue } from '../tokens/spacing';

export type SlideDirection = 'up' | 'down' | 'left' | 'right';

export interface SlideInProps {
  frame: number;
  fps?: number;
  delay?: number;
  duration?: number;
  direction?: SlideDirection;
  distance?: SpacingValue;
  id?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function SlideIn({
  frame,
  fps = 30,
  delay = 0,
  duration = 20,
  direction = 'up',
  distance = 16,
  id,
  children,
  style,
  className,
}: SlideInProps): React.ReactElement {
  const styleConfig = useStyleContext();
  const registerEndFrame = useDurationCollector();
  const { effectiveDelay, effectiveDuration } = usePrimitivePatches(id, { delay, duration });

  registerEndFrame(effectiveDelay + effectiveDuration);

  const springConfig = getSpringConfig(styleConfig.motion, 'entrance');

  const progress = spring({
    frame: frame - effectiveDelay,
    fps,
    config: { damping: springConfig.damping, stiffness: springConfig.stiffness, mass: springConfig.mass ?? 1, overshootClamping: !springConfig.overshoot },
    durationInFrames: effectiveDuration,
  });

  const clamped = Math.max(0, Math.min(1, progress));
  const distancePx = distance * 4;
  const offset = (1 - clamped) * distancePx;

  const translateMap: Record<SlideDirection, string> = {
    up:    `translateY(${offset}px)`,
    down:  `translateY(-${offset}px)`,
    left:  `translateX(${offset}px)`,
    right: `translateX(-${offset}px)`,
  };

  // Strip animated props — animation owns opacity and transform
  const { opacity: _o, transform: _t, ...safeStyle } = style ?? {};

  return (
    <div
      id={id}
      className={className}
      style={{ opacity: clamped, transform: translateMap[direction], ...safeStyle }}
    >
      {children}
    </div>
  );
}
