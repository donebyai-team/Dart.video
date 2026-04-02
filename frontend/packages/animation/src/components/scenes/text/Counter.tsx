import React from 'react';
import { useCurrentFrame } from 'remotion';
import { usePrimitivePatches, usePatchedProp, useStyleOverride } from '../../../patches/PatchContext';
import { useStyleContext } from '../../../styles/StyleContext';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { useTheme } from '../../../theme/ThemeContext';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { type Easing } from '../../../styles/types';
import { TypographyVariant } from '../../../tokens/semantic';
import { resolveTypography } from '../../../tokens/resolveTypography';
import { applySpeedFactor, useSpeedFactor } from '../../../duration';

export interface CounterProps {
  startAt?: number;
  durationInFrames?: number;
  easing?: Easing;
  from?: number;
  to: number;
  /** Number format string, e.g. "0,0" | "$0,0" | "0%" */
  format?: string;
  prefix?: string;
  suffix?: string;
  variant?: TypographyVariant;
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
 * Easing driven by StyleContext.motion.counter — ensures clean landing, no bounce.
 */
export function Counter({
  startAt = 0,
  durationInFrames = 45,
  easing,
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
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();

  const speedFactor = useSpeedFactor();
  const adjustedStartAt = applySpeedFactor(startAt, speedFactor);
  const adjustedDurationInFrames = applySpeedFactor(durationInFrames, speedFactor);


  const { effectiveStartAt, effectiveDurationInFrames } = usePrimitivePatches(id, { startAt: adjustedStartAt, durationInFrames: adjustedDurationInFrames });

  const patchedFrom = usePatchedProp(id, 'from', from);
  const patchedTo = usePatchedProp(id, 'to', to);
  const patchedFormat = usePatchedProp(id, 'format', format);
  const patchedPrefix = usePatchedProp(id, 'prefix', prefix);
  const patchedSuffix = usePatchedProp(id, 'suffix', suffix);
  const patchedVariant = usePatchedProp<TypographyVariant>(id, 'variant', variant);
  const styleOverride = useStyleOverride(id);

  const progress = interpolateWithEasing(
    frame,
    [effectiveStartAt, effectiveStartAt + effectiveDurationInFrames],
    [0, 1],
    'ease-out',
  );

  const currentValue = patchedFrom + (patchedTo - patchedFrom) * progress;

  return (
    <span
      id={id}
      className={className}
      style={{ ...resolveTypography(patchedVariant, styleConfig, theme, preset), ...style, ...styleOverride }}
    >
      {formatNumber(currentValue, patchedFormat, patchedPrefix, patchedSuffix)}
    </span>
  );
}
