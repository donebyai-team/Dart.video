import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { usePatchedProp, usePatchedProps, useStyleOverride } from '../../../patches/PatchContext';
import { useStyleContext } from '../../../styles/StyleContext';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { useTheme } from '../../../theme/ThemeContext';
import { getEasing, interpolateWithEasing } from '../../../styles/easingResolver';
import { TypographyVariant, TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens/semantic';
import { resolveTypography } from '../../../tokens/resolveTypography';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../durationTypes';

// Default constants
const DEFAULT_HOLD_DURATION = 15;
const DEFAULT_TRANSITION_DURATION = 5;
const DEFAULT_TRANSITION = 'flipY' as const;
const DEFAULT_VARIANT = 'heading' as const;

export type TextCycleTransition = 'flipY' | 'fadeSwap' | 'slideUp';

// ============================================================================
// Schema & Duration Calculation
// ============================================================================

export const TextCycleSchema = z.object({
  id: z.string().optional(),
  texts: z.array(z.string()).min(1, "texts must contain at least one item"),
  holdDuration: z.number().min(0, "holdDuration cannot be negative").default(DEFAULT_HOLD_DURATION).optional(),
  transitionDuration: z.number().min(0, "transitionDuration cannot be negative").default(DEFAULT_TRANSITION_DURATION).optional(),
  transition: z.enum(['flipY', 'fadeSwap', 'slideUp']).default(DEFAULT_TRANSITION).optional(),
  variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).default(DEFAULT_VARIANT).optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

// Use z.input for props (what callers pass) - fields with defaults are optional
export type TextCycleProps = z.input<typeof TextCycleSchema>;

/**
 * Cycles through an array of words with animated transitions.
 *
 * Auto-adjusts container width to the longest word using a hidden spacer —
 * no layout reflow occurs when words change, eliminating jerk in Stack/Row layouts.
 */
export const TextCycle: React.FC<TextCycleProps> = (propsInit: TextCycleProps) => {
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();

  const patchedProps = usePatchedProps(propsInit.id, propsInit);
  const props = { ...TextCycleSchema.parse(patchedProps), id: propsInit.id };

  const patchedVariant = props.variant ?? DEFAULT_VARIANT;
  const styleOverride = useStyleOverride(props.id);

  const cycleDuration = (props.holdDuration ?? DEFAULT_HOLD_DURATION) + (props.transitionDuration ?? DEFAULT_TRANSITION_DURATION);
  const resolvedEasing = getEasing(styleConfig.motion, 'wordcycle');
  const typographyStyle = resolveTypography(patchedVariant, styleConfig, theme, preset);

  // The longest word by character count — used as an invisible spacer to
  // hold the container width stable across all word changes.
  const longestWord = useMemo(
    () => props.texts.reduce((a, b) => (a.length >= b.length ? a : b), ''),
    [props.texts],
  );

  if (props.texts.length === 0) return <span className={props.className} style={props.style} />;

  const elapsed = Math.max(0, frame);
  const holdDuration = props.holdDuration ?? DEFAULT_HOLD_DURATION;
  const transitionDuration = props.transitionDuration ?? DEFAULT_TRANSITION_DURATION;
  const cycleIndex = Math.floor(elapsed / cycleDuration);
  const cycleFrame = elapsed - cycleIndex * cycleDuration;

  const currentWord = props.texts[cycleIndex % props.texts.length] ?? props.texts[0] ?? '';
  const nextWord = props.texts[(cycleIndex + 1) % props.texts.length] ?? props.texts[0] ?? '';
  const isTransitioning = cycleFrame >= holdDuration;

  const transitionProgress = isTransitioning
    ? interpolateWithEasing(
        cycleFrame,
        [holdDuration, holdDuration + transitionDuration],
        [0, 1],
        resolvedEasing,
      )
    : 0;

  // Outer container — sized by the invisible spacer (longestWord), never by
  // the visible word. This is what eliminates layout reflow.
  const containerStyle: React.CSSProperties = {
    ...typographyStyle,
    position: 'relative',
    display: 'inline-block',
    ...props.style,
    ...styleOverride,
  };

  // Invisible spacer — always renders the longest word to hold container width.
  const spacerStyle: React.CSSProperties = {
    visibility: 'hidden',
    whiteSpace: 'nowrap',
    display: 'block',
    pointerEvents: 'none',
    userSelect: 'none',
    // Occupy height too so the container height is stable
    lineHeight: 'inherit',
  };

  // Visible words are absolutely positioned on top of the spacer.
  const absoluteLayerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
  };

  if (props.transition === 'fadeSwap') {
    return (
      <span id={props.id} className={props.className} style={containerStyle}>
        {/* Spacer holds the width — never visible */}
        <span style={spacerStyle} aria-hidden="true">{longestWord}</span>

        {/* Current word fades out during transition */}
        <span style={{ ...absoluteLayerStyle, opacity: isTransitioning ? 1 - transitionProgress : 1 }}>
          {currentWord}
        </span>

        {/* Next word fades in during transition */}
        {isTransitioning && (
          <span style={{ ...absoluteLayerStyle, opacity: transitionProgress }}>
            {nextWord}
          </span>
        )}
      </span>
    );
  }

  if (props.transition === 'slideUp') {
    return (
      <span id={props.id} className={props.className} style={{ ...containerStyle, overflow: 'hidden' }}>
        <span style={spacerStyle} aria-hidden="true">{longestWord}</span>

        <span
          style={{
            ...absoluteLayerStyle,
            transform: isTransitioning ? `translateY(-${transitionProgress * 100}%)` : 'translateY(0)',
            opacity: isTransitioning ? 1 - transitionProgress : 1,
          }}
        >
          {currentWord}
        </span>

        {isTransitioning && (
          <span
            style={{
              ...absoluteLayerStyle,
              transform: `translateY(${(1 - transitionProgress) * 100}%)`,
              opacity: transitionProgress,
            }}
          >
            {nextWord}
          </span>
        )}
      </span>
    );
  }

  // flipY
  return (
    <span id={props.id} className={props.className} style={containerStyle}>
      <span style={spacerStyle} aria-hidden="true">{longestWord}</span>

      <span
        style={{
          ...absoluteLayerStyle,
          transform: isTransitioning ? `rotateX(${transitionProgress * 90}deg)` : 'rotateX(0deg)',
          opacity: isTransitioning ? 1 - transitionProgress : 1,
        }}
      >
        {currentWord}
      </span>

      {isTransitioning && (
        <span
          style={{
            ...absoluteLayerStyle,
            transform: `rotateX(${(1 - transitionProgress) * -90}deg)`,
            opacity: transitionProgress,
          }}
        >
          {nextWord}
        </span>
      )}
    </span>
  );
}

export function calculateTextCycleDuration(props: TextCycleProps): DurationResult {
  // Validate props
  const validation = TextCycleSchema.safeParse(props);
  if (!validation.success) {
    const firstError = validation.error.errors[0];
    return {
      success: false,
      error: firstError.message,
      field: firstError.path[0] as string,
    };
  }

  const validated = validation.data;
  
  if (validated.texts.length === 0) {
    return {
      success: false,
      error: "texts array cannot be empty",
      field: "texts",
    };
  }

  // Calculate duration: (hold + transition) * number of texts
  const holdDuration = validated.holdDuration ?? DEFAULT_HOLD_DURATION;
  const transitionDuration = validated.transitionDuration ?? DEFAULT_TRANSITION_DURATION;
  const cycleDuration = holdDuration + transitionDuration;
  const totalDuration = cycleDuration * validated.texts.length;
  
  return {
    success: true,
    duration: Math.ceil(totalDuration),
  };
}

// ============================================================================
// Registry Descriptor
// ============================================================================

export const TextCycleDescriptor: ComponentRegistration = {
  name: 'TextCycle',
  type: 'content',
  fullSchema: TextCycleSchema,
  editorProps: ['texts', 'transition', 'holdDuration', 'transitionDuration'],
  description: 'Cycles through multiple text strings or words with smooth transitions. Use for rotating taglines, benefits, or features. Required props: texts={["Build faster with AI", "Deploy with confidence", "Scale without limits"]}. Each text displays briefly then transitions to the next.',
  calculateDuration: calculateTextCycleDuration,
};