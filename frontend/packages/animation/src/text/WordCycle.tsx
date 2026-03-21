import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { usePrimitivePatches, usePatchedProp, useStyleOverride } from '../patches/PatchContext';
import { useStyleContext } from '../styles/StyleContext';
import { useAspectPreset } from '../styles/AspectPresetContext';
import { useTheme } from '../theme/ThemeContext';
import { getEasing, interpolateWithEasing } from '../styles/easingResolver';
import { type Easing } from '../styles/types';
import { TypographyVariant } from '../tokens/semantic';
import { resolveTypography } from '../tokens/resolveTypography';
import { applySpeedFactor, useSpeedFactor } from '../duration';

export type WordCycleTransition = 'flipY' | 'fadeSwap' | 'slideUp';

export interface WordCycleProps {
  startAt?: number;
  words: string[];
  /** Frames each word is held. */
  holdDuration?: number;
  /** Frames for transition between words. */
  transitionDuration?: number;
  easing?: Easing;
  transition?: WordCycleTransition;
  variant?: TypographyVariant;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
}

/**
 * Cycles through an array of words with animated transitions.
 */
export function WordCycle({
  startAt = 0,
  words,
  holdDuration = 45,
  transitionDuration = 12,
  easing,
  transition = 'fadeSwap',
  variant = 'body',
  style,
  className,
  id,
}: WordCycleProps): React.ReactElement {
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();

  const speedFactor = useSpeedFactor();
  const adjustedStartAt = applySpeedFactor(startAt, speedFactor);
  const adjustedHoldDuration = applySpeedFactor(holdDuration, speedFactor);
  const adjustedTransitionDuration = applySpeedFactor(transitionDuration, speedFactor);



  // startAt maps to delay slot, holdDuration maps to duration slot for patch overrides
  const { effectiveStartAt, effectiveDurationInFrames: effectiveHold } = usePrimitivePatches(id, {
    startAt: adjustedStartAt,
    durationInFrames: adjustedHoldDuration,
  });

  const patchedWords = usePatchedProp(id, 'words', words);
  const patchedTransitionDuration = usePatchedProp(id, 'transitionDuration', adjustedTransitionDuration);
  const patchedTransition = usePatchedProp<WordCycleTransition>(id, 'transition', transition);
  const patchedVariant = usePatchedProp<TypographyVariant>(id, 'variant', variant);
  const styleOverride = useStyleOverride(id);

  const cycleDuration = effectiveHold + patchedTransitionDuration;

  const resolvedEasing = easing ?? getEasing(styleConfig.motion, 'wordcycle');
  const typographyStyle = resolveTypography(patchedVariant, styleConfig, theme, preset);

  if (patchedWords.length === 0) return <span className={className} style={style} />;

  const elapsed = Math.max(0, frame - effectiveStartAt);
  const cycleIndex = Math.floor(elapsed / cycleDuration);
  const cycleFrame = elapsed - cycleIndex * cycleDuration;

  const currentWord = patchedWords[cycleIndex % patchedWords.length] ?? patchedWords[0] ?? '';
  const nextWord = patchedWords[(cycleIndex + 1) % patchedWords.length] ?? patchedWords[0] ?? '';
  const isTransitioning = cycleFrame >= effectiveHold;

  const transitionProgress = isTransitioning
    ? interpolateWithEasing(
      cycleFrame,
      [effectiveHold, effectiveHold + patchedTransitionDuration],
      [0, 1],
      resolvedEasing,
    )
    : 0;

  if (patchedTransition === 'fadeSwap') {
    return (
      <span id={id} className={className} style={{ ...typographyStyle, position: 'relative', display: 'inline-block', ...style, ...styleOverride }}>
        <span style={{ opacity: isTransitioning ? 1 - transitionProgress : 1 }}>{currentWord}</span>
        {isTransitioning && (
          <span style={{ position: 'absolute', left: 0, opacity: transitionProgress }}>{nextWord}</span>
        )}
      </span>
    );
  }

  if (patchedTransition === 'slideUp') {
    return (
      <span id={id} className={className} style={{ ...typographyStyle, position: 'relative', display: 'inline-block', overflow: 'hidden', ...style, ...styleOverride }}>
        <span style={{ display: 'block', transform: isTransitioning ? `translateY(-${transitionProgress * 100}%)` : 'translateY(0)', opacity: isTransitioning ? 1 - transitionProgress : 1 }}>
          {currentWord}
        </span>
        {isTransitioning && (
          <span style={{ position: 'absolute', left: 0, top: 0, transform: `translateY(${(1 - transitionProgress) * 100}%)`, opacity: transitionProgress }}>
            {nextWord}
          </span>
        )}
      </span>
    );
  }

  // flipY
  return (
    <span id={id} className={className} style={{ ...typographyStyle, position: 'relative', display: 'inline-block', ...style, ...styleOverride }}>
      <span style={{ display: 'block', transform: isTransitioning ? `rotateX(${transitionProgress * 90}deg)` : 'rotateX(0deg)', opacity: isTransitioning ? 1 - transitionProgress : 1 }}>
        {currentWord}
      </span>
      {isTransitioning && (
        <span style={{ position: 'absolute', left: 0, top: 0, transform: `rotateX(${(1 - transitionProgress) * -90}deg)`, opacity: transitionProgress }}>
          {nextWord}
        </span>
      )}
    </span>
  );
}
