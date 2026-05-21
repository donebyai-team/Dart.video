import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useElement } from '../../../patches';
import { useStyleContext } from '../../../styles/StyleContext';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { AnimationPresetName, resolveAnimationPreset } from '../../../core/animation_preset/AnimationPreset';
import type { ComponentRegistration } from '../../../registry/registry';
import { TypographyVariant } from '../../../tokens';

export const TYPEWRITER_TYPING_DURATION = 30;
export const TYPEWRITER_PULSE_DURATION = 30;

export const TypewriterDefaults = {
  id: 'typewriter',
  text: "",
  startAt: 0,
  variant: "headingLg" as TypographyVariant,
  entranceAnimation: "fadeIn" as AnimationPresetName,
  typingDuration: TYPEWRITER_TYPING_DURATION,
  style: undefined as React.CSSProperties | undefined,
  className: undefined as string | undefined,
};

export type TypewriterProps = typeof TypewriterDefaults;

type TypewriterSegments = {
  stablePrefix: string;
  activeWordVisible: string;
  activeWordHidden: string;
  trailingHidden: string;
};

function getTypewriterSegments(text: string, visibleLength: number): TypewriterSegments {
  const clampedVisibleLength = Math.max(0, Math.min(text.length, visibleLength));
  const visibleText = text.slice(0, clampedVisibleLength);
  const hiddenText = text.slice(clampedVisibleLength);

  if (hiddenText.length === 0 || /\s$/.test(visibleText)) {
    return {
      stablePrefix: visibleText,
      activeWordVisible: '',
      activeWordHidden: '',
      trailingHidden: hiddenText,
    };
  }

  const currentWordStart = visibleText.search(/\S+$/);
  if (currentWordStart === -1) {
    return {
      stablePrefix: visibleText,
      activeWordVisible: '',
      activeWordHidden: '',
      trailingHidden: hiddenText,
    };
  }

  const activeWordEndMatch = hiddenText.match(/^\S*/);
  const activeWordHidden = activeWordEndMatch?.[0] ?? '';

  return {
    stablePrefix: visibleText.slice(0, currentWordStart),
    activeWordVisible: visibleText.slice(currentWordStart),
    activeWordHidden,
    trailingHidden: hiddenText.slice(activeWordHidden.length),
  };
}

function renderTypewriterText(
  segments: TypewriterSegments,
  hiddenStyle: React.CSSProperties,
  showCursor: boolean,
  cursorChar: string,
  cursorVisible: boolean,
): React.ReactNode {
  return (
    <>
      {segments.stablePrefix}
      {segments.activeWordVisible || segments.activeWordHidden ? (
        <span style={{ whiteSpace: 'nowrap' }}>
          {segments.activeWordVisible}
          {showCursor && cursorChar && (
            <span style={{ opacity: cursorVisible ? 1 : 0 }}>{cursorChar}</span>
          )}
          {segments.activeWordHidden && (
            <span aria-hidden style={hiddenStyle}>
              {segments.activeWordHidden}
            </span>
          )}
        </span>
      ) : (
        showCursor && cursorChar && (
          <span style={{ opacity: cursorVisible ? 1 : 0 }}>{cursorChar}</span>
        )
      )}
      {segments.trailingHidden && (
        <span aria-hidden style={hiddenStyle}>
          {segments.trailingHidden}
        </span>
      )}
    </>
  );
}

/**
 * Reveals text progressively using linear easing.
 * Cursor appearance (shape, behavior) driven by StyleContext.cursor.
 */
export function Typewriter(initProps: TypewriterProps): React.ReactElement {
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();
  const defaultProps = { ...TypewriterDefaults, ...initProps };
  const id = defaultProps.id;

  const {props, style, containerStyle} = useElement(id, defaultProps);


  const entranceDuration = 20;
  const entranceMotion = resolveAnimationPreset({
    frame,
    startAt: 0,
    duration: entranceDuration,
    presetName: props.entranceAnimation,
    easing: 'linear',
  });

  const progress = interpolateWithEasing(
    frame,
    [0, props.typingDuration],
    [0, 1],
    'linear',
  );

  const visibleLength = Math.floor(progress * props.text.length);
  const visibleText = props.text.slice(0, visibleLength);
  const segments = getTypewriterSegments(props.text, visibleLength);

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
  const hiddenTextStyle = {
    visibility: 'hidden' as const,
  };

  const textStyles = {
    opacity: entranceMotion.opacity,
    transform: entranceMotion.transform,
    display: 'inline-block',
    position: 'relative' as const,
    whiteSpace: 'pre-wrap' as const,
    ...style,
  };

  return (
    <span
      id={id}
      className={props.className}
      style={{
        display: 'inline-block',
        ...containerStyle,
      }}
    >
      <span
        style={textStyles}
      >
        {renderTypewriterText(
          segments,
          hiddenTextStyle,
          showCursor,
          cursorChar,
          cursorVisible,
        )}
        {pulseActive && visibleText && (
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
              mixBlendMode: 'difference',
              opacity: entranceMotion.opacity,
            }}
          >
            {visibleText}
          </span>
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
  description: 'Character-by-character typewriter effect',
  instructions: 'Use for dramatic reveals or code/terminal effects.',
  celExpression: `${TYPEWRITER_TYPING_DURATION + TYPEWRITER_PULSE_DURATION}`

};
