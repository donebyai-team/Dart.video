import React from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { usePatchedProp, usePatchedProps, useStyleOverride } from '../../../patches/PatchContext';
import { useStyleContext } from '../../../styles/StyleContext';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { useTheme } from '../../../theme/ThemeContext';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { TypographyVariant, TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens/semantic';
import { resolveTypography } from '../../../tokens/resolveTypography';
import { applySpeedFactor, useSpeedFactor } from '../../../duration';
import { getEntranceTransform, ENTRANCE_ANIMATIONS, TYPEWRITER_MODES } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../durationTypes';

// Default constants
const DEFAULT_ENTRANCE_DURATION = 20;
const DEFAULT_TYPING_DURATION = 60;
const DEFAULT_FRAMES_PER_CHAR = 2;
const DEFAULT_FRAMES_PER_WORD = 8;
const DEFAULT_FRAMES_PER_LINE = 15;
const MIN_TYPING_DURATION = 30;
const DEFAULT_MODE = 'char' as const;
const DEFAULT_VARIANT = 'heading' as const;
const DEFAULT_ANIMATION = 'slideUp' as const;


export type TypewriterProps = z.input<typeof TypewriterSchema>;


/**
 * Reveals text progressively using linear easing.
 * Cursor appearance (shape, behavior) driven by StyleContext.cursor.
 */
export function Typewriter(propsInit: TypewriterProps): React.ReactElement {
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();

  const patchedProps = usePatchedProps(propsInit.id, propsInit);
  const props = { ...TypewriterSchema.parse(patchedProps), id: propsInit.id };

  // Apply defaults
  const actualMode = props.mode ?? DEFAULT_MODE;
  const actualAnimation = props.animation ?? DEFAULT_ANIMATION;
  const actualVariant = props.variant ?? DEFAULT_VARIANT;

  const styleOverride = useStyleOverride(props.id);

  const entranceDuration = 20;
  const entranceProgress = interpolateWithEasing(
    frame,
    [0, entranceDuration],
    [0, 1],
    'linear',
  );

  const progress = interpolateWithEasing(
    frame,
    [0, DEFAULT_TYPING_DURATION],
    [0, 1],
    'linear',
  );

  let visibleText: string;
  if (actualMode === 'char') {
    visibleText = props.text.slice(0, Math.floor(progress * props.text.length));
  } else if (actualMode === 'word') {
    const words = props.text.split(' ');
    visibleText = words.slice(0, Math.floor(progress * words.length)).join(' ');
  } else {
    const lines = props.text.split('\n');
    visibleText = lines.slice(0, Math.floor(progress * lines.length)).join('\n');
  }

  const { cursor } = styleConfig;
  const cursorCharMap: Record<string, string> = {
    line: '|', underscore: '_', block: '█', none: '',
  };
  const cursorChar = cursorCharMap[cursor.shape] ?? '';
  const showCursor = cursor.shape !== 'none' && frame >= 0;
  const cursorVisible =
    cursor.behavior === 'solid' ? true
      : cursor.behavior === 'fade' ? Math.sin((frame * Math.PI) / 15) > 0
        : Math.floor(frame / 15) % 2 === 0;

  return (
    <span
      id={props.id}
      className={props.className}
      style={{
        ...resolveTypography(actualVariant, styleConfig, theme, preset),
        opacity: entranceProgress,
        transform: getEntranceTransform(actualAnimation, entranceProgress),
        display: 'inline-block',
        ...props.style,
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
  id: z.string().optional(),
  startAt: z.number().min(0, "startAt cannot be negative").default(0).optional(),
  text: z.string().min(1, "text is required"),
  mode: z.enum(TYPEWRITER_MODES).default(DEFAULT_MODE).optional(),
  variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).default(DEFAULT_VARIANT).optional(),
  animation: z.enum(ENTRANCE_ANIMATIONS).default(DEFAULT_ANIMATION).optional(),
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

  // Calculate typing duration based on mode
  let typingDuration: number;


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


  return {
    success: true,
    duration: Math.ceil(DEFAULT_ENTRANCE_DURATION + typingDuration),
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
  description: 'Reveals text character-by-character like a typewriter. Use for dramatic reveals or code/terminal effects. Required props: text="Building the future of AI". Optional: mode="char" (default), "word", or "line" to control typing granularity.',
  calculateDuration: calculateTypewriterDuration,
};
