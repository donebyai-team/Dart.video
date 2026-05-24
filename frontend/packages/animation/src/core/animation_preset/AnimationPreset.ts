import { Easing, interpolateWithEasing } from '../../styles';

export const ANIMATION_PRESET_ENTRANCE_ANIMATIONS = [
    'none',
    'fadeIn',
    'slideUp',
    'slideDown',
    'slideLeft',
    'slideRight',
    'scaleIn',
    'rotateIn',
    'tiltX',
    'tiltY',
    'flipX',
    'flipY',
    'elasticScale',
    'swingIn',
    'zoomIn',
] as const;


export const ANIMATION_PRESET_EXIT_ANIMATIONS = [
    'none',
    'fadeOut',
    'slideUp',
    'slideDown',
    'slideLeft',
    'slideRight',
    'zoomOut',
] as const;

export const ALL_ANIMATIONS = [
  ...ANIMATION_PRESET_ENTRANCE_ANIMATIONS,
  ...ANIMATION_PRESET_EXIT_ANIMATIONS,
] as const;

export type AnimationPresetName =
  typeof ALL_ANIMATIONS[number];

export interface ResolveAnimationPresetInput {
  frame: number;
  startAt: number;
  duration: number;
  presetName: AnimationPresetName;
  mode?: 'enter' | 'exit';
  distance?: number;
  easing?: Easing;
}

export interface ResolvedAnimationPreset {
  progress: number;
  opacity: number;
  transform: string;
}

function getDefaultPresetEasing(presetName: AnimationPresetName): Easing {
  switch (presetName) {
    case 'slideUp':
    case 'slideDown':
    case 'slideLeft':
    case 'slideRight':
      return 'ease-out-cubic';
    default:
      return 'ease-out';
  }
}

function getAnimationTransform(
  presetName: AnimationPresetName,
  mode: 'enter' | 'exit',
  progress: number,
  distance: number = 200,
): string {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const inv = 1 - clampedProgress;

  switch (presetName) {
    case 'slideUp':
      return mode === 'exit'
        ? `translateY(${-clampedProgress * distance}px)`
        : `translateY(${inv * distance}px)`;
    case 'slideDown':
      return mode === 'exit'
        ? `translateY(${clampedProgress * distance}px)`
        : `translateY(${inv * -distance}px)`;
    case 'slideLeft':
      return mode === 'exit'
        ? `translateX(${-clampedProgress * distance}px)`
        : `translateX(${inv * distance}px)`;
    case 'slideRight':
      return mode === 'exit'
        ? `translateX(${clampedProgress * distance}px)`
        : `translateX(${inv * -distance}px)`;
    case 'scaleIn':
      return mode === 'exit'
        ? `scale(${Math.max(0, 1 - clampedProgress * 0.5)})`
        : `scale(${0.5 + clampedProgress * 0.5})`;
    case 'rotateIn':
      return mode === 'exit'
        ? `rotate(${clampedProgress * 180}deg) scale(${Math.max(0, 1 - clampedProgress * 0.5)})`
        : `rotate(${inv * 180}deg) scale(${0.5 + clampedProgress * 0.5})`;
    case 'tiltX':
      return mode === 'exit'
        ? `perspective(800px) rotateX(${-clampedProgress * 90}deg)`
        : `perspective(800px) rotateX(${inv * 90}deg)`;
    case 'tiltY':
      return mode === 'exit'
        ? `perspective(800px) rotateY(${-clampedProgress * 90}deg)`
        : `perspective(800px) rotateY(${inv * 90}deg)`;
    case 'flipX':
      return mode === 'exit'
        ? `perspective(800px) rotateX(${clampedProgress * 180}deg)`
        : `perspective(800px) rotateX(${inv * 180}deg)`;
    case 'flipY':
      return mode === 'exit'
        ? `perspective(800px) rotateY(${clampedProgress * 180}deg)`
        : `perspective(800px) rotateY(${inv * 180}deg)`;
    case 'elasticScale': {
      if (mode === 'exit') {
        const elastic = 1 + Math.sin(clampedProgress * Math.PI * 3) * (1 - clampedProgress) * 0.18;
        return `scale(${Math.max(0, 1 - clampedProgress * 0.45) * elastic})`;
      }
      const elastic = 1 + Math.sin(clampedProgress * Math.PI * 3) * inv * 0.3;
      return `scale(${clampedProgress * elastic})`;
    }
    case 'swingIn':
      return mode === 'exit'
        ? `perspective(800px) rotateY(${clampedProgress * 70}deg) translateX(${clampedProgress * 100}px)`
        : `perspective(800px) rotateY(${inv * 70}deg) translateX(${inv * -100}px)`;
    case 'zoomIn':
      return mode === 'exit'
        ? `scale(${1 + clampedProgress * 2})`
        : `scale(${3 - clampedProgress * 2})`;
    case 'zoomOut':
      return mode === 'exit'
        ? `scale(${1 + clampedProgress * 2})`
        : `scale(${1 + clampedProgress * 2})`;
    case 'fadeOut':
      return 'none';
    case 'fadeIn':
    case 'none':
    default:
      return 'none';
  }
}

function getAnimationOpacity(presetName: AnimationPresetName, progress: number): number {
  switch (presetName) {
    case 'fadeOut':
      return 1 - progress;
    case 'fadeIn':
    case 'slideUp':
    case 'slideDown':
    case 'slideLeft':
    case 'slideRight':
    case 'scaleIn':
    case 'rotateIn':
    case 'tiltX':
    case 'tiltY':
    case 'flipX':
    case 'flipY':
    case 'elasticScale':
    case 'swingIn':
    case 'zoomIn':
    case 'zoomOut':
      return progress;
    case 'none':
    default:
      return 1;
  }
}

export function resolveAnimationPreset({
  frame,
  startAt,
  duration,
  presetName,
  mode = 'enter',
  distance,
  easing,
}: ResolveAnimationPresetInput): ResolvedAnimationPreset {
  if (presetName === 'none') {
    return {
      progress: frame >= startAt ? 1 : 0,
      opacity: 1,
      transform: 'none',
    };
  }

  const safeDuration = Math.max(0, duration);
  const resolvedEasing = easing ?? getDefaultPresetEasing(presetName);
  const progress = safeDuration === 0
    ? frame >= startAt ? 1 : 0
    : interpolateWithEasing(
      frame,
      [startAt, startAt + safeDuration],
      [0, 1],
      resolvedEasing,
    );

  return {
    progress,
    opacity: mode === 'exit' ? 1 - progress : getAnimationOpacity(presetName, progress),
    transform: getAnimationTransform(presetName, mode, progress, distance),
  };
}
