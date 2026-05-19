import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { composeTransforms, useElement } from '../../../patches';
import { ClippedText, useTextMeasurement } from '../../../core/assets';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { useStyleContext } from '../../../styles/StyleContext';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { useTheme } from '../../../theme/ThemeContext';
import type { TypographyVariant } from '../../../tokens/semantic';
import { AnimationPresetName, resolveAnimationPreset } from '../../../core/animation_preset/AnimationPreset';
import type { ComponentRegistration } from '../../../registry/registry';

const BASE_LINE_ONE_STAGGER = 5;
const BASE_LINE_ONE_DURATION = 12;
const BASE_LINE_TWO_DELAY = 6;
const BASE_LINE_TWO_DURATION = 14;
const BASE_HIGHLIGHT_DURATION = 16;
const BASE_HOLD_DURATION = 10;
const BASE_SCALE_OUT_DURATION = 14;
const MIN_VISIBLE_PROGRESS = 0.08;
const BRUSH_VIEWBOX_WIDTH = 1000;
const BRUSH_VIEWBOX_HEIGHT = 280;
const BRUSH_PATH_LENGTH = 1800;
const SCALE_OUT_TARGET = 1.8;

const CEL_BASE_FRAMES =
  BASE_LINE_ONE_DURATION +
  BASE_LINE_TWO_DELAY +
  BASE_LINE_TWO_DURATION +
  BASE_HIGHLIGHT_DURATION +
  BASE_HOLD_DURATION +
  BASE_SCALE_OUT_DURATION;
const MAX_RECOMMENDED_WORDS = 6;
const MAX_FIRST_LINE_WORDS = Math.ceil(MAX_RECOMMENDED_WORDS / 2);
const CEL_TOTAL_FRAMES = CEL_BASE_FRAMES + (MAX_FIRST_LINE_WORDS - 1) * BASE_LINE_ONE_STAGGER;

export const ProblemHeadlineDefaults = {
  id: 'problemheadline',
  startAt: 0,
  text: '',
  variant: 'display' as TypographyVariant,
  entranceAnimation: 'slideUp' as AnimationPresetName,
  highlightColor: '',
  className: undefined as string | undefined,
  style: undefined as React.CSSProperties | undefined,
};

export type ProblemHeadlineProps = Partial<typeof ProblemHeadlineDefaults>;

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

function estimateLineWidth(line: string, fontSizePx: number): number {
  const characterCount = line.trim().length || 1;
  return Math.max(fontSizePx * 2.4, characterCount * fontSizePx * 0.6);
}

function splitTextIntoLines(text: string, maxWidthPx: number, fontSizePx: number): [string, string] {
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return ['', ''];
  }

  const fullText = words.join(' ');
  if (words.length <= 2 || (words.length <= 3 && estimateLineWidth(fullText, fontSizePx) <= maxWidthPx)) {
    return [fullText, ''];
  }

  let bestSplit: [string, string] = [fullText, ''];
  let bestScore = Number.POSITIVE_INFINITY;

  for (let splitIndex = 1; splitIndex < words.length; splitIndex += 1) {
    const lineOne = words.slice(0, splitIndex).join(' ');
    const lineTwo = words.slice(splitIndex).join(' ');
    const lineOneWidth = estimateLineWidth(lineOne, fontSizePx);
    const lineTwoWidth = estimateLineWidth(lineTwo, fontSizePx);
    const overflowPenalty = Math.max(0, lineOneWidth - maxWidthPx) + Math.max(0, lineTwoWidth - maxWidthPx);
    const balancePenalty = Math.abs(lineOne.length - lineTwo.length) + Math.abs(lineOneWidth - lineTwoWidth) * 0.08;
    const score = overflowPenalty * 10 + balancePenalty;

    if (score < bestScore) {
      bestScore = score;
      bestSplit = [lineOne, lineTwo];
    }
  }

  return bestSplit;
}

