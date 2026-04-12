import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { usePatchedDragStyle, usePatchedProps, useStyleOverride } from '../../../patches';
import { useStyleContext } from '../../../styles/StyleContext';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { useTheme } from '../../../theme/ThemeContext';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens/semantic';
import { resolveTypography } from '../../../tokens/resolveTypography';
import { Text } from '../../../core/assets/Text';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../durationTypes';
import { TEXT_CYCLE_TRANSITIONS, HIGHLIGHT_STYLES } from '../types';

// Default constants
const DEFAULT_HOLD_DURATION = 20;
const DEFAULT_TRANSITION_DURATION = 10;
const DEFAULT_TRANSITION = 'slideUp' as const;
const DEFAULT_VARIANT = 'heading' as const;
const DEFAULT_HIGHLIGHT_STYLE = 'background' as const;


// Use z.input for props (what callers pass) - fields with defaults are optional
export type TextWithWordCycleProps = z.input<typeof TextWithWordCycleSchema>;

/**
 * Displays static text followed by cycling highlighted words with animated transitions.
 * 
 * Example: "We build amazing [software/products/solutions]" where the bracketed words cycle.
 */
export const TextWithWordCycle: React.FC<TextWithWordCycleProps> = (propsInit: TextWithWordCycleProps) => {
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();

  const patchedProps = usePatchedProps(propsInit.id, propsInit);
  const props = { ...TextWithWordCycleSchema.parse(patchedProps), id: propsInit.id };

  const patchedVariant = props.variant ?? DEFAULT_VARIANT;
  const actualHighlightStyle = props.highlightStyle ?? DEFAULT_HIGHLIGHT_STYLE;
  const actualHighlightColor = props.highlightColor ?? theme.colors.primary;
  const styleOverride = useStyleOverride(props.id);
  const dragStyle = usePatchedDragStyle(props.id, props.style?.transform);

  const cycleDuration = (props.holdDuration ?? DEFAULT_HOLD_DURATION) + (props.transitionDuration ?? DEFAULT_TRANSITION_DURATION);
  const typographyStyle = resolveTypography(patchedVariant, styleConfig, theme, preset);

  // The longest word by character count — used as an invisible spacer
  const longestWord = useMemo(
    () => props.cyclingWords.reduce((a, b) => (a.length >= b.length ? a : b), ''),
    [props.cyclingWords],
  );

  if (props.cyclingWords.length === 0) {
    return (
      <Text
        text={props.text}
        variant={patchedVariant}
        className={props.className}
        style={{ ...props.style, ...styleOverride, ...dragStyle }}
      />
    );
  }

  const elapsed = Math.max(0, frame);
  const holdDuration = props.holdDuration ?? DEFAULT_HOLD_DURATION;
  const transitionDuration = props.transitionDuration ?? DEFAULT_TRANSITION_DURATION;
  const lastCycleIndex = props.cyclingWords.length - 1;
  const cycleIndex = Math.min(Math.floor(elapsed / cycleDuration), lastCycleIndex);
  const cycleFrame = elapsed - cycleIndex * cycleDuration;

  const currentWord = props.cyclingWords[cycleIndex % props.cyclingWords.length] ?? props.cyclingWords[0] ?? '';
  const nextWord = props.cyclingWords[Math.min(cycleIndex + 1, lastCycleIndex)] ?? currentWord;
  const isTransitioning = cycleFrame >= holdDuration && cycleIndex < lastCycleIndex;

  const transitionProgress = isTransitioning
    ? interpolateWithEasing(
      cycleFrame,
      [holdDuration, holdDuration + transitionDuration],
      [0, 1],
      'ease-out',
    )
    : 0;

  const getHighlightStyles = (baseStyle: React.CSSProperties): React.CSSProperties => {
    switch (actualHighlightStyle) {
      case 'marker':
        return {
          ...baseStyle,
          background: `${actualHighlightColor}88`,
          padding: '2px 4px',
          margin: '0 -4px',
          display: 'inline-block',
        };

      case 'underline':
        return {
          ...baseStyle,
          borderBottom: `3px solid ${actualHighlightColor}`,
          paddingBottom: '2px',
          display: 'inline-block',
        };

      case 'box':
        return {
          ...baseStyle,
          border: `2px solid ${actualHighlightColor}`,
          borderRadius: '4px',
          padding: '2px 6px',
          margin: '0 2px',
          display: 'inline-block',
        };

      case 'glow':
        return {
          ...baseStyle,
          textShadow: `0 0 20px ${actualHighlightColor}`,
          color: actualHighlightColor,
          display: 'inline-block',
        };

      case 'background':
        return {
          ...baseStyle,
          backgroundColor: actualHighlightColor,
          color: '#000',
          borderRadius: '4px',
          padding: '2px 6px',
          margin: '0 2px',
          display: 'inline-block',
        };

      default:
        return baseStyle;
    }
  };

  // Container for the cycling word section
  const cycleContainerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    marginLeft: props.text ? '0.2em' : '0',
  };

  // Invisible spacer
  const spacerStyle: React.CSSProperties = {
    visibility: 'hidden',
    whiteSpace: 'pre-wrap',
    display: 'block',
    pointerEvents: 'none',
    userSelect: 'none',
    lineHeight: 'inherit',
  };

  // Visible words are absolutely positioned
  const absoluteLayerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'flex-start',
    whiteSpace: 'nowrap',
  };

  const renderCyclingWords = () => {
    const baseWordStyle: React.CSSProperties = {
      whiteSpace: 'nowrap',
      display: 'inline-block',
    };

    if (props.textCycleTransition === 'fadeSwap') {
      return (
        <span style={cycleContainerStyle}>
          <span style={spacerStyle}>{longestWord}</span>

          <Text
            text={currentWord}
            variant={patchedVariant}
            style={getHighlightStyles({
              ...absoluteLayerStyle,
              ...baseWordStyle,
              opacity: isTransitioning ? 1 - transitionProgress : 1,
            })}
          />

          {isTransitioning && (
            <Text
              text={nextWord}
              variant={patchedVariant}
              style={getHighlightStyles({
                ...absoluteLayerStyle,
                ...baseWordStyle,
                opacity: transitionProgress,
              })}
            />
          )}
        </span>
      );
    }

    if (props.textCycleTransition === 'slideUp') {
      return (
        <span style={{ ...cycleContainerStyle, overflow: 'hidden' }}>
          <span style={spacerStyle}>{longestWord}</span>

          <Text
            text={currentWord}
            variant={patchedVariant}
            style={getHighlightStyles({
              ...absoluteLayerStyle,
              ...baseWordStyle,
              transform: isTransitioning ? `translateY(-${transitionProgress * 100}%)` : 'translateY(0)',
              opacity: isTransitioning ? 1 - transitionProgress : 1,
            })}
          />

          {isTransitioning && (
            <Text
              text={nextWord}
              variant={patchedVariant}
              style={getHighlightStyles({
                ...absoluteLayerStyle,
                ...baseWordStyle,
                transform: `translateY(${(1 - transitionProgress) * 100}%)`,
                opacity: transitionProgress,
              })}
            />
          )}
        </span>
      );
    }

    // flipY
    return (
      <span style={cycleContainerStyle}>
        <span style={spacerStyle}>{longestWord}</span>

        <Text
          text={currentWord}
          variant={patchedVariant}
          style={getHighlightStyles({
            ...absoluteLayerStyle,
            ...baseWordStyle,
            transform: isTransitioning ? `rotateX(${transitionProgress * 90}deg)` : 'rotateX(0deg)',
            opacity: isTransitioning ? 1 - transitionProgress : 1,
          })}
        />

        {isTransitioning && (
          <Text
            text={nextWord}
            variant={patchedVariant}
            style={getHighlightStyles({
              ...absoluteLayerStyle,
              ...baseWordStyle,
              transform: `rotateX(${(1 - transitionProgress) * -90}deg)`,
              opacity: transitionProgress,
            })}
          />
        )}
      </span>
    );
  };

  return (
    <span
      id={props.id}
      className={props.className}
      style={{
        display: 'inline',
        ...typographyStyle,
        ...props.style,
        ...styleOverride,
        ...dragStyle
      }}
    >
      {props.text && (
        <Text text={props.text} variant={patchedVariant} style={{ display: 'inline', whiteSpace: 'normal' }} />
      )}
      {renderCyclingWords()}
    </span>
  );
};

