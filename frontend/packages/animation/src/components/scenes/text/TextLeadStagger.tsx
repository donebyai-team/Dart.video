import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { usePatchedDragStyle, usePatchedProps, useStyleOverride } from '../../../patches';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { useStyleContext } from '../../../styles/StyleContext';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { useTheme } from '../../../theme/ThemeContext';
import type { TypographyVariant } from '../../../tokens/semantic';
import { resolveTypography } from '../../../tokens/resolveTypography';
import { getEntranceTransform } from '../types';
import type { EntranceAnimation } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';
import { TextStagger } from '..';

// Delay before the oversized lead word starts settling down.
const BASE_LEAD_DELAY = 8;
// Duration of the lead word scale-down / settle animation.
const BASE_LEAD_SETTLE_DURATION = 10;
// Delay between each non-lead word starting its entrance.
const BASE_STAGGER_DELAY = 5;
// Duration of each word's inline reveal / entrance animation.
const BASE_WORD_ENTRANCE_DURATION = 12;
// Time the full sentence remains visible before exit starts.
const BASE_HOLD_DURATION = 10;
// Delay between each word starting its exit animation.
const BASE_EXIT_STAGGER_DELAY = 4;
// Duration of each word's fade-and-shift exit animation.
const BASE_EXIT_DURATION = 10;
// Short crossfade window while the lead word merges into its inline slot.
const BASE_HANDOFF_GAP = 2;
// Target viewport width coverage for the oversized lead word.
const LEAD_VIEWPORT_COVERAGE = 0.6;
// Lowest allowed speedFactor so timings never collapse too far.
const MIN_SPEED_FACTOR = 0.25;
// Minimum reveal progress before a word becomes visible to avoid flicker.
const MIN_VISIBLE_PROGRESS = 0.08;
// CEL duration formula derived from the timing constants above.
const TEXT_LEAD_STAGGER_DURATION_EXPRESSION = `ceil((${BASE_LEAD_DELAY} + ${BASE_LEAD_SETTLE_DURATION} + max(0, size(props.textleadstagger.text.split(" ")) - 2) * ${BASE_STAGGER_DELAY} + ${BASE_WORD_ENTRANCE_DURATION} + ${BASE_HOLD_DURATION} + max(0, size(props.textleadstagger.text.split(" ")) - 1) * ${BASE_EXIT_STAGGER_DELAY} + ${BASE_EXIT_DURATION}) / max(${MIN_SPEED_FACTOR}, props.textleadstagger.speedFactor))`;

export const TextLeadStaggerDefaults = {
  id: 'textleadstagger',
  startAt: 0,
  text: "Isn't getting clicks",
  variant: 'displayLg' as TypographyVariant,
  entranceAnimation: 'slideLeft' as EntranceAnimation,
  speedFactor: 1,
  className: undefined as string | undefined,
  style: undefined as React.CSSProperties | undefined,
};

export type TextLeadStaggerProps = Partial<typeof TextLeadStaggerDefaults>;

function parsePixelValue(value: React.CSSProperties['fontSize']): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 96;
  }

  return 96;
}

function estimateWordWidth(word: string, fontSizePx: number): number {
  return Math.max(fontSizePx * 0.9, word.length * fontSizePx * 0.62);
}

function scaleTiming(baseDuration: number, speedFactor: number): number {
  return Math.max(1, Math.round(baseDuration / Math.max(speedFactor, MIN_SPEED_FACTOR)));
}

function composeTransforms(...transforms: Array<string | undefined>): string | undefined {
  const parts = transforms.filter((transform): transform is string => Boolean(transform && transform.trim()));
  return parts.length > 0 ? parts.join(' ') : undefined;
}

