import React from 'react';
import { usePatchedDragStyle, usePatchedProp, useStyleOverride } from '../../patches';
import { useAspectPreset } from '../../styles/AspectPresetContext';
import { useStyleContext } from '../../styles/StyleContext';
import { useTheme } from '../../theme/ThemeContext';
import { TypographyVariant } from '../../tokens/semantic';
import { resolveInlineTypography, resolveTypography } from '../../tokens/resolveTypography';
import { FieldSchema } from '../../registry/types';

export interface TextProps {
  /** Semantic typography variant. Never hardcode font sizes. */
  text: string;
  variant?: TypographyVariant;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
}

export const TextFieldSchema: FieldSchema[] = [
  {
    name: 'text',
    type: 'string',
    datatype: 'text',
  },
];

/**
 * Static text with semantic typography variants.
 * No animation — wrap in FadeIn or SlideIn if animation is needed.
 * Font size scales with the active AspectPreset (min dimension / 1080).
 * Color comes from theme: foreground for display/heading/body, mutedForeground for label/caption.
 */
export function Text({
  text,
  variant,
  style,
  className,
  id,
}: TextProps): React.ReactElement {
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();

  const patchedVariant = usePatchedProp<TypographyVariant | undefined>(id, 'variant', variant);
  const patchedText = usePatchedProp<React.ReactNode>(id, 'text', text);
  const patchedClassName = usePatchedProp<string | undefined>(id, 'className', className);
  const styleOverride = useStyleOverride(id);
  const overrideTransform = typeof styleOverride.transform === 'string' ? styleOverride.transform : undefined;
  const dragStyle = usePatchedDragStyle(id, style?.transform, overrideTransform);
  const mergedStyle = { ...(style ?? {}), ...styleOverride };
  const { transform: _mergedTransform, ...mergedStyleWithoutTransform } = mergedStyle;

  const typography = patchedVariant
    ? resolveTypography(patchedVariant, styleConfig, theme, preset)
    : resolveInlineTypography(mergedStyleWithoutTransform, styleConfig, theme, preset);

  return (
    <span
      id={id}
      className={patchedClassName}
      style={{
        display: 'inline-block',
        whiteSpace: 'pre-wrap',
        ...typography,
        ...mergedStyleWithoutTransform,
        ...dragStyle,
      }}
    >
      {patchedText}
    </span>
  );
}
