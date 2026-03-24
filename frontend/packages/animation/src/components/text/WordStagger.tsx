import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { TypographyVariant } from '../../tokens/semantic';
import { useStyleContext } from '../../styles/StyleContext';
import { usePatchedProp, useStyleOverride } from '../../patches';
import { useAspectPreset } from '../../styles';
import { useTheme } from '../../theme';
import { resolveTypography } from '../../tokens';

export interface WordStaggerProps {
  id?: string;
  variant?: TypographyVariant;
  text: string;
  staggerDelay?: number; // frames between each word
  animation?: 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scaleIn' | 'rotateIn';
  startAt?: number;
  duration?: number; // animation duration per word
  separator?: string | RegExp;
  className?: string;
  style?: React.CSSProperties;
  wordStyle?: React.CSSProperties;
}

export const WordStagger: React.FC<WordStaggerProps> = ({
  id,  
  variant = 'heading',  
  text,
  staggerDelay = 5,
  animation = 'slideUp',
  startAt = 0,
  duration = 15,
  separator = ' ',
  className,
  style,
  wordStyle,
}) => {
  const frame = useCurrentFrame();
 const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();

  const patchedVariant = usePatchedProp<TypographyVariant>(id, 'variant', variant);
  const styleOverride = useStyleOverride(id);

  const words = text.split(separator);

  const getAnimationStyles = (wordIndex: number): React.CSSProperties => {
    const wordStartAt = startAt + wordIndex * staggerDelay;
    const progress = interpolate(
      frame,
      [wordStartAt, wordStartAt + duration],
      [0, 1],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    const opacity = progress;

    switch (animation) {
      case 'fadeIn':
        return {
          opacity,
        };
      
      case 'slideUp':
        return {
          opacity,
          transform: `translateY(${(1 - progress) * 20}px)`,
        };
      
      case 'slideDown':
        return {
          opacity,
          transform: `translateY(${(1 - progress) * -20}px)`,
        };
      
      case 'slideLeft':
        return {
          opacity,
          transform: `translateX(${(1 - progress) * 20}px)`,
        };
      
      case 'slideRight':
        return {
          opacity,
          transform: `translateX(${(1 - progress) * -20}px)`,
        };
      
      case 'scaleIn':
        return {
          opacity,
          transform: `scale(${0.5 + progress * 0.5})`,
        };
      
      case 'rotateIn':
        return {
          opacity,
          transform: `rotate(${(1 - progress) * 180}deg) scale(${0.5 + progress * 0.5})`,
        };
      
      default:
        return {
          opacity,
        };
    }
  };

  return (
    <span id={id} className={className} style={{ display: 'inline-block', ...style }}>
      {words.map((word, index) => (
        <span
          key={index}
          style={{
            display: 'inline-block',
            marginRight: index < words.length - 1 ? '0.25em' : 0,
            ...getAnimationStyles(index),
            ...resolveTypography(patchedVariant, styleConfig, theme, preset), 
            ...wordStyle, 
            ...styleOverride
          }}
        >
          {word}
        </span>
      ))}
    </span>
  );
};