export const TextLeadStagger: React.FC<TextLeadStaggerProps> = (initProps) => {
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();
  const defaultProps = { ...TextLeadStaggerDefaults, ...initProps };
  const id = defaultProps.id;
  const props = usePatchedProps(id, defaultProps);

  const styleOverride = useStyleOverride(id);
  const overrideTransform = typeof styleOverride.transform === 'string' ? styleOverride.transform : undefined;
  const dragStyle = usePatchedDragStyle(id, props.style?.transform, overrideTransform);
  const typographyStyle = resolveTypography(props.variant, styleConfig, theme, preset);
  const elapsed = Math.max(0, frame - props.startAt);
  const speedFactor = Math.max(props.speedFactor, MIN_SPEED_FACTOR);
  const leadDelay = scaleTiming(BASE_LEAD_DELAY, speedFactor);
  const leadSettleDuration = scaleTiming(BASE_LEAD_SETTLE_DURATION, speedFactor);
  const staggerDelay = scaleTiming(BASE_STAGGER_DELAY, speedFactor);
  const wordEntranceDuration = scaleTiming(BASE_WORD_ENTRANCE_DURATION, speedFactor);
  const holdDuration = scaleTiming(BASE_HOLD_DURATION, speedFactor);
  const exitStaggerDelay = scaleTiming(BASE_EXIT_STAGGER_DELAY, speedFactor);
  const exitDuration = scaleTiming(BASE_EXIT_DURATION, speedFactor);
  const handoffGap = scaleTiming(BASE_HANDOFF_GAP, speedFactor);
  const fontSizePx = parsePixelValue(typographyStyle.fontSize);
  const wordGapPx = fontSizePx * 0.25;

  const words = useMemo(() => props.text.trim().split(/\s+/).filter(Boolean), [props.text]);
  const wordCount = words.length;
  const leadWord = words[0] ?? '';
  const leadWordWidth = estimateWordWidth(leadWord, fontSizePx);
  const leadScale = leadWordWidth > 0
    ? Math.min(Math.max((preset.width * LEAD_VIEWPORT_COVERAGE) / leadWordWidth, 1.8), 6)
    : 1;
  // Frame where the centered lead-word settle animation finishes.
  const leadTimelineEnd = leadDelay + leadSettleDuration;
  // Frame where the lead word starts blending into its inline sentence slot.
  const leadBlendStart = Math.max(0, leadTimelineEnd - handoffGap);
  // Frame where the inline version of the first word fully takes over.
  const firstWordInlineEnd = leadTimelineEnd;
  // Frame where the final entering word begins its reveal.
  const lastEntryStart = wordCount > 1 ? leadTimelineEnd + (wordCount - 2) * staggerDelay : leadTimelineEnd;
  // Frame where the whole sentence has fully entered and is visible.
  const allVisibleFrame = wordCount > 1 ? lastEntryStart + wordEntranceDuration : firstWordInlineEnd;
  // Frame where the staggered exit sequence begins.
  const exitBaseFrame = allVisibleFrame + holdDuration;

  const getWordStyle = (word: string, wordIndex: number): React.CSSProperties => {
    const estimatedWidth = estimateWordWidth(word, fontSizePx);
    const exitStart = exitBaseFrame + wordIndex * exitStaggerDelay;
    const exitProgress = interpolateWithEasing(
      elapsed,
      [exitStart, exitStart + exitDuration],
      [0, 1],
      'ease-in-out',
    );
    const exitVisibility = 1 - exitProgress;
    const exitTranslate = `translateX(${-estimatedWidth * 0.18 * exitProgress}px)`;

    if (wordIndex === 0) {
      const revealProgress = interpolateWithEasing(
        elapsed,
        [leadBlendStart, firstWordInlineEnd],
        [0, 1],
        'ease-out',
      );
      const visibleProgress = Math.max(0, Math.min(1, revealProgress * exitVisibility));
      const isVisible = visibleProgress > MIN_VISIBLE_PROGRESS;

      return {
        display: 'inline-block',
        overflow: 'hidden',
        visibility: isVisible ? 'visible' : 'hidden',
        whiteSpace: 'nowrap',
        verticalAlign: 'top',
        maxWidth: `${estimatedWidth * (isVisible ? visibleProgress : 0)}px`,
        marginRight: wordIndex < wordCount - 1 ? `${wordGapPx * (isVisible ? visibleProgress : 0)}px` : 0,
        opacity: isVisible ? visibleProgress : 0,
        transform: exitTranslate,
        transformOrigin: 'left center',
      };
    }

    const entryStart = leadTimelineEnd + (wordIndex - 1) * staggerDelay;
    const entryProgress = interpolateWithEasing(
      elapsed,
      [entryStart, entryStart + wordEntranceDuration],
      [0, 1],
      'ease-out',
    );
    const visibleProgress = Math.max(0, Math.min(1, entryProgress * exitVisibility));
    const isVisible = visibleProgress > MIN_VISIBLE_PROGRESS;
    const entranceTransform = getEntranceTransform(props.entranceAnimation, entryProgress, Math.max(fontSizePx, 120));

    return {
      display: 'inline-block',
      overflow: 'hidden',
      visibility: isVisible ? 'visible' : 'hidden',
      whiteSpace: 'nowrap',
      verticalAlign: 'top',
      maxWidth: `${estimatedWidth * (isVisible ? visibleProgress : 0)}px`,
      marginRight: wordIndex < wordCount - 1 ? `${wordGapPx * (isVisible ? visibleProgress : 0)}px` : 0,
      opacity: isVisible ? visibleProgress : 0,
      transform: composeTransforms(entranceTransform, exitTranslate),
      transformOrigin: 'left center',
    };
  };

  const leadSettleProgress = interpolateWithEasing(
    elapsed,
    [leadDelay, leadTimelineEnd],
    [0, 1],
    'ease-out',
  );
  const leadOverlayFade = interpolateWithEasing(
    elapsed,
    [leadBlendStart, leadTimelineEnd],
    [1, 0],
    'ease-in-out',
  );

  const leadOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    left: '50%',
    top: '50%',
    zIndex: 1,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    opacity: leadOverlayFade,
    transform: `translate(-50%, -50%) scale(${leadScale - (leadScale - 1) * leadSettleProgress})`,
    transformOrigin: 'center center',
    ...typographyStyle,
  };

  return (
    <>
      {leadWord ? <span style={leadOverlayStyle}>{leadWord}</span> : null}
      <span
        id={id}
        className={props.className}
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          ...typographyStyle,
          ...props.style,
          ...styleOverride,
          ...dragStyle,
        }}
      >
        {words.map((word, index) => (
          <span key={`${word}-${index}`} style={getWordStyle(word, index)}>
            {word}
          </span>
        ))}
      </span>
    </>
  );
};

