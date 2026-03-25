import React from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { usePrimitivePatches, usePatchedProp, useStyleOverride } from '../../../patches/PatchContext';
import { useStyleContext } from '../../../styles/StyleContext';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { useTheme } from '../../../theme/ThemeContext';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { TypographyVariant, TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens/semantic';
import { resolveTypography } from '../../../tokens/resolveTypography';
import { applySpeedFactor, useSpeedFactor } from '../../../duration';
import { EntranceAnimation, getEntranceTransform, ENTRANCE_ANIMATIONS } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../durationTypes';

// Default duration constants
const DEFAULT_ENTRANCE_DURATION = 20;
const DEFAULT_TYPING_DURATION = 60;
const DEFAULT_FRAMES_PER_CHAR = 2;
const DEFAULT_FRAMES_PER_WORD = 8;
const DEFAULT_FRAMES_PER_LINE = 15;
const MIN_TYPING_DURATION = 30;

export type TypewriterMode = 'char' | 'word' | 'line';

export interface TypewriterProps {
  startAt?: number;
  /** Total duration for full text reveal in frames. */
  durationInFrames?: number;
  text: string;
  mode?: TypewriterMode;
  variant?: TypographyVariant;
  animation?: EntranceAnimation;
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
  variant = 'heading',
  animation = 'slideUp',
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
  const patchedAnimation = usePatchedProp<EntranceAnimation>(id, 'animation', animation);
  const styleOverride = useStyleOverride(id);

  const entranceDuration = 20;
  const entranceProgress = interpolateWithEasing(
    frame,
    [effectiveStartAt, effectiveStartAt + entranceDuration],
    [0, 1],
    'linear',
  );

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
      style={{
        ...resolveTypography(patchedVariant, styleConfig, theme, preset),
        opacity: entranceProgress,
        transform: getEntranceTransform(patchedAnimation, entranceProgress),
        display: 'inline-block',
        ...style,
        ...styleOverride
      }}
    >
      {visibleText}
      {showCursor && cursorChar && (
        <span style={{ opacity: cursorVisible ? 1 : 0 }}>{cursorChar}</span>
      )}
    </span>
  );
}

// ============================================================================
// Schema & Duration Calculation
// ============================================================================

export const TypewriterSchema = z.object({
  text: z.string().min(1, "text is required"),
  mode: z.enum(['char', 'word', 'line']).default('char').optional(),
  variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).optional(),
  animation: z.enum(ENTRANCE_ANIMATIONS).optional(),
  startAt: z.number().min(0, "startAt cannot be negative").default(0).optional(),
  durationInFrames: z.number().min(1, "durationInFrames must be positive").default(DEFAULT_TYPING_DURATION).optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export function calculateTypewriterDuration(props: TypewriterProps): DurationResult {
  // Validate props
  const validation = TypewriterSchema.safeParse(props);
  if (!validation.success) {
    const firstError = validation.error.errors[0];
    return {
      success: false,
      error: firstError.message,
      field: firstError.path[0] as string,
    };
  }

  const validated = validation.data;
  const mode = validated.mode ?? 'char';
  const entranceDuration = DEFAULT_ENTRANCE_DURATION;
  
  // Calculate typing duration based on mode
  let typingDuration: number;
  
  if (validated.durationInFrames) {
    // User specified duration
    typingDuration = validated.durationInFrames;
  } else {
    // Auto-calculate based on content
    if (mode === 'char') {
      const charCount = validated.text.length;
      typingDuration = Math.max(MIN_TYPING_DURATION, charCount * DEFAULT_FRAMES_PER_CHAR);
    } else if (mode === 'word') {
      const wordCount = validated.text.split(' ').length;
      typingDuration = Math.max(MIN_TYPING_DURATION, wordCount * DEFAULT_FRAMES_PER_WORD);
    } else { // line
      const lineCount = validated.text.split('\n').length;
      typingDuration = Math.max(MIN_TYPING_DURATION, lineCount * DEFAULT_FRAMES_PER_LINE);
    }
  }
  
  return {
    success: true,
    duration: Math.ceil(entranceDuration + typingDuration),
  };
}

// ============================================================================
// Registry Descriptor
// ============================================================================

export const TypewriterDescriptor: ComponentRegistration = {
  name: 'Typewriter',
  type: 'content',
  fullSchema: TypewriterSchema,
  editorProps: ['text', 'mode', 'animation', 'durationInFrames'],
  description: 'reveals text character by character — use for dramatic or progressive text reveals',
  calculateDuration: calculateTypewriterDuration,
};
