import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { usePatchedDragStyle, usePatchedProps, useStyleOverride } from '../../../patches';
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

export const TextCycleDefaults = {
  id: 'textcycle',
  texts: ['First text', 'Second text', 'Third text'],
  holdDuration: 20,
  transitionDuration: 5,
  textCycleTransition: 'slideUp' as TextCycleTransition,
  entranceAnimation: 'slideUp' as EntranceAnimation,
  variant: 'display' as TypographyVariant,
  style: undefined as React.CSSProperties | undefined,
  className: undefined as string | undefined,
};

export type TextCycleProps = Partial<typeof TextCycleDefaults>;

/**
 * Cycles through an array of words with animated transitions.
 *
 * Auto-adjusts container width to the longest word using a hidden spacer —
 * no layout reflow occurs when words change, eliminating jerk in Stack/Row layouts.
 */
export const TextCycle: React.FC<TextCycleProps> = (initProps) => {
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();

  const defaultProps = { ...TextCycleDefaults, ...initProps };
  const id = defaultProps.id;
  const props = usePatchedProps(id, defaultProps);

  const patchedVariant = props.variant;
  const actualEntranceAnimation = props.entranceAnimation;
  const styleOverride = useStyleOverride(id);

  const cycleDuration = props.holdDuration + props.transitionDuration;
  const entranceDuration = 20;
  const entranceProgress = interpolateWithEasing(
    frame,
    [0, entranceDuration],
    [0, 1],
    'ease-out',
  );
  const entranceTransform = getEntranceTransform(actualEntranceAnimation, entranceProgress);
  const dragStyle = usePatchedDragStyle(id, entranceTransform, props.style?.transform);
  const typographyStyle = resolveTypography(patchedVariant, styleConfig, theme, preset);

  // The longest word by character count — used as an invisible spacer to
  // hold the container width stable across all word changes.
  const longestWord = useMemo(
    () => props.texts.reduce((a, b) => (a.length >= b.length ? a : b), ''),
    [props.texts],
  );

  if (props.texts.length === 0) {
    return (
      <span
        id={id}
        className={props.className}
        style={{
          ...typographyStyle,
          opacity: entranceProgress,
          display: 'inline-block',
          ...props.style,
          ...styleOverride,
          ...dragStyle,
        }}
      >
        <Text text="" variant={patchedVariant} />
      </span>
    );
  }

  const elapsed = Math.max(0, frame);
  const holdDuration = props.holdDuration;
  const transitionDuration = props.transitionDuration;
  const lastCycleIndex = props.texts.length - 1;
  const cycleIndex = Math.min(Math.floor(elapsed / cycleDuration), lastCycleIndex);
  const cycleFrame = elapsed - cycleIndex * cycleDuration;

  const currentWord = props.texts[cycleIndex % props.texts.length] ?? props.texts[0] ?? '';
  const nextWord = props.texts[Math.min(cycleIndex + 1, lastCycleIndex)] ?? currentWord;
  const isTransitioning = cycleFrame >= holdDuration && cycleIndex < lastCycleIndex;

  const transitionProgress = isTransitioning
    ? interpolateWithEasing(
      cycleFrame,
      [holdDuration, holdDuration + transitionDuration],
      [0, 1],
      'ease-out',
    )
    : 0;

  // Outer container — sized by the invisible spacer (longestWord), never by
  // the visible word. This is what eliminates layout reflow.
  const containerStyle: React.CSSProperties = {
    ...typographyStyle,
    opacity: entranceProgress,
    position: 'relative',
    display: 'inline-block',
    ...props.style,
    ...styleOverride,
    ...dragStyle,
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

  if (props.textCycleTransition === 'fadeSwap') {
    return (
      <span id='textcycle' className={props.className} style={containerStyle}>
        {/* Spacer holds the width — never visible */}
        <Text text={longestWord} variant={patchedVariant} style={spacerStyle} />

        {/* Current word fades out during transition */}
        <Text
          text={currentWord}
          variant={patchedVariant}
          style={{ ...absoluteLayerStyle, opacity: isTransitioning ? 1 - transitionProgress : 1 }}
        />

        {/* Next word fades in during transition */}
        {isTransitioning && (
          <Text
            text={nextWord}
            variant={patchedVariant}
            style={{ ...absoluteLayerStyle, opacity: transitionProgress }}
          />
        )}
      </span>
    );
  }

  if (props.textCycleTransition === 'slideUp') {
    return (
      <span className={props.className} style={{ ...containerStyle, overflow: 'hidden' }}>
        <Text text={longestWord} variant={patchedVariant} style={spacerStyle} />

        <Text
          text={currentWord}
          variant={patchedVariant}
          style={{
            ...absoluteLayerStyle,
            transform: isTransitioning ? `translateY(-${transitionProgress * 100}%)` : 'translateY(0)',
            opacity: isTransitioning ? 1 - transitionProgress : 1,
          }}
        />

        {isTransitioning && (
          <Text
            text={nextWord}
            variant={patchedVariant}
            style={{
              ...absoluteLayerStyle,
              transform: `translateY(${(1 - transitionProgress) * 100}%)`,
              opacity: transitionProgress,
            }}
          />
        )}
      </span>
    );
  }

  // flipY
  return (
    <span className={props.className} style={containerStyle} id={initProps.id}>
      <Text text={longestWord} variant={patchedVariant} style={spacerStyle} />

      <Text
        text={currentWord}
        variant={patchedVariant}
        style={{
          ...absoluteLayerStyle,
          transform: isTransitioning ? `rotateX(${transitionProgress * 90}deg)` : 'rotateX(0deg)',
          opacity: isTransitioning ? 1 - transitionProgress : 1,
        }}
      />

      {isTransitioning && (
        <Text
          text={nextWord}
          variant={patchedVariant}
          style={{
            ...absoluteLayerStyle,
            transform: `rotateX(${(1 - transitionProgress) * -90}deg)`,
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

const TextCycleSchemaFields = [
  {
    "name": "texts",
    "type": "array",
    "subtype": "string",

    "map": "props.texts"
  },
  {
    "name": "variant",
    "type": "string",
    "subtype": "enum",
    "default": TextCycleDefaults.variant
  },
  {
    "name": "entranceAnimation",
    "type": "string",
    "subtype": "enum",
    "default": TextCycleDefaults.entranceAnimation
  },
  {
    "name": "textCycleTransition",
    "type": "string",
    "subtype": "enum",
    "default": TextCycleDefaults.textCycleTransition
  },
  {
    "name": "holdDuration",
    "type": "number",
    "default": TextCycleDefaults.holdDuration
  },
  {
    "name": "transitionDuration",
    "type": "number",
    "default": TextCycleDefaults.transitionDuration
  }
]


export const TextCycleDescriptor: ComponentRegistration = {
  name: 'TextCycle',
  type: 'content',
  schema: [{
    type: "component",
    name: 'textcycle',
    fields: TextCycleSchemaFields
  }],
  llmSchema: [
    {
      name: 'texts',
      type: 'array',
      "items": {
        "type": "string"
      }
    }
  ],
  description: 'Rotates through words or text strings. Works for both single words and longer phrases. Use for taglines, feature lists, or highlighting multiple key points.',
  celExpression: '(props.textcycle.holdDuration + props.textcycle.transitionDuration) * size(props.textcycle.texts)',
};
