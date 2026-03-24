import React from 'react';
import { usePatchedProp, useStyleOverride } from '../../patches/PatchContext';
import { useStyleContext } from '../../styles/StyleContext';
import { useAspectPreset } from '../../styles/AspectPresetContext';
import { useTheme } from '../../theme/ThemeContext';
import { TypographyVariant } from '../../tokens/semantic';
import { resolveTypography } from '../../tokens/resolveTypography';

export interface TextProps {
  /** Semantic typography variant. Never hardcode font sizes. */
  variant?: TypographyVariant;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
  children: React.ReactNode;
}

/**
 * Static text with semantic typography variants.
 * No animation — wrap in FadeIn or SlideIn if animation is needed.
 * Font size scales with the active AspectPreset (min dimension / 1080).
 * Color comes from theme: foreground for display/heading/body, mutedForeground for label/caption.
 */
export function Text({
  variant = 'body',
  style,
  className,
  id,
  children,
}: TextProps): React.ReactElement {
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();

  const patchedVariant = usePatchedProp<TypographyVariant>(id, 'variant', variant);
  const patchedChildren = usePatchedProp<React.ReactNode>(id, 'children', children);
  const styleOverride = useStyleOverride(id);

  return (
    <span
      id={id}
      className={className}
      style={{ ...resolveTypography(patchedVariant, styleConfig, theme, preset), ...style, ...styleOverride }}
    >
      {patchedChildren}
    </span>
  );
}