function getScaleFadeExit(frame: number, holdEnd: number, scaleOutEnd: number) {
  // Shared scene exit pattern: hold briefly, then scale up while fading out.
  const progress = interpolateWithEasing(
    frame,
    [holdEnd, scaleOutEnd],
    [0, 1],
    'ease-in',
  );

  return {
    progress,
    opacity: 1 - progress,
    scale: 1 + (SCALE_OUT_TARGET - 1) * progress,
  };
}

function buildBrushPasses(hasSecondLine: boolean): Array<{ d: string; width: number; opacity: number }> {
  return hasSecondLine
    ? [
      { d: 'M74 74 L250 62 L176 120 L456 108 L318 176 L676 160 L496 230 L888 214', width: 126, opacity: 0.9 },
      { d: 'M82 84 L262 72 L188 130 L468 118 L330 186 L688 170 L508 240 L900 224', width: 108, opacity: 0.84 },
      { d: 'M90 94 L274 82 L200 140 L480 128 L342 196 L700 180 L520 250 L912 234', width: 90, opacity: 0.78 },
    ]
    : [
      { d: 'M74 112 L262 96 L196 146 L484 134 L336 192 L738 176 L560 222 L912 208', width: 116, opacity: 0.9 },
      { d: 'M82 122 L274 106 L208 156 L496 144 L348 202 L750 186 L572 232 L924 218', width: 98, opacity: 0.84 },
      { d: 'M90 132 L286 116 L220 166 L508 154 L360 212 L762 196 L584 242 L936 228', width: 84, opacity: 0.78 },
    ];
}

