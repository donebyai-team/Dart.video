import React from 'react';
import { spring } from 'remotion';
import { useDurationCollector } from '../duration/DurationCollector';
import { useStyleContext } from '../styles/StyleContext';
import { getSpringConfig } from '../styles/easingResolver';
import { usePrimitivePatches } from '../patches/PatchContext';
import { SpacingValue } from '../tokens/spacing';
import { SlideDirection } from './SlideIn';

export interface SlideOutProps {
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

export function SlideOut({
  frame,
  fps = 30,
  delay = 0,
  duration = 15,
  direction = 'up',
  distance = 16,
  id,
  children,
  style,
  className,
}: SlideOutProps): React.ReactElement {
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

  const clamped = Math.max(0, Math.min(1, progress));
  const distancePx = distance * 4;
  const offset = clamped * distancePx;

  const translateMap: Record<SlideDirection, string> = {
    up:    `translateY(-${offset}px)`,
    down:  `translateY(${offset}px)`,
    left:  `translateX(-${offset}px)`,
    right: `translateX(${offset}px)`,
  };

  const { opacity: _o, transform: _t, ...safeStyle } = style ?? {};

  return (
    <div
      id={id}
      className={className}
      style={{ opacity: 1 - clamped, transform: translateMap[direction], ...safeStyle }}
    >
      {children}
    </div>
  );
}
