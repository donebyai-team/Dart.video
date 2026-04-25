import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { usePatchedProps, useStyleOverride } from '../../../patches';
import { buildDepthShadow, DEFAULT_MEDIA_DEPTH, useAspectPreset, useStyleContext } from '../../../styles';
import { useTheme } from '../../../theme';
import { resolveTypography } from '../../../tokens';
import type { TypographyVariant } from '../../../tokens/semantic';
import { Text } from '../../../core/assets/Text';
import { IconTextPillDefaults } from '../../../core/assets/IconTextPill';
import { normalizeContainerStyle } from '../../../core/assets/ContainerAsset';
import type { ComponentRegistration } from '../../../registry/registry';
import { Counter } from './Counter';

const DEFAULT_COUNTER_DURATION = 50;
const DEFAULT_COUNTER_DELAY = 10;
const DEFAULT_ANIMATION_DELAY = 12;
const DEFAULT_HOLD_DURATION = 30;

const StatCounterContainerDefaults = {
  backgroundColor: IconTextPillDefaults.backgroundColor,
  borderRadius: 0,
  borderWidth: 0,
  borderColor: IconTextPillDefaults.borderColor,
  padding: 50,
  gap: 50,
  boxShadow: buildDepthShadow(DEFAULT_MEDIA_DEPTH),
};

export const StatCounterDefaults = {
  containerId: 'container',
  container: {
    style: StatCounterContainerDefaults as React.CSSProperties,
  },
  counter: {
    from: 0,
    to: 50000,
    format: '0,0' as string | undefined,
    prefix: undefined as string | undefined,
    suffix: undefined as string | undefined,
    variant: 'displayLg' as TypographyVariant,
  },
  text: {
    text: 'Total Users',
    variant: 'subheading' as TypographyVariant,
  },
  animationDelay: DEFAULT_ANIMATION_DELAY,
  counterDelay: DEFAULT_COUNTER_DELAY,
  counterDuration: DEFAULT_COUNTER_DURATION,
};

export type StatCounterProps = Partial<typeof StatCounterDefaults> & { id?: string };

export const StatCounter: React.FC<StatCounterProps> = (initProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();

  const defaultProps = { ...StatCounterDefaults, ...initProps };
  const counterProps = usePatchedProps('counter', defaultProps.counter);
  const textProps = usePatchedProps('text', defaultProps.text);
  const containerStyleOverride = useStyleOverride('container');

  const containerStyle = normalizeContainerStyle(
    StatCounterContainerDefaults,
    containerStyleOverride,
  ).style;

  const scaleSpring = spring({
    frame: Math.max(0, frame - DEFAULT_ANIMATION_DELAY),
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const numberTypography = resolveTypography(counterProps.variant, styleConfig, theme, preset);
  const labelTypography = resolveTypography(textProps.variant, styleConfig, theme, preset);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transformOrigin: 'center',
      }}
    >
      <div
        id='container'
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '45%',
          maxWidth: '86%',
          textAlign: 'center',
          transform: `scale(${scaleSpring})`,
          ...containerStyle,
        }}
      >
        <Counter
          id='counter'
          from={counterProps.from}
          to={counterProps.to}
          format={counterProps.format}
          prefix={counterProps.prefix}
          suffix={counterProps.suffix}
          variant={counterProps.variant}
          startAt={DEFAULT_COUNTER_DELAY}
          durationInFrames={DEFAULT_COUNTER_DURATION}
          style={{
            ...numberTypography,
            textShadow: buildDepthShadow(2),
          }}
        />
        <Text
          id='text'
          text={textProps.text}
          variant={textProps.variant}
          style={{
            ...labelTypography,
            opacity: 0.8,
          }}
        />
      </div>
    </div>
  );
};

export const StatCounterAssetSchema = [
  {
    type: 'component',
    name: 'container',
    fields: [
      {
        name: 'style',
        type: 'object',
        dataType: 'style',
        default: StatCounterContainerDefaults,
      },
    ],
  },
  {
    type: 'component',
    name: 'text',
    fields: [
      {
        name: 'label',
        type: 'string',
        map: 'props.label',
      },
      {
        name: 'variant',
        type: 'string',
        subtype: 'enum',
        default: StatCounterDefaults.text.variant,
      }
    ],
  },
  {
    type: 'component',
    name: 'counter',
    fields: [
      {
        name: 'label',
        type: 'string',
        map: 'props.label',
      },
      {
        name: 'variant',
        type: 'string',
        subtype: 'enum',
        default: StatCounterDefaults.counter.variant,
      },
      {
        name: 'from',
        type: 'number',
        map: 'props.from',
        default: StatCounterDefaults.counter.from,
      },
      {
        name: 'to',
        type: 'number',
        map: 'props.to',
        default: StatCounterDefaults.counter.to,
      },
      {
        name: 'prefix',
        type: 'string',
        map: 'props.prefix',
      },
      {
        name: 'suffix',
        type: 'string',
        map: 'props.suffix',
      }
    ],
  },
];

export const StatCounterDescriptor: ComponentRegistration = {
  name: 'StatCounter',
  type: 'content',
  schema: StatCounterAssetSchema,
  llmSchema: [
    {
      name: 'label',
      type: 'string',
    },
    {
      name: 'from',
      type: 'number',
    },
    {
      name: 'to',
      type: 'number',
    },
    {
      name: 'prefix',
      type: 'string',
      required: false,
    },
    {
      name: 'suffix',
      type: 'string',
      required: false,
    },
  ],
  description: 'Centered animated metric counter with a short 2-3 word label below it. Use for large number, single stat, metric, or KPI with or without prefix/suffix eg. 1240, 500$, 500K, 500M',
  celExpression: `${DEFAULT_COUNTER_DELAY + DEFAULT_COUNTER_DURATION + DEFAULT_HOLD_DURATION}`,
};
