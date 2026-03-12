import React from 'react';
import { spring } from 'remotion';
import { useDurationCollector } from '../duration/DurationCollector';
import { usePrimitivePatches } from '../patches/PatchContext';
import { useStyleContext } from '../styles/StyleContext';
import { useAspectPreset } from '../styles/AspectPresetContext';
import { useTheme } from '../theme/ThemeContext';
import { getSpringConfig } from '../styles/easingResolver';
import { TypographyVariant } from '../tokens/semantic';
import { resolveTypography } from '../tokens/resolveTypography';

export interface CounterProps {
  frame: number;
  fps?: number;
  delay?: number;
  duration?: number;
  from?: number;
  to: number;
  /** Number format string, e.g. "0,0" | "$0,0" | "0%" */
  format?: string;
  prefix?: string;
  suffix?: string;
  variant?: TypographyVariant; // reserved for future typography styling
  style?: React.CSSProperties;
  className?: string;
  id?: string;
}

function formatNumber(value: number, format?: string, prefix?: string, suffix?: string): string {
  let formatted: string;

  if (!format) {
    formatted = Math.round(value).toString();
  } else if (format.startsWith('$')) {
    formatted = '$' + Math.round(value).toLocaleString();
  } else if (format.endsWith('%')) {
    formatted = Math.round(value) + '%';
  } else if (format.includes(',')) {
    formatted = Math.round(value).toLocaleString();
  } else {
    formatted = Math.round(value).toString();
  }

  return `${prefix ?? ''}${formatted}${suffix ?? ''}`;
}

/**
 * Animated number that counts from one value to another.
 * Spring easing uses counter category — ensures clean landing, no bounce.
 */
export function Counter({
  frame,
  fps = 30,
  delay = 0,
  duration = 45,
  from = 0,
  to,
  format,
  prefix,
  suffix,
  variant = 'heading',
  style,
  className,
  id,
}: CounterProps): React.ReactElement {
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();
  const registerEndFrame = useDurationCollector();

  const { effectiveDelay, effectiveDuration } = usePrimitivePatches(id, { delay, duration });
  const endFrame = effectiveDelay + effectiveDuration;

  registerEndFrame(endFrame);

  const springConfig = getSpringConfig(styleConfig.motion, 'counter');

  const progress = spring({
    frame: frame - effectiveDelay,
    fps,
    config: { damping: springConfig.damping, stiffness: springConfig.stiffness, mass: springConfig.mass ?? 1, overshootClamping: !springConfig.overshoot },
    durationInFrames: effectiveDuration,
  });

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const currentValue = from + (to - from) * clampedProgress;

  return (
    <span
      id={id}
      className={className}
      style={{ ...resolveTypography(variant, styleConfig, theme, preset), ...style }}
    >
      {formatNumber(currentValue, format, prefix, suffix)}
    </span>
  );
}
