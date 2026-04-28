import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { composeTransforms, usePatchedDragStyle, usePatchedProps, useStyleOverride } from '../../../patches';
import { useStyleContext } from '../../../styles/StyleContext';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { useTheme } from '../../../theme/ThemeContext';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import type { TypographyVariant } from '../../../tokens/semantic';
import { resolveTypography } from '../../../tokens/resolveTypography';
import { Text } from '../../../core/assets/Text';
import type { ComponentRegistration } from '../../../registry/registry';
import { getEntranceTransform } from '../types';
import type { EntranceAnimation, TextCycleTransition } from '../types';
import { measureTextWidth } from '../text/measureText';

export const WordCycleDefaults = {
  id: 'textcycle',
  words: ['First text', 'Second text', 'Third text'],
  holdDuration: 20,
  transitionDuration: 5,
  textCycleTransition: 'slideUp' as TextCycleTransition,
  entranceAnimation: 'slideUp' as EntranceAnimation,
  variant: 'displayXl' as TypographyVariant,
  style: undefined as React.CSSProperties | undefined,
  className: undefined as string | undefined,
};

export type WordCycleProps = Partial<typeof WordCycleDefaults>;

/**
 * Cycles through an array of words with animated transitions.
 *
 * Auto-adjusts container width to the longest word using a hidden spacer —
 * no layout reflow occurs when words change, eliminating jerk in Stack/Row layouts.
 */
