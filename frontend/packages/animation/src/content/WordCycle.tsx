import React from 'react';
import { spring } from 'remotion';
import { useDurationCollector } from '../duration/DurationCollector';
import { usePrimitivePatches } from '../patches/PatchContext';
import { useStyleContext } from '../styles/StyleContext';
import { useAspectPreset } from '../styles/AspectPresetContext';
import { useTheme } from '../theme/ThemeContext';
import { getSpringConfig } from '../styles/easingResolver';
import { TypographyVariant } from '../tokens/semantic';
import { resolveTypography } from '../tokens/resolveTypography';

export type WordCycleTransition = 'flipY' | 'fadeSwap' | 'slideUp';

export interface WordCycleProps {
  frame: number;
  fps?: number;
  delay?: number;
  words: string[];
  /** Frames each word is held. */
  holdDuration?: number;
  /** Frames for transition between words. */
  transitionDuration?: number;
  transition?: WordCycleTransition;
  variant?: TypographyVariant;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
}

/**
 * Cycles through an array of words with animated transitions.
 * DurationCollector registration: delay + (words.length * (holdDuration + transitionDuration))
 */
export function WordCycle({
  frame,
  fps = 30,
  delay = 0,
  words,
  holdDuration = 45,
  transitionDuration = 12,
  transition = 'fadeSwap',
  variant = 'body',
  style,
  className,
  id,
}: WordCycleProps): React.ReactElement {
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();
  const registerEndFrame = useDurationCollector();

  const { effectiveDelay, effectiveDuration: effectiveHold } = usePrimitivePatches(id, { delay, duration: holdDuration });
  const adjustedTransition = transitionDuration;

  const cycleDuration = effectiveHold + adjustedTransition;
  const endFrame = effectiveDelay + words.length * cycleDuration;

  registerEndFrame(endFrame);

  if (words.length === 0) return <span className={className} style={style} />;

  const elapsed = Math.max(0, frame - effectiveDelay);
  const cycleIndex = Math.floor(elapsed / cycleDuration);
  const cycleFrame = elapsed - cycleIndex * cycleDuration;

  const currentWord = words[cycleIndex % words.length] ?? words[0] ?? '';
  const nextWord = words[(cycleIndex + 1) % words.length] ?? words[0] ?? '';

  const isTransitioning = cycleFrame >= effectiveHold;

  const springConfig = getSpringConfig(styleConfig.motion, 'wordcycle');

  const springProgress = spring({
    frame: isTransitioning ? cycleFrame - effectiveHold : 0,
    fps,
    config: { damping: springConfig.damping, stiffness: springConfig.stiffness, mass: springConfig.mass ?? 1, overshootClamping: !springConfig.overshoot },
    durationInFrames: adjustedTransition,
  });

  const clamped = Math.max(0, Math.min(1, springProgress));
  const typographyStyle = resolveTypography(variant, styleConfig, theme, preset);

  if (transition === 'fadeSwap') {
    return (
      <span id={id} className={className} style={{ ...typographyStyle, position: 'relative', display: 'inline-block', ...style }}>
        <span style={{ opacity: isTransitioning ? 1 - clamped : 1 }}>{currentWord}</span>
        {isTransitioning && (
          <span style={{ position: 'absolute', left: 0, opacity: clamped }}>{nextWord}</span>
        )}
      </span>
    );
  }

  if (transition === 'slideUp') {
    return (
      <span id={id} className={className} style={{ ...typographyStyle, position: 'relative', display: 'inline-block', overflow: 'hidden', ...style }}>
        <span style={{
          display: 'block',
          transform: isTransitioning ? `translateY(-${clamped * 100}%)` : 'translateY(0)',
          opacity: isTransitioning ? 1 - clamped : 1,
        }}>
          {currentWord}
        </span>
        {isTransitioning && (
          <span style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translateY(${(1 - clamped) * 100}%)`,
            opacity: clamped,
          }}>
            {nextWord}
          </span>
        )}
      </span>
    );
  }

  // flipY
  return (
    <span id={id} className={className} style={{ ...typographyStyle, position: 'relative', display: 'inline-block', ...style }}>
      <span style={{
        display: 'block',
        transform: isTransitioning ? `rotateX(${clamped * 90}deg)` : 'rotateX(0deg)',
        opacity: isTransitioning ? 1 - clamped : 1,
      }}>
        {currentWord}
      </span>
      {isTransitioning && (
        <span style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: `rotateX(${(1 - clamped) * -90}deg)`,
          opacity: clamped,
        }}>
          {nextWord}
        </span>
      )}
    </span>
  );
}
