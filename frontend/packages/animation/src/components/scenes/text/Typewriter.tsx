import React from 'react';
import { useCurrentFrame } from 'remotion';
import { usePatchedDragStyle, usePatchedProps, useStyleOverride } from '../../../patches';
import { useStyleContext } from '../../../styles/StyleContext';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { useTheme } from '../../../theme/ThemeContext';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { resolveTypography } from '../../../tokens/resolveTypography';
import { getEntranceTransform } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';

export const TypewriterDefaults = {
  text: "Sample text",
  startAt: 0,
  splitBy: "char" as const,
  variant: "heading" as const,
  entranceAnimation: "slideUp" as const,
  typingDuration: 60,
  style: undefined as React.CSSProperties | undefined,
  className: undefined as string | undefined,
};

export type TypewriterProps = typeof TypewriterDefaults;


/**
 * Reveals text progressively using linear easing.
 * Cursor appearance (shape, behavior) driven by StyleContext.cursor.
 */
export function Typewriter(): React.ReactElement {
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();
  const props = usePatchedProps('typewriter', TypewriterDefaults);

  const styleOverride = useStyleOverride('typewriter');
  const dragStyle = usePatchedDragStyle('typewriter', props.style?.transform);

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

  return (
    <span
      className={props.className}
      style={{
        display: 'inline-block',
        ...props.style,
        ...dragStyle,
      }}
    >
      <span
        style={{
          ...resolveTypography(props.variant, styleConfig, theme, preset),
          opacity: entranceProgress,
          transform: getEntranceTransform(props.entranceAnimation, entranceProgress),
          display: 'inline-block',
          ...styleOverride,
        }}
      >
        {visibleText}
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

const TypewriterSchemaFields = [
  {
    "name": "text",
    "type": "string",
    "required": true,
    "map": "props.text"
  },
  {
    "name": "variant",
    "type": "string",
    "subtype": "enum",
    "default": TypewriterDefaults.variant
  },
  {
    "name": "splitBy",
    "type": "string",
    "subtype": "enum",
    "default": TypewriterDefaults.splitBy
  },
  {
    "name": "entranceAnimation",
    "type": "string",
    "subtype": "enum",
    "default": TypewriterDefaults.entranceAnimation
  },
  {
    "name": "startAt",
    "type": "number",
    "default": TypewriterDefaults.startAt
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
    }
  ],
  description: 'Character-by-character text reveal. Use for dramatic reveals or code/terminal effects.',
  celExpression: 'max(30, props.splitBy == "char" ? size(props.text) * 2 : props.splitBy == "word" ? size(props.text.split(" ")) * 9 : size(props.text.split("\\n")) * 18)',
};
