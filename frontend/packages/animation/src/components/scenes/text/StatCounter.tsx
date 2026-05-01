import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useElement } from '../../../patches';
import { buildDepthShadow, DEFAULT_MEDIA_DEPTH } from '../../../styles';
import { useTypography } from '../../../tokens';
import type { TypographyVariant } from '../../../tokens/semantic';
import { Text } from '../../../core/assets/Text';
import { normalizeContainerStyle } from '../../../core/assets/ContainerAsset';
import type { ComponentRegistration } from '../../../registry/registry';
import { Counter } from './Counter';
import { DEFAULT_SPEED_PERCENTAGE, getSpeed, MIN_SPEED_PERCENTAGE, scaleTiming } from '../../../speed/timings';

const BASE_COUNTER_DURATION = 50;
const BASE_COUNTER_DELAY = 10;
const BASE_ANIMATION_DELAY = 12;
const BASE_HOLD_DURATION = 2;

const StatCounterContainerDefaults = {
  backgroundColor: 'none',
  borderRadius: 0,
  borderWidth: 0,
  borderColor: 'none',
  padding: 50,
  gap: 50,
  boxShadow: buildDepthShadow(DEFAULT_MEDIA_DEPTH),
};

export const StatCounterDefaults = {
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
    speed: DEFAULT_SPEED_PERCENTAGE,
  },
  text: {
    label: 'Total Users',
    variant: 'subheading' as TypographyVariant,
  },
};

export type StatCounterProps = Partial<typeof StatCounterDefaults> & { id?: string };

export const StatCounter: React.FC<StatCounterProps> = (initProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const defaultProps = { ...StatCounterDefaults, ...initProps };
  const { props: containerProps } = useElement('container', defaultProps.container);
  const { props: counterProps } = useElement('counter', defaultProps.counter);
  const { props: textProps } = useElement('text', defaultProps.text);

  const containerStyle = normalizeContainerStyle(
    StatCounterContainerDefaults,
    containerProps.style,
  );
  const speed = getSpeed(counterProps.speed);
  const animationDelay = scaleTiming(BASE_ANIMATION_DELAY, speed);
  const counterDelay = scaleTiming(BASE_COUNTER_DELAY, speed);
  const counterDuration = scaleTiming(BASE_COUNTER_DURATION, speed);

  const scaleSpring = spring({
    frame: Math.max(0, frame - animationDelay),
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const numberTypography = useTypography(counterProps.variant);
  const labelTypography = useTypography(textProps.variant);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transformOrigin: 'center',
        width: '100%',
      }}
    >
      <div
        id='container'
        style={{
          position: 'relative',
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '100%',
          minWidth: '35%',
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
          startAt={counterDelay}
          durationInFrames={counterDuration}
          style={{
            ...numberTypography,
            textShadow: buildDepthShadow(2),
          }}
        />
        <Text
          id='text'
          text={textProps.label}
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
        datatype: 'style',
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
        datatype: 'text',
        map: 'props.label',
      },
      {
        name: 'variant',
        type: 'enum',
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
        datatype: 'text',
        map: 'props.label',
      },
      {
        name: 'variant',
        type: 'enum',
        default: StatCounterDefaults.counter.variant,
      },
      {
        name: 'from',
        type: 'number',
        datatype: 'text',
        map: 'props.from'
      },
      {
        name: 'to',
        type: 'number',
        datatype: 'text',
        map: 'props.to'
      },
      {
        name: 'prefix',
        type: 'string',
        datatype: 'text',
        map: 'props.prefix',
        default: '',
      },
      {
        name: 'suffix',
        type: 'string',
        datatype: 'text',
        map: 'props.suffix',
        default: '',
      },
      {
        name: 'speed',
        type: 'number',
        default: StatCounterDefaults.counter.speed,
      }
    ],
  },
];

export const StatCounterDescriptor: ComponentRegistration = {
  name: 'StatCounter',
  type: 'scene',
  tags: ['Social Proof', 'Problem'],
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
  celExpression: `(((${BASE_COUNTER_DELAY} + ${BASE_COUNTER_DURATION} + ${BASE_HOLD_DURATION} + 1) * ${DEFAULT_SPEED_PERCENTAGE}) / max(${MIN_SPEED_PERCENTAGE}, props.counter.speed))`,
};
