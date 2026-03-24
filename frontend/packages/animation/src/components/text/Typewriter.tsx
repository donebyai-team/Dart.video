import React from 'react';
import { useCurrentFrame } from 'remotion';
import { usePrimitivePatches, usePatchedProp, useStyleOverride } from '../../patches/PatchContext';
import { useStyleContext } from '../../styles/StyleContext';
import { useAspectPreset } from '../../styles/AspectPresetContext';
import { useTheme } from '../../theme/ThemeContext';
import { interpolateWithEasing } from '../../styles/easingResolver';
import { TypographyVariant } from '../../tokens/semantic';
import { resolveTypography } from '../../tokens/resolveTypography';
import { applySpeedFactor, useSpeedFactor } from '../../duration';

export type TypewriterMode = 'char' | 'word' | 'line';

export interface TypewriterProps {
  startAt?: number;
  /** Total duration for full text reveal in frames. */
  durationInFrames?: number;
  text: string;
  mode?: TypewriterMode;
  variant?: TypographyVariant;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
}

/**
 * Reveals text progressively using linear easing.
 * Cursor appearance (shape, behavior) driven by StyleContext.cursor.
 */
export function Typewriter({
  startAt = 0,
  durationInFrames = 60,
  text,
  mode = 'char',
  variant = 'body',
  style,
  className,
  id,
}: TypewriterProps): React.ReactElement {
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();

  const speedFactor = useSpeedFactor();
  const adjustedStartAt = applySpeedFactor(startAt, speedFactor);
  const adjustedDurationInFrames = applySpeedFactor(durationInFrames, speedFactor);

  const { effectiveStartAt, effectiveDurationInFrames } = usePrimitivePatches(id, { startAt: adjustedStartAt, durationInFrames: adjustedDurationInFrames });

  const patchedText = usePatchedProp(id, 'text', text);
  const patchedMode = usePatchedProp<TypewriterMode>(id, 'mode', mode);
  const patchedVariant = usePatchedProp<TypographyVariant>(id, 'variant', variant);
  const styleOverride = useStyleOverride(id);

  const progress = interpolateWithEasing(
    frame,
    [effectiveStartAt, effectiveStartAt + effectiveDurationInFrames],
    [0, 1],
    'linear',
  );

  let visibleText: string;
  if (patchedMode === 'char') {
    visibleText = patchedText.slice(0, Math.floor(progress * patchedText.length));
  } else if (patchedMode === 'word') {
    const words = patchedText.split(' ');
    visibleText = words.slice(0, Math.floor(progress * words.length)).join(' ');
  } else {
    const lines = patchedText.split('\n');
    visibleText = lines.slice(0, Math.floor(progress * lines.length)).join('\n');
  }

  const { cursor } = styleConfig;
  const cursorCharMap: Record<string, string> = {
    line: '|', underscore: '_', block: '█', none: '',
  };
  const cursorChar = cursorCharMap[cursor.shape] ?? '';
  const showCursor = cursor.shape !== 'none' && frame >= effectiveStartAt;
  const cursorVisible =
    cursor.behavior === 'solid' ? true
    : cursor.behavior === 'fade' ? Math.sin((frame * Math.PI) / 15) > 0
    : Math.floor(frame / 15) % 2 === 0;

  return (
    <span
      id={id}
      className={className}
      style={{ ...resolveTypography(patchedVariant, styleConfig, theme, preset), ...style, ...styleOverride }}
    >
      {visibleText}
      {showCursor && cursorChar && (
        <span style={{ opacity: cursorVisible ? 1 : 0 }}>{cursorChar}</span>
      )}
    </span>
  );
}
