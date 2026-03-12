import React from 'react';
import { spring } from 'remotion';
import { useDurationCollector } from '../duration/DurationCollector';
import { useStyleContext } from '../styles/StyleContext';
import { getSpringConfig } from '../styles/easingResolver';
import { usePrimitivePatches } from '../patches/PatchContext';

export interface FadeInProps {
  frame: number;
  /** Frames per second of the composition. Defaults to 30. */
  fps?: number;
  delay?: number;
  duration?: number;
  /** Injected by compiler AST pass. Forwarded to DOM for click-to-toolbar. */
  id?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Animates opacity from 0 to 1.
 * Easing driven by StyleContext.motion.entrance — LLM has no easing control.
 * Primitives are the only layer that imports from Remotion. LLM-generated code never does.
 */
export function FadeIn({
  frame,
  fps = 30,
  delay = 0,
  duration = 20,
  id,
  children,
  style,
  className,
}: FadeInProps): React.ReactElement {
  const styleConfig = useStyleContext();
  const registerEndFrame = useDurationCollector();
  const { effectiveDelay, effectiveDuration } = usePrimitivePatches(id, { delay, duration });

  registerEndFrame(effectiveDelay + effectiveDuration);

  const springConfig = getSpringConfig(styleConfig.motion, 'entrance');

  const opacity = spring({
    frame: frame - effectiveDelay,
    fps,
    config: { damping: springConfig.damping, stiffness: springConfig.stiffness, mass: springConfig.mass ?? 1, overshootClamping: !springConfig.overshoot },
    durationInFrames: effectiveDuration,
  });

  // Strip opacity from consumer style — animation owns it
  const { opacity: _o, ...safeStyle } = style ?? {};

  return (
    <div
      id={id}
      className={className}
      style={{ opacity: Math.max(0, Math.min(1, opacity)), ...safeStyle }}
    >
      {children}
    </div>
  );
}
