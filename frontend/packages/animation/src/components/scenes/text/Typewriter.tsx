import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useElement } from '../../../patches';
import { useStyleContext } from '../../../styles/StyleContext';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { useTypography } from '../../../tokens/resolveTypography';
import { EntranceAnimation, getEntranceTransform } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';
import { TypographyVariant } from '../../../tokens';

const TYPEWRITER_TYPING_DURATION = 30;
const TYPEWRITER_PULSE_DURATION = 24;

export const TypewriterDefaults = {
  id: 'typewriter',
  text: "Try cursor today",
  startAt: 0,
  splitBy: "char" as const,
  variant: "display" as TypographyVariant,
  entranceAnimation: "fadeIn" as EntranceAnimation,
  typingDuration: TYPEWRITER_TYPING_DURATION,
  style: undefined as React.CSSProperties | undefined,
  className: undefined as string | undefined,
};

export type TypewriterProps = typeof TypewriterDefaults;


/**
 * Reveals text progressively using linear easing.
 * Cursor appearance (shape, behavior) driven by StyleContext.cursor.
 */
export function Typewriter(initProps: TypewriterProps): React.ReactElement {
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();
  const id = initProps.id ?? TypewriterDefaults.id;
  const { props, style } = useElement(id, TypewriterDefaults, initProps, {
    baseStyle: {
      display: 'inline-block',
    },
  });

  const entranceDuration = 20;
  const entranceProgress = interpolateWithEasing(
    frame,
    [0, entranceDuration],
    [0, 1],
    'linear',
  );

  const progress = interpolateWithEasing(
    frame,
    [0, props.typingDuration],
    [0, 1],
    'linear',
  );

  let visibleText: string;
  if (props.splitBy === 'char') {
    visibleText = props.text.slice(0, Math.floor(progress * props.text.length));
  } else if (props.splitBy === 'word') {
    const words = props.text.split(' ');
    visibleText = words.slice(0, Math.floor(progress * words.length)).join(' ');
  } else {
    const lines = props.text.split('\n');
    visibleText = lines.slice(0, Math.floor(progress * lines.length)).join('\n');
  }

  const { cursor } = styleConfig;
  const cursorCharMap: Record<string, string> = {
    line: '|', underscore: '_', block: '█', none: '',
  };
  const cursorChar = cursorCharMap[cursor.shape] ?? '';
  const showCursor = cursor.shape !== 'none' && frame >= 0;
  const cursorVisible =
    cursor.behavior === 'solid' ? true
      : cursor.behavior === 'fade' ? Math.sin((frame * Math.PI) / 15) > 0
        : Math.floor(frame / 15) % 2 === 0;
  const pulseStartFrame = props.typingDuration;
  const pulseEndFrame = pulseStartFrame + TYPEWRITER_PULSE_DURATION;
  const pulseProgress = interpolateWithEasing(
    frame,
    [pulseStartFrame, pulseEndFrame],
    [0, 1],
    'ease-in-out',
  );
  const pulseActive = frame >= pulseStartFrame && frame <= pulseEndFrame && visibleText.length > 0;
  const pulseCenter = -30 + (pulseProgress * 160);
  const pulseBandStart = pulseCenter - 18;
  const pulseBandEnd = pulseCenter + 18;
  const { transform: _ignoredTransform, display: _ignoredDisplay, position: _ignoredPosition, ...textStyleProps } = props.style ?? {};
  const typographyStyle = useTypography(props.variant);
  const textStyles = {
    ...typographyStyle,
    ...textStyleProps,
    opacity: entranceProgress,
    transform: getEntranceTransform(props.entranceAnimation, entranceProgress),
    display: 'inline-block',
    position: 'relative' as const,
    whiteSpace: 'pre-wrap' as const,
  };

  return (
    <span
      id={id}
      className={props.className}
      style={style}
    >
      <span
        style={textStyles}
      >
        {visibleText}
        {pulseActive && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              color: 'transparent',
              pointerEvents: 'none',
              whiteSpace: 'pre-wrap',
              backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0) ${pulseBandStart}%, rgba(255,255,255,0.95) ${pulseCenter}%, rgba(255,255,255,0) ${pulseBandEnd}%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              opacity: entranceProgress,
            }}
          >
            {visibleText}
          </span>
        )}
        {showCursor && cursorChar && (
          <span style={{ opacity: cursorVisible ? 1 : 0 }}>{cursorChar}</span>
        )}
      </span>
    </span>
  );
}

// ============================================================================
// Registry Descriptor
// ============================================================================

export const TypewriterSchemaFields = [
  {
    "name": "text",
    "type": "string",
    "datatype": "text",
    "map": "props.text"
  },
  {
    "name": "variant",
    "type": "enum",
    "default": TypewriterDefaults.variant
  },
  {
    "name": "splitBy",
    "type": "enum",
    "default": TypewriterDefaults.splitBy
  },
  {
    "name": "entranceAnimation",
    "type": "enum",
    "map": "props.entranceAnimation",
    "default": TypewriterDefaults.entranceAnimation
  }
]

export const TypewriterDescriptor: ComponentRegistration = {
  name: 'Typewriter',
  type: 'content',
  schema: [{
    type: 'component',
    name: 'typewriter',
    fields: TypewriterSchemaFields
  }],
  llmSchema: [
    {
      name: 'text',
      type: 'string',
    },
    {
      name: 'entranceAnimation',
      type: 'enum',
      required: false,
      default: TypewriterDefaults.entranceAnimation,
    }
  ],
  description: 'Character-by-character text reveal. Use for dramatic reveals or code/terminal effects.',
  celExpression: `${TYPEWRITER_TYPING_DURATION + TYPEWRITER_PULSE_DURATION}`

};
