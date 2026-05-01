import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useElement } from '../../../patches';
import { useTheme } from '../../../theme/ThemeContext';
import type { TypographyVariant } from '../../../tokens/semantic';
import { useTypography } from '../../../tokens/resolveTypography';
import type { ComponentRegistration } from '../../../registry/registry';
import { Text } from '../../../core/assets';
import { hexToRgb } from '../../../theme';

const TITLE_SPLIT_SETTLE_FRAMES = 20;
const TITLE_SPLIT_HOLD_FRAMES = 16;

export const TitleSplitDefaults = {
  id: 'titlesplit',
  startAt: 0,
  topText: 'AI WILL EDIT',
  bottomText: 'THIS CHANGES',
  variant: 'displayXl' as TypographyVariant,
  glowColor: '',
  gap: 80,
  style: undefined as React.CSSProperties | undefined,
  className: undefined as string | undefined,
};

export type TitleSplitProps = Partial<typeof TitleSplitDefaults>;

export const TitleSplit: React.FC<TitleSplitProps> = (initProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();

  const id = initProps.id ?? TitleSplitDefaults.id;
  const { props, style } = useElement(id, TitleSplitDefaults, initProps, {
    baseStyle: (resolvedProps) => ({
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      gap: resolvedProps.gap,
    }),
  });
  const { transform: _ignoredStyleTransform, ...textStyleOverride } = props.style ?? {};

  const elapsed = Math.max(0, frame - props.startAt);
  const typographyStyle = useTypography(props.variant);
  const glowColor = props.glowColor || theme.colors.primary;


  const topProgress = spring({
    frame: elapsed,
    fps,
    config: { damping: 8, stiffness: 80 },
  });

  const bottomProgress = spring({
    frame: elapsed,
    fps,
    config: { damping: 8, stiffness: 80 },
  });

  const topY = interpolate(topProgress, [0, 1], [-120, 0]);
  const bottomY = interpolate(bottomProgress, [0, 1], [120, 0]);

  const glowOpacity = interpolate(Math.sin(elapsed * 0.1), [-1, 1], [0.3, 0.8]);
  const meetProgress = interpolate(elapsed, [0, TITLE_SPLIT_SETTLE_FRAMES], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const showGlow = meetProgress >= 1;

  const [r, g, b] = hexToRgb(glowColor);

  const glowShadow = showGlow
    ? `0 0 ${20 * glowOpacity}px rgba(${r}, ${g}, ${b}, ${glowOpacity})`
    : 'none';

  const sharedTextStyle: React.CSSProperties = {
    margin: 0,
    letterSpacing: '0.15em',
    lineHeight: 1,
    textAlign: 'center',
    textTransform: 'uppercase',
    ...typographyStyle,
    ...textStyleOverride,
  };

  return (
    <div
      id={id}
      className={props.className}
      style={style}
    >
      <Text
        text={props.topText}
        variant={props.variant}
        style={{
          // WebkitTextStroke: `5px green`,
          transform: `translateY(${topY}px)`,
          ...sharedTextStyle,
          textShadow: glowShadow,
        }}
      />

      <Text
        text={props.bottomText}
        variant={props.variant}
        style={{
          transform: `translateY(${bottomY}px)`,
          ...sharedTextStyle,
          textShadow: glowShadow,
        }}
      />
    </div>
  );
};

export const TitleSplitSchemaFields = [
  {
    name: 'topText',
    type: 'string',
    datatype: 'text',
    map: 'props.topText',
  },
  {
    name: 'bottomText',
    type: 'string',
    datatype: 'text',
    map: 'props.bottomText',
  },
  {
    name: 'variant',
    type: 'enum',
    default: TitleSplitDefaults.variant,
  },
  {
    name: 'glowColor',
    type: 'string',
    datatype: 'color',
    default: TitleSplitDefaults.glowColor,
  },
];

export const TitleSplitDescriptor: ComponentRegistration = {
  name: 'TitleSplit',
  type: 'content',
  tags: [
    'Hook',
    'Intro',
    'Solution',
    'Problem',
  ],
  schema: [{
    type: 'component',
    name: 'titlesplit',
    fields: TitleSplitSchemaFields,
  }],
  llmSchema: [
    {
      name: 'topText',
      type: 'string',
      range: '1-3 words or around 6-12 characters',
      hint: 'Start of a short, high-impact phrase. Keep it concise and clear. Example: "AI WILL EDIT", "CREATE FAST", "STOP WASTING"',
    },
    {
      name: 'bottomText',
      type: 'string',
      range: '1-3 words or around 6-12 characters',
      hint: 'Continuation of the phrase with topText to complete the idea. Example: "YOUR VIDEOS", "IN SECONDS", "TIME TODAY"',
    }
  ],
  description: `
Use this component for short, high-impact phrases that need strong emphasis, like intros, key statements, or transitions. 
Works best when both lines combine into one clear idea and the wording is concise, not conversational.

  `.trim(),
  celExpression: `${TITLE_SPLIT_SETTLE_FRAMES + TITLE_SPLIT_HOLD_FRAMES}`,
};
