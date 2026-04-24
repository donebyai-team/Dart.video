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
import type { EntranceAnimation, HighlightStyle, TextCycleTransition } from '../types';
import { measureTextWidth } from './measureText';

export const TextWithWordCycleDefaults = {
  id: 'textwithwordcycle',
  text: 'Sample text',
  cyclingWords: ['first word', 'next word', 'last word'],
  holdDuration: 20,
  transitionDuration: 10,
  textCycleTransition: 'slideUp' as TextCycleTransition,
  entranceAnimation: 'slideUp' as EntranceAnimation,
  variant: 'heading' as TypographyVariant,
  highlightStyle: 'background' as HighlightStyle,
  highlightColor: undefined as string | undefined,
  style: undefined as React.CSSProperties | undefined,
  className: undefined as string | undefined,
};

export type TextWithWordCycleProps = typeof TextWithWordCycleDefaults;

/**
 * Displays static text followed by cycling highlighted words with animated transitions.
 * 
 * Example: "We build amazing [software/products/solutions]" where the bracketed words cycle.
 */
export const TextWithWordCycle: React.FC<TextWithWordCycleProps> = (initProps) => {
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();
  const defaultProps = { ...TextWithWordCycleDefaults, ...initProps };
  const id = defaultProps.id;

  const props = usePatchedProps(id, defaultProps);

  const patchedVariant = props.variant;
  const actualHighlightStyle = props.highlightStyle;
  const actualHighlightColor = props.highlightColor ?? theme.colors.primary;
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
  const containerStyle: React.CSSProperties = {
    display: 'inline',
    opacity: entranceProgress,
    ...typographyStyle,
    ...props.style,
    ...styleOverride,
    ...dragStyle,
  };

  const spacerMeasurementStyle = useMemo(
    () => ({
      ...typographyStyle,
    }),
    [typographyStyle],
  );

  // Reserve width using the widest rendered word, not the longest string.
  const widestWord = useMemo(
    () => props.cyclingWords.reduce((widest, candidate) => (
      measureTextWidth(candidate, spacerMeasurementStyle) > measureTextWidth(widest, spacerMeasurementStyle)
        ? candidate
        : widest
    ), ''),
    [props.cyclingWords, spacerMeasurementStyle],
  );

  if (props.cyclingWords.length === 0) {
    return (
      <span id={id} className={props.className} style={containerStyle}>
        <Text
          text={props.text}
          variant={patchedVariant}
          style={{ display: 'inline', whiteSpace: 'normal' }}
        />
      </span>
    );
  }

  const elapsed = Math.max(0, frame);
  const holdDuration = props.holdDuration;
  const transitionDuration = props.transitionDuration;
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

  // Keep the cycling segment in normal inline flow while overlaying animated words
  // on top of an invisible width reservation for the widest entry.
  const cycleContainerStyle: React.CSSProperties = {
    display: 'inline-grid',
    gridTemplateColumns: 'auto',
    gridTemplateRows: 'auto',
    alignItems: 'baseline',
    verticalAlign: 'baseline',
  };

  // Invisible spacer
  const spacerStyle: React.CSSProperties = {
    gridArea: '1 / 1',
    visibility: 'hidden',
    whiteSpace: 'nowrap',
    display: 'inline-block',
    pointerEvents: 'none',
    userSelect: 'none',
    lineHeight: 'inherit',
    paddingTop: '0.08em',
    paddingBottom: '0.08em',
  };

  // Animated words share the same grid cell as the spacer, so the full sentence
  // stays inline and responsive while we still get overlapping transitions.
  const overlayLayerStyle: React.CSSProperties = {
    gridArea: '1 / 1',
    whiteSpace: 'nowrap',
    alignSelf: 'baseline',
    justifySelf: 'start',
  };

  const renderCyclingWords = () => {
    const baseWordStyle: React.CSSProperties = {
      whiteSpace: 'nowrap',
      display: 'inline-block',
    };

    if (props.textCycleTransition === 'fadeSwap') {
      return (
        <span style={cycleContainerStyle}>
          <span style={spacerStyle}>{widestWord}</span>

          <Text
            text={currentWord}
            variant={patchedVariant}
            style={getHighlightStyles({
              ...overlayLayerStyle,
              ...baseWordStyle,
              opacity: isTransitioning ? 1 - transitionProgress : 1,
            })}
          />

          {isTransitioning && (
            <Text
              text={nextWord}
              variant={patchedVariant}
              style={getHighlightStyles({
                ...overlayLayerStyle,
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
          <span style={spacerStyle}>{widestWord}</span>

          <Text
            text={currentWord}
            variant={patchedVariant}
            style={getHighlightStyles({
              ...overlayLayerStyle,
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
                ...overlayLayerStyle,
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
        <span style={spacerStyle}>{widestWord}</span>

        <Text
          text={currentWord}
          variant={patchedVariant}
          style={getHighlightStyles({
            ...overlayLayerStyle,
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
              ...overlayLayerStyle,
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
      id={id}
      className={props.className}
      style={containerStyle}
    >
      {props.text && (
        <Text text={props.text} variant={patchedVariant} style={{ display: 'inline', whiteSpace: 'normal' }} />
      )}
      {props.text ? ' ' : null}
      {renderCyclingWords()}
    </span>
  );
};

// ============================================================================
// Registry Descriptor
// ============================================================================

export const TextWithWordCycleSchemaFields = [
  {
    "name": "text",
    "type": "string",
    "map": "props.text"
  },
  {
    "name": "cyclingWords",
    "type": "array",
    "map": "props.cyclingWords",
    "default": []
  },
  {
    "name": "variant",
    "type": "string",
    "sub_type": "enum",
    "default": TextWithWordCycleDefaults.variant
  },
  {
    "name": "entranceAnimation",
    "type": "string",
    "subtype": "enum",
    "default": TextWithWordCycleDefaults.entranceAnimation
  },
  {
    "name": "holdDuration",
    "type": "number",
    "default": TextWithWordCycleDefaults.holdDuration
  },
  {
    "name": "transitionDuration",
    "type": "number",
    "default": TextWithWordCycleDefaults.transitionDuration
  },
  {
    "name": "textCycleTransition",
    "type": "string",
    "subtype": "enum",
    "default": TextWithWordCycleDefaults.textCycleTransition
  },
  {
    "name": "highlightStyle",
    "type": "string",
    "subtype": "enum",
    "default": TextWithWordCycleDefaults.highlightStyle
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
  celExpression: '(props.textwithwordcycle.holdDuration + props.textwithwordcycle.transitionDuration) * size(props.textwithwordcycle.cyclingWords)',
};
