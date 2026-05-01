import React from 'react';
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

  return (
    <span
      id={id}
      className={className}
      style={{
        display: 'inline-block',
        whiteSpace: 'pre-wrap',
        ...resolveTypography(variant, styleConfig, theme, preset),
        ...style,
      }}
    >
      {text}
    </span>
  );
}