// ============================================================================
// Registry Descriptor
// ============================================================================

export const TextWithWordCycleSchema = z.object({
  id: z.string().optional(),
  text: z.string().default(''),
  cyclingWords: z.array(z.string()).default([]),
  holdDuration: z.number().default(DEFAULT_HOLD_DURATION).optional(),
  transitionDuration: z.number().default(DEFAULT_TRANSITION_DURATION).optional(),
  textCycleTransition: z.enum(TEXT_CYCLE_TRANSITIONS).default(DEFAULT_TRANSITION).optional(),
  variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).default(DEFAULT_VARIANT).optional(),
  highlightStyle: z.enum(HIGHLIGHT_STYLES).default(DEFAULT_HIGHLIGHT_STYLE).optional(),
  highlightColor: z.string().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});


const TextWithWordCycleSchemaFields = [
  {
    "name": "text",
    "type": "string",

    "required": true,
    "map": "props.text"
  },
  {
    "name": "cyclingWords",
    "type": "array",

    "required": true,
    "map": "props.cyclingWords",
    "default": []
  },
  {
    "name": "variant",
    "type": "string",
    "sub_type": "enum",
    "default": DEFAULT_VARIANT
  },
  {
    "name": "holdDuration",
    "type": "number",
    "default": DEFAULT_HOLD_DURATION
  },
  {
    "name": "transitionDuration",
    "type": "number",
    "default": DEFAULT_TRANSITION_DURATION
  },
  {
    "name": "textCycleTransition",
    "type": "string",
    "subtype": "enum",
    "default": DEFAULT_TRANSITION
  }
]

export const TextWithWordCycleDescriptor: ComponentRegistration = {
  name: 'TextWithWordCycle',
  type: 'content',
  schema: [{
    type: 'component',
    name: 'textwithwordcycle',
    fields: TextWithWordCycleSchemaFields
  }],
  llmSchema: [
    {
      name: 'text',
      type: 'string',
    },
    {
      name: 'cyclingWords',
      type: 'array',
      "items": {
        "type": "string"
      }
    }
  ],
  description: 'Static text with cycling highlighted words at the end. Use for dynamic taglines like "We build amazing [software/products/solutions]"',
  celExpression: 'ceil((props.holdDuration + props.transitionDuration) * size(props.cyclingWords))',
};
