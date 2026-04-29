import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import type { ComponentRegistration } from '../../../registry/registry';
import { usePatchedDragStyle, usePatchedProps, useStyleOverride } from '../../../patches';
import { interpolateWithEasing, useAspectPreset } from '../../../styles';
import { useStyleContext } from '../../../styles/StyleContext';
import { useTheme } from '../../../theme';
import { resolveTypography } from '../../../tokens';
import type { TypographyVariant } from '../../../tokens/semantic';
import {
  getHighlightedTextAnimationTransform,
  type HighlightedTextAnimation,
} from '../types';

const DEFAULT_STAGGER_DELAY = 10;
const DEFAULT_REVEAL_DURATION = 4; // Each word starts stagger_delay frames after the previous word, and each word takes reveal_duration frames to fully appear.
const DEFAULT_ANIMATION_DURATION = 22; // Duration of the highlighted text animation.

export const TextHookStaggerDefaults = {
  id: 'texthookstagger',
  startAt: 0,
  text: 'Stop losing easy sales',
  variant: 'display3xl' as TypographyVariant,
  staggerDelay: DEFAULT_STAGGER_DELAY,
  revealDuration: DEFAULT_REVEAL_DURATION,
  highlightedTextAnimation: 'elasticStretch' as HighlightedTextAnimation,
  highlightColor: '',
  animationDuration: DEFAULT_ANIMATION_DURATION,
  className: undefined as string | undefined,
  style: undefined as React.CSSProperties | undefined,
};

export type TextHookStaggerProps = Partial<typeof TextHookStaggerDefaults>;

function splitWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

export const TextHookStagger: React.FC<TextHookStaggerProps> = (initProps) => {
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();
  const defaultProps = { ...TextHookStaggerDefaults, ...initProps };
  const id = defaultProps.id;
  const props = usePatchedProps(id, defaultProps);

  const styleOverride = useStyleOverride(id);
  const overrideTransform = typeof styleOverride.transform === 'string' ? styleOverride.transform : undefined;
  const dragStyle = usePatchedDragStyle(id, props.style?.transform, overrideTransform);
  const typographyStyle = resolveTypography(props.variant, styleConfig, theme, preset);
  const actualHighlightColor = props.highlightColor || theme.colors.primary;
  const elapsed = Math.max(0, frame - props.startAt);
  const words = useMemo(() => splitWords(props.text), [props.text]);
  const lastWordIndex = words.length - 1;
  const allWordsVisibleAt = Math.max(0, lastWordIndex) * props.staggerDelay + props.revealDuration;
  const textAnimationStart = allWordsVisibleAt;

  const getWordStyle = (wordIndex: number): React.CSSProperties => {
    const revealStart = wordIndex * props.staggerDelay;
    const opacity = interpolateWithEasing(
      elapsed,
      [revealStart, revealStart + props.revealDuration],
      [0, 1],
      'ease-out',
    );

    const animationProgress = wordIndex === lastWordIndex
      ? interpolateWithEasing(
        elapsed,
        [textAnimationStart, textAnimationStart + props.animationDuration],
        [0, 1],
        'ease-out',
      )
      : 0;

    return {
      display: 'inline-block',
      marginRight: wordIndex < lastWordIndex ? '0.25em' : 0,
      opacity,
      color: wordIndex === lastWordIndex ? actualHighlightColor : undefined,
      transform: wordIndex === lastWordIndex
        ? getHighlightedTextAnimationTransform(props.highlightedTextAnimation, animationProgress)
        : 'none',
      transformOrigin: 'center center',
      whiteSpace: 'nowrap',
    };
  };

  return (
    <span
      id={id}
      className={props.className}
      style={{
        display: 'block',
        width: '100%',
        maxWidth: '100%',
        textAlign: 'center',
        ...typographyStyle,
        ...props.style,
        ...styleOverride,
        ...dragStyle,
      }}
    >
      {words.map((word, index) => (
        <span key={`${word}-${index}`} style={getWordStyle(index)}>
          {word}
        </span>
      ))}
    </span>
  );
};

export const TextHookStaggerSchemaFields = [
  {
    name: 'text',
    type: 'string',
    datatype: 'text',
    map: 'props.text',
  },
  {
    name: 'variant',
    type: 'enum',
    default: TextHookStaggerDefaults.variant,
  },
  {
    name: 'staggerDelay',
    type: 'number',
    default: TextHookStaggerDefaults.staggerDelay,
  },
  {
    name: 'highlightedTextAnimation',
    type: 'enum',
    default: TextHookStaggerDefaults.highlightedTextAnimation,
  },
  {
    name: 'highlightColor',
    type: 'string',
    datatype: 'color',
    default: TextHookStaggerDefaults.highlightColor,
  },
];

export const TextHookStaggerDescriptor: ComponentRegistration = {
  name: 'TextHookStagger',
  type: 'scene',
  tags: ['Intro', 'Hook'],
  schema: [{
    type: 'component',
    name: 'texthookstagger',
    fields: TextHookStaggerSchemaFields,
  }],
  llmSchema: [
    {
      name: 'text',
      type: 'string',
    },
  ],
  description: 'Reveals a short hook or intro phrase word-by-word. Best for 4-5 word hook/intro scenes.',
  celExpression: `max(0, segmentCount(props.texthookstagger.text, "word") - 1) * props.texthookstagger.staggerDelay + ${DEFAULT_REVEAL_DURATION} + ${DEFAULT_ANIMATION_DURATION}`,
};
