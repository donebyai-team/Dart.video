import React from 'react';
import { useDurationCollector } from '../duration/DurationCollector';
import { usePrimitivePatches } from '../patches/PatchContext';
import { useStyleContext } from '../styles/StyleContext';
import { useAspectPreset } from '../styles/AspectPresetContext';
import { useTheme } from '../theme/ThemeContext';
import { TypographyVariant } from '../tokens/semantic';
import { resolveTypography } from '../tokens/resolveTypography';

export type TypewriterMode = 'char' | 'word' | 'line';

export interface TypewriterProps {
  frame: number;
  delay?: number;
  /** Total duration for full text reveal in frames. */
  duration?: number;
  text: string;
  mode?: TypewriterMode;
  variant?: TypographyVariant;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
}

/**
 * Reveals text progressively.
 * Cursor appearance (shape, behavior) driven by StyleContext.cursor.
 * No Remotion imports needed — all animation math is internal.
 */
export function Typewriter({
  frame,
  delay = 0,
  duration = 60,
  text,
  mode = 'char',
  variant = 'body',
  style,
  className,
  id,
}: TypewriterProps): React.ReactElement {
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();
  const registerEndFrame = useDurationCollector();

  const { effectiveDelay, effectiveDuration } = usePrimitivePatches(id, { delay, duration });
  const endFrame = effectiveDelay + effectiveDuration;

  registerEndFrame(endFrame);

  const elapsed = Math.max(0, frame - effectiveDelay);
  const progress = effectiveDuration > 0 ? Math.min(1, elapsed / effectiveDuration) : 1;

  let visibleText: string;

  if (mode === 'char') {
    const charsToShow = Math.floor(progress * text.length);
    visibleText = text.slice(0, charsToShow);
  } else if (mode === 'word') {
    const words = text.split(' ');
    const wordsToShow = Math.floor(progress * words.length);
    visibleText = words.slice(0, wordsToShow).join(' ');
  } else {
    // line mode
    const lines = text.split('\n');
    const linesToShow = Math.floor(progress * lines.length);
    visibleText = lines.slice(0, linesToShow).join('\n');
  }

  const { cursor } = styleConfig;

  const cursorCharMap: Record<string, string> = {
    line: '|',
    underscore: '_',
    block: '█',
    none: '',
  };

  const cursorChar = cursorCharMap[cursor.shape] ?? '';
  const showCursor = cursor.shape !== 'none' && frame >= effectiveDelay;

  // Blink: toggle every 15 frames
  const cursorVisible =
    cursor.behavior === 'solid'
      ? true
      : cursor.behavior === 'fade'
      ? Math.sin((frame * Math.PI) / 15) > 0
      : Math.floor(frame / 15) % 2 === 0;

  return (
    <span
      id={id}
      className={className}
      style={{ ...resolveTypography(variant, styleConfig, theme, preset), ...style }}
    >
      {visibleText}
      {showCursor && cursorChar && (
        <span style={{ opacity: cursorVisible ? 1 : 0 }}>{cursorChar}</span>
      )}
    </span>
  );
}
