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

const BASE_LEAD_DELAY = 8;
const BASE_LEAD_SETTLE_DURATION = 18;
const BASE_STAGGER_DELAY = 5;
const BASE_WORD_ENTRANCE_DURATION = 12;
const BASE_HOLD_DURATION = 10;
const BASE_EXIT_STAGGER_DELAY = 4;
const BASE_EXIT_DURATION = 10;
const LEAD_VIEWPORT_COVERAGE = 0.6;
const MIN_SPEED_FACTOR = 0.25;

export const TextLeadStaggerDefaults = {
  id: 'textleadstagger',
  startAt: 0,
  text: "Isn't getting clicks",
  variant: 'display' as TypographyVariant,
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
  const fontSizePx = parsePixelValue(typographyStyle.fontSize);
  const wordGapPx = fontSizePx * 0.25;

  const words = useMemo(() => props.text.trim().split(/\s+/).filter(Boolean), [props.text]);
  const wordCount = words.length;
  const leadWord = words[0] ?? '';
  const leadWordWidth = estimateWordWidth(leadWord, fontSizePx);
  const leadScale = leadWordWidth > 0
    ? Math.min(Math.max((preset.width * LEAD_VIEWPORT_COVERAGE) / leadWordWidth, 1.8), 6)
    : 1;
  const leadTimelineEnd = leadDelay + leadSettleDuration;
  const firstWordInlineStart = Math.max(0, leadTimelineEnd - Math.max(4, Math.round(leadSettleDuration * 0.35)));
  const lastEntryStart = wordCount > 1 ? leadTimelineEnd + (wordCount - 2) * staggerDelay : leadTimelineEnd;
  const allVisibleFrame = wordCount > 1 ? lastEntryStart + wordEntranceDuration : leadTimelineEnd;
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
        [firstWordInlineStart, leadTimelineEnd],
        [0, 1],
        'ease-out',
      );
      const visibleProgress = Math.max(0, Math.min(1, revealProgress * exitVisibility));

      return {
        display: 'inline-block',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        verticalAlign: 'top',
        maxWidth: `${estimatedWidth * visibleProgress}px`,
        marginRight: wordIndex < wordCount - 1 ? `${wordGapPx * visibleProgress}px` : 0,
        opacity: visibleProgress,
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
    const entranceTransform = getEntranceTransform(props.entranceAnimation, entryProgress, Math.max(fontSizePx, 120));

    return {
      display: 'inline-block',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      verticalAlign: 'top',
      maxWidth: `${estimatedWidth * visibleProgress}px`,
      marginRight: wordIndex < wordCount - 1 ? `${wordGapPx * visibleProgress}px` : 0,
      opacity: visibleProgress,
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
    [firstWordInlineStart, leadTimelineEnd],
    [1, 0],
    'ease-in-out',
  );

  const leadOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    left: '50%',
    top: '50%',
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
    "name": "startAt",
    "type": "number",
    "default": TextLeadStaggerDefaults.startAt
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
  description: 'Lead word starts enlarged, settles down, remaining words enter in a stagger, then all words fade away one-by-one from the start.',
  celExpression: 'ceil(props.textleadstagger.startAt + (8 + 18 + max(0, size(props.textleadstagger.text.split(" ")) - 2) * 5 + 12 + 10 + max(0, size(props.textleadstagger.text.split(" ")) - 1) * 4 + 10) / max(0.25, props.textleadstagger.speedFactor))',
};
