import React from 'react';
import { usePatchedProp, usePatchedDragStyle, useStyleOverride } from '../../patches';
import { useStyleContext } from '../../styles/StyleContext';
import { useAspectPreset } from '../../styles/AspectPresetContext';
import { useTheme } from '../../theme/ThemeContext';
import { TypographyVariant } from '../../tokens/semantic';
import { resolveTypography } from '../../tokens/resolveTypography';

export interface TextProps {
  /** Semantic typography variant. Never hardcode font sizes. */
  text: string;
  variant?: TypographyVariant;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
}

/**
 * Static text with semantic typography variants.
 * No animation — wrap in FadeIn or SlideIn if animation is needed.
 * Font size scales with the active AspectPreset (min dimension / 1080).
 * Color comes from theme: foreground for display/heading/body, mutedForeground for label/caption.
 */
export function Text({
  text,
  variant = 'heading',
  style,
  className,
  id,
}: TextProps): React.ReactElement {
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();

  const patchedVariant = usePatchedProp<TypographyVariant>(id, 'variant', variant);
  const patchedText = usePatchedProp<React.ReactNode>(id, 'text', text);
  const styleOverride = useStyleOverride(id);
  const overrideTransform = typeof styleOverride.transform === 'string' ? styleOverride.transform : undefined;
  const dragStyle = usePatchedDragStyle(id, style?.transform, overrideTransform);

  return (
    <span
      id={id}
      className={className}
      style={{
        display: 'inline-block',
        whiteSpace: 'pre-wrap',
        ...resolveTypography(patchedVariant, styleConfig, theme, preset),
        ...style,
        ...styleOverride,
        ...dragStyle,
      }}
    >
      {patchedText}
    </span>
  );
}