export const TextLeadStaggerSchemaFields = [
  {
    "name": "text",
    "type": "string",
    "map": "props.text"
  },
  {
    "name": "variant",
    "type": "string",
    "subtype": "enum",
    "default": TextLeadStaggerDefaults.variant
  },
  {
    "name": "entranceAnimation",
    "type": "string",
    "subtype": "enum",
    "default": TextLeadStaggerDefaults.entranceAnimation
  },
  {
    "name": "speedFactor",
    "type": "number",
    "default": TextLeadStaggerDefaults.speedFactor
  }
];

export const TextLeadStaggerDescriptor: ComponentRegistration = {
  name: 'TextLeadStagger',
  type: 'content',
  schema: [{
    type: 'component',
    name: 'textleadstagger',
    fields: TextLeadStaggerSchemaFields
  }],
  llmSchema: [
    {
      name: 'text',
      type: 'string',
    }
  ],
  celExpression: TEXT_LEAD_STAGGER_DURATION_EXPRESSION,
  description: `First word starts enlarged and then settles down. The remaining words enter in a stagger, making it ideal for emphasis moments (MAX 3–4 words).
Examples:
text="Isn't getting clicks"
text="You're missing out"

You can combine it with other **fillers scenes** for showcasing a **"Problem" or "Solution" section** of a video or use it as a standalone filler with other scenes.

Example problem: "If your Airbnb listing isn't getting clicks"

- Scene 1: If (TextStagger)
- Scene 2: your (TextStagger)
- Scene 3: Airbnb {listing} (TextHighlight)
- Scene 4: isn't getting clicks (TextLeadStagger)`,
};