export const ProblemHeadline: React.FC<ProblemHeadlineProps> = (initProps) => {
  const frame = useCurrentFrame();
  const theme = useTheme();
  const preset = useAspectPreset();
  const defaultProps = { ...ProblemHeadlineDefaults, ...initProps };
  const id = defaultProps.id;
  const { props, style, containerStyle } = useElement(id, defaultProps);
  const fontSizePx = parsePixelValue(style.fontSize);
  const lineGapPx = fontSizePx * 1.1;
  const availableWidth = preset.width - preset.safeArea.left - preset.safeArea.right;
  const maxTextWidthPx = Math.max(fontSizePx * 6, availableWidth * 0.72);
  const elapsed = Math.max(0, frame - props.startAt);
  const lineOneStaggerDelay = BASE_LINE_ONE_STAGGER;
  const lineOneWordDuration = BASE_LINE_ONE_DURATION;
  const lineTwoDelay = BASE_LINE_TWO_DELAY;
  const lineTwoDuration = BASE_LINE_TWO_DURATION;
  const highlightDuration = BASE_HIGHLIGHT_DURATION;
  const holdDuration = BASE_HOLD_DURATION;
  const scaleOutDuration = BASE_SCALE_OUT_DURATION;

  const [resolvedLineOne, resolvedLineTwo] = useMemo(
    () => splitTextIntoLines(props.text.trim(), maxTextWidthPx, fontSizePx),
    [fontSizePx, maxTextWidthPx, props.text],
  );

  const hasSecondLine = resolvedLineTwo.length > 0;
  const lineOneWords = useMemo(() => resolvedLineOne.trim().split(/\s+/).filter(Boolean), [resolvedLineOne]);
  const lineOneWordCount = lineOneWords.length;
  const lineOneEnd = lineOneWordCount > 0
    ? (lineOneWordCount - 1) * lineOneStaggerDelay + lineOneWordDuration
    : lineOneWordDuration;
  const lineTwoStart = hasSecondLine ? lineOneEnd + lineTwoDelay : lineOneEnd;
  const lineTwoEnd = hasSecondLine ? lineTwoStart + lineTwoDuration : lineTwoStart;
  const highlightStart = lineTwoEnd;
  const highlightEnd = highlightStart + highlightDuration;
  const holdEnd = highlightEnd + holdDuration;
  const scaleOutEnd = holdEnd + scaleOutDuration;

  const lineShiftProgress = hasSecondLine
    ? interpolateWithEasing(
      elapsed,
      [lineTwoStart, lineTwoEnd],
      [0, 1],
      'ease-out',
    )
    : 0;

  const exit = getScaleFadeExit(elapsed, holdEnd, scaleOutEnd);

  const groupTransform = composeTransforms(
    `scale(${exit.scale})`,
    containerStyle.transform,
  );


  const lineOneBaseY = interpolateWithEasing(
    elapsed,
    [0, lineOneEnd],
    [fontSizePx * 0.18, 0],
    'ease-out',
  );
  const lineOneY = lineOneBaseY - (hasSecondLine ? (lineGapPx * 0.5) * lineShiftProgress : 0);
  const lineTwoY = hasSecondLine ? fontSizePx * 0.72 - fontSizePx * 0.18 * lineShiftProgress : 0;

  const lineTwoOpacity = hasSecondLine
    ? interpolateWithEasing(
      elapsed,
      [lineTwoStart, lineTwoEnd],
      [0, 1],
      'ease-out',
    )
    : 0;
  const lineTwoTransform = resolveAnimationPreset({
    frame: elapsed,
    startAt: lineTwoStart,
    duration: lineTwoDuration,
    presetName: props.entranceAnimation,
    distance: Math.max(fontSizePx * 0.9, 80),
    easing: 'ease-out',
  }).transform;

  const brushSweepProgress = interpolateWithEasing(
    elapsed,
    [highlightStart, highlightEnd],
    [0, 1],
    'ease-in-out',
  );
  const brushOpacity = brushSweepProgress <= 0.001
    ? 0
    : interpolateWithEasing(
      elapsed,
      [highlightStart, highlightStart + Math.max(2, Math.round(highlightDuration * 0.35))],
      [0.82, 1],
      'ease-out',
    ) * (1 - exit.progress * 0.45);
  const groupOpacity = exit.opacity;
  const textOpacity = exit.opacity;

  const textMeasurement = useTextMeasurement(style);
  const brushColor = props.highlightColor || theme.colors.primary;
  const measureWidth = (value: string): number => {
    if (!value.trim()) {
      return 0;
    }

    return textMeasurement.ready
      ? textMeasurement.width(value)
      : estimateLineWidth(value, fontSizePx);
  };
  const maxLineWidth = Math.max(
    measureWidth(resolvedLineOne),
    measureWidth(resolvedLineTwo),
  );
  const brushWidth = maxLineWidth + fontSizePx * 1.8;
  const brushHeight = (hasSecondLine ? lineGapPx + fontSizePx * 1.6 : fontSizePx * 1.45) + fontSizePx * 0.55;

  const getLineOneWordClipStyle = (word: string, wordIndex: number): React.CSSProperties => {
    const entryStart = wordIndex * lineOneStaggerDelay;
    const entryProgress = interpolateWithEasing(
      elapsed,
      [entryStart, entryStart + lineOneWordDuration],
      [0, 1],
      'ease-out',
    );
    const visibleProgress = Math.max(0, Math.min(1, entryProgress));
    const isVisible = visibleProgress > MIN_VISIBLE_PROGRESS;
    const measuredWidth = textMeasurement.ready
      ? textMeasurement.width(word)
      : Math.max(fontSizePx, word.trim().length * fontSizePx * 0.72);
    return {
      maxWidth: visibleProgress >= 0.999 ? 'none' : `${measuredWidth * (isVisible ? visibleProgress : 0)}px`,
      marginRight: wordIndex < lineOneWordCount - 1 ? `${fontSizePx * 0.22 * (isVisible ? visibleProgress : 0)}px` : 0,
      opacity: isVisible ? visibleProgress : 0,
      visibility: isVisible ? 'visible' : 'hidden',
    };
  };

  const getLineOneWordInnerStyle = (wordIndex: number): React.CSSProperties => {
    const entryStart = wordIndex * lineOneStaggerDelay;
    const entranceTransform = resolveAnimationPreset({
      frame: elapsed,
      startAt: entryStart,
      duration: lineOneWordDuration,
      presetName: props.entranceAnimation,
      distance: Math.max(fontSizePx * 0.75, 60),
      easing: 'ease-out',
    }).transform;

    return {
      display: 'inline-block',
      whiteSpace: 'nowrap',
      transform: entranceTransform,
    };
  };

  if (!textMeasurement.ready) {
    return null;
  }

  return (
    <div
      id={id}
      className={props.className}
      style={{
        position: 'relative',
        width: brushWidth,
        height: brushHeight + fontSizePx * 0.8,
        transform: groupTransform,
        transformOrigin: 'center center',
        opacity: groupOpacity,
        pointerEvents: 'none',
        ...containerStyle,
      }}
    >
      <svg
        width={brushWidth}
        height={brushHeight}
        viewBox={`0 0 ${BRUSH_VIEWBOX_WIDTH} ${BRUSH_VIEWBOX_HEIGHT}`}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          overflow: 'visible',
          opacity: brushOpacity,
        }}
      >
        {buildBrushPasses(hasSecondLine).map((pass, index) => (
          <path
            key={index}
            d={pass.d}
            fill="none"
            stroke={brushColor}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={pass.width}
            strokeDasharray={`${BRUSH_PATH_LENGTH} ${BRUSH_PATH_LENGTH}`}
            strokeDashoffset={BRUSH_PATH_LENGTH * (1 - brushSweepProgress)}
            opacity={brushSweepProgress <= 0.001 ? 0 : brushOpacity * pass.opacity}
          />
        ))}
      </svg>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
          opacity: textOpacity,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, calc(-50% + ${lineOneY}px))`,
            display: 'inline-flex',
            whiteSpace: 'nowrap',
          }}
        >
          {lineOneWords.map((word, index) => (
            <ClippedText
              key={`${word}-${index}`}
              text={word}
              style={style}
              clipStyle={getLineOneWordClipStyle(word, index)}
              contentStyle={getLineOneWordInnerStyle(index)}
              textMeasurement={textMeasurement}
            />
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: composeTransforms(
              `translate(-50%, calc(-50% + ${lineTwoY}px))`,
              lineTwoTransform,
            ),
            whiteSpace: 'nowrap',
            opacity: lineTwoOpacity,
          }}
        >
          {resolvedLineTwo}
        </div>
      </div>
    </div>
  );
};

export const ProblemHeadlineSchemaFields = [
  {
    "name": "text",
    "type": "string",
    "datatype": "text",
    "map": "props.text"
  },
  {
    "name": "variant",
    "type": "enum",
    "default": ProblemHeadlineDefaults.variant
  },
  {
    "name": "entranceAnimation",
    "type": "enum",
    "map": "props.entranceAnimation",
    "default": ProblemHeadlineDefaults.entranceAnimation
  },
  {
    "name": "highlightColor",
    "type": "string",
    "datatype": "color",
    "default": ProblemHeadlineDefaults.highlightColor
  }
];

export const ProblemHeadlineDescriptor: ComponentRegistration = {
  name: 'ProblemHeadline',
  type: 'scene',
  tags: ['Problem', 'Hook'],
  schema: [{
    type: 'component',
    name: 'problemheadline',
    fields: ProblemHeadlineSchemaFields,
  }],
  llmSchema: [
    {
      name: 'text',
      type: 'string',
      range: '4-6 words'
    },
    {
      name: 'entranceAnimation',
      type: 'enum',
      required: false,
      default: ProblemHeadlineDefaults.entranceAnimation,
    }
  ],
  celExpression: `${CEL_TOTAL_FRAMES}`,
  description: `A short headline scene for concise text with brush paint animation on the text`,
  instructions: 'Use it to show the main problem, key pain point, or an important headline from the script.',
};