export const WordCycle: React.FC<WordCycleProps> = (initProps) => {
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();

  const defaultProps = { ...WordCycleDefaults, ...initProps };
  const id = defaultProps.id;
  const props = usePatchedProps(id, defaultProps);

  const patchedVariant = props.variant;
  const actualEntranceAnimation = props.entranceAnimation;
  const styleOverride = useStyleOverride(id);
  const overrideTransform = typeof styleOverride.transform === 'string' ? styleOverride.transform : undefined;

  const cycleDuration = props.holdDuration + props.transitionDuration;
  const entranceDuration = 20;
  const entranceProgress = interpolateWithEasing(
    frame,
    [0, entranceDuration],
    [0, 1],
    'ease-out',
  );
  const entranceTransform = getEntranceTransform(actualEntranceAnimation, entranceProgress);
  const dragStyle = usePatchedDragStyle(id, entranceTransform, props.style?.transform, overrideTransform);
  const typographyStyle = resolveTypography(patchedVariant, styleConfig, theme, preset);
  const textOverrideStyle: React.CSSProperties = {
    ...styleOverride,
  };
  delete textOverrideStyle.transform;

  const spacerMeasurementStyle = useMemo(
    () => ({
      ...typographyStyle,
      ...textOverrideStyle,
    }),
    [textOverrideStyle, typographyStyle],
  );

  // Reserve width using the widest rendered word, not the longest string.
  const widestWord = useMemo(
    () => props.words.reduce((widest, candidate) => (
      measureTextWidth(candidate, spacerMeasurementStyle) > measureTextWidth(widest, spacerMeasurementStyle)
        ? candidate
        : widest
    ), ''),
    [props.words, spacerMeasurementStyle],
  );

  if (props.words.length === 0) {
    return (
      <span
        id={id}
        className={props.className}
        style={{
          ...typographyStyle,
          opacity: entranceProgress,
          display: 'inline-block',
          ...props.style,
          ...dragStyle,
        }}
      >
        <Text text="" variant={patchedVariant} style={textOverrideStyle} />
      </span>
    );
  }

  const elapsed = Math.max(0, frame);
  const holdDuration = props.holdDuration;
  const transitionDuration = props.transitionDuration;
  const lastCycleIndex = props.words.length - 1;
  const cycleIndex = Math.min(Math.floor(elapsed / cycleDuration), lastCycleIndex);
  const cycleFrame = elapsed - cycleIndex * cycleDuration;

  const currentWord = props.words[cycleIndex % props.words.length] ?? props.words[0] ?? '';
  const nextWord = props.words[Math.min(cycleIndex + 1, lastCycleIndex)] ?? currentWord;
  const isTransitioning = cycleFrame >= holdDuration && cycleIndex < lastCycleIndex;

  const transitionProgress = isTransitioning
    ? interpolateWithEasing(
      cycleFrame,
      [holdDuration, holdDuration + transitionDuration],
      [0, 1],
      'ease-out',
    )
    : 0;

  // Outer container — sized by the invisible spacer (widestWord), never by
  // the visible word. This is what eliminates layout reflow.
  const containerStyle: React.CSSProperties = {
    ...typographyStyle,
    opacity: entranceProgress,
    position: 'relative',
    display: 'inline-block',
    ...props.style,
    ...dragStyle,
  };

  // Invisible spacer — always renders the widest word to hold container width.
  const spacerStyle: React.CSSProperties = {
    visibility: 'hidden',
    whiteSpace: 'nowrap',
    display: 'block',
    pointerEvents: 'none',
    userSelect: 'none',
    // Occupy height too so the container height is stable, with a little
    // extra room for descenders during clipped slide transitions.
    lineHeight: 'inherit',
    paddingTop: '0.08em',
    paddingBottom: '0.08em',
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

  if (props.textCycleTransition === 'fadeSwap') {
    return (
      <span id={id} className={props.className} style={containerStyle}>
        {/* Spacer holds the width — never visible */}
        <Text text={widestWord} variant={patchedVariant} style={spacerStyle} />

        {/* Current word fades out during transition */}
        <Text
          text={currentWord}
          variant={patchedVariant}
          style={{
            ...absoluteLayerStyle,
            ...textOverrideStyle,
            opacity: isTransitioning ? 1 - transitionProgress : 1,
          }}
        />

        {/* Next word fades in during transition */}
        {isTransitioning && (
          <Text
            text={nextWord}
            variant={patchedVariant}
            style={{
              ...absoluteLayerStyle,
              ...textOverrideStyle,
              opacity: transitionProgress,
            }}
          />
        )}
      </span>
    );
  }

  if (props.textCycleTransition === 'slideUp') {
    return (
      <span id={id} className={props.className} style={{ ...containerStyle, overflow: 'hidden' }}>
        <Text text={widestWord} variant={patchedVariant} style={spacerStyle} />

        <Text
          text={currentWord}
          variant={patchedVariant}
          style={{
            ...absoluteLayerStyle,
            ...textOverrideStyle,
            transform: composeTransforms(
              typeof textOverrideStyle.transform === 'string' ? textOverrideStyle.transform : undefined,
              isTransitioning ? `translateY(-${transitionProgress * 100}%)` : 'translateY(0)',
            ),
            opacity: isTransitioning ? 1 - transitionProgress : 1,
          }}
        />

        {isTransitioning && (
          <Text
            text={nextWord}
            variant={patchedVariant}
            style={{
              ...absoluteLayerStyle,
              ...textOverrideStyle,
              transform: composeTransforms(
                typeof textOverrideStyle.transform === 'string' ? textOverrideStyle.transform : undefined,
                `translateY(${(1 - transitionProgress) * 100}%)`,
              ),
              opacity: transitionProgress,
            }}
          />
        )}
      </span>
    );
  }

  // flipY
  return (
    <span className={props.className} style={containerStyle} id={id}>
      <Text text={widestWord} variant={patchedVariant} style={spacerStyle} />

      <Text
        text={currentWord}
        variant={patchedVariant}
        style={{
          ...absoluteLayerStyle,
          ...textOverrideStyle,
          transform: composeTransforms(
            typeof textOverrideStyle.transform === 'string' ? textOverrideStyle.transform : undefined,
            isTransitioning ? `rotateX(${transitionProgress * 90}deg)` : 'rotateX(0deg)',
          ),
          opacity: isTransitioning ? 1 - transitionProgress : 1,
        }}
      />

      {isTransitioning && (
        <Text
          text={nextWord}
          variant={patchedVariant}
          style={{
            ...absoluteLayerStyle,
            ...textOverrideStyle,
            transform: composeTransforms(
              typeof textOverrideStyle.transform === 'string' ? textOverrideStyle.transform : undefined,
              `rotateX(${(1 - transitionProgress) * -90}deg)`,
            ),
            opacity: transitionProgress,
          }}
        />
      )}
    </span>
  );
}

// ============================================================================
// Registry Descriptor
// ===========================================================================

const WordCycleSchemaFields = [
  {
    "name": "words",
    "type": "array",
    "subtype": "string",
    "map": "props.words"
  },
  {
    "name": "variant",
    "type": "string",
    "subtype": "enum",
    "default": WordCycleDefaults.variant
  },
  {
    "name": "entranceAnimation",
    "type": "string",
    "subtype": "enum",
    "map": "props.entranceAnimation",
    "default": WordCycleDefaults.entranceAnimation
  },
  {
    "name": "textCycleTransition",
    "type": "string",
    "subtype": "enum",
    "default": WordCycleDefaults.textCycleTransition
  },
  {
    "name": "holdDuration",
    "type": "number",
    "default": WordCycleDefaults.holdDuration
  },
  {
    "name": "transitionDuration",
    "type": "number",
    "default": WordCycleDefaults.transitionDuration
  }
]


export const WordCycleDescriptor: ComponentRegistration = {
  name: 'WordCycle',
  type: 'content',
  schema: [{
    type: "component",
    name: 'wordcycle',
    fields: WordCycleSchemaFields
  }],
  llmSchema: [
    {
      name: 'words',
      type: 'array',
      "items": {
        "type": "string"
      }
    },
    {
      name: 'entranceAnimation',
      type: 'enum',
      required: false,
      default: WordCycleDefaults.entranceAnimation,
    }
  ],
  description: 'Rotates through words on a bold background. Use for emphasis words, or highlighting multiple key points.',
  celExpression: '(props.wordcycle.holdDuration + props.wordcycle.transitionDuration) * size(props.wordcycle.words)',
};
