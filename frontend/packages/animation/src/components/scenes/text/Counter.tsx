import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useElement } from '../../../patches';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { type Easing } from '../../../styles/types';
import { TypographyVariant } from '../../../tokens/semantic';
import { Text } from '../../../core/assets/Text';

export interface CounterProps {
  startAt?: number;
  durationInFrames?: number;
  easing?: Easing;
  from?: number;
  to: number;
  /** Number format string, e.g. "0,0" | "$0,0" | "0%" */
  format?: string;
  prefix?: string;
  suffix?: string;
  variant?: TypographyVariant;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
}

function formatNumber(value: number, format?: string, prefix?: string, suffix?: string): string {
  let formatted: string;
  if (!format) {
    formatted = Math.round(value).toString();
  } else if (format.startsWith('$')) {
    formatted = '$' + Math.round(value).toLocaleString();
  } else if (format.endsWith('%')) {
    formatted = Math.round(value) + '%';
  } else if (format.includes(',')) {
    formatted = Math.round(value).toLocaleString();
  } else {
    formatted = Math.round(value).toString();
  }
  return `${prefix ?? ''}${formatted}${suffix ?? ''}`;
}

/**
 * Animated number that counts from one value to another.
 * Easing driven by StyleContext.motion.counter — ensures clean landing, no bounce.
 */
export function Counter({
  startAt = 0,
  durationInFrames = 45,
  easing,
  from = 0,
  to,
  format,
  prefix,
  suffix,
  variant = 'heading',
  style,
  className,
  id,
}: CounterProps): React.ReactElement {
  const frame = useCurrentFrame();
  const el = useElement(id, {
    startAt,
    durationInFrames,
    easing,
    from,
    to,
    format,
    prefix,
    suffix,
    variant,
    style,
    className,
    id,
  });
  const { props } = el;

  const progress = interpolateWithEasing(
    frame,
    [props.startAt ?? 0, (props.startAt ?? 0) + (props.durationInFrames ?? 45)],
    [0, 1],
    'ease-out',
  );

  const currentValue = (props.from ?? 0) + (props.to - (props.from ?? 0)) * progress;

  return (
    <Text
      id={id}
      text={formatNumber(currentValue, props.format, props.prefix, props.suffix)}
      variant={props.variant ?? 'heading'}
      className={props.className}
      style={el.rootStyle({ typography: true })}
    />
  );
}

export const CounterSchemaFields = [
  {
    "name": "from",
    "type": "number",
    
    "map": "props.from",
    "default": 0
  },
  {
    "name": "to",
    "type": "number",
    
    "map": "props.to",
    "default": 100
  },
  {
    "name": "format",
    "type": "string",
    "default": ""
  },
  {
    "name": "prefix",
    "type": "string",
    "default": ""
  },
  {
    "name": "suffix",
    "type": "string",
    "default": ""
  },
  {
    "name": "variant",
    "type": "string",
    "subtype": "enum",
    "default": "heading"
  }
]
