import { interpolateWithEasing } from '../../styles';

export const TEXT_ENTRANCE_PRESETS = [
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
  'zoomOut',
] as const;

export type TextEntrancePresetName = typeof TEXT_ENTRANCE_PRESETS[number];

export const TEXT_EXIT_PRESETS = [
  'none',
  'fadeOut',
  'slideUp',
  'slideDown',
  'slideLeft',
  'slideRight',
] as const;

export type TextExitPresetName = typeof TEXT_EXIT_PRESETS[number];

export type TextMotionEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

export type TextMotionPhase = 'entrance' | 'exit';

export interface TextMotionPhaseConfig<TPreset extends string> {
  preset: TPreset;
  duration: number;
  delay?: number;
  distance?: number;
  easing?: TextMotionEasing;
}

export interface TextMotionPreset {
  entrance?: TextMotionPhaseConfig<TextEntrancePresetName>;
  exit?: TextMotionPhaseConfig<TextExitPresetName>;
}

export interface ResolvedTextMotionPhase {
  progress: number;
  opacity: number;
  transform: string;
}

export function getTextMotionTransform(
  preset: TextEntrancePresetName | TextExitPresetName,
  phase: TextMotionPhase,
  progress: number,
  distance: number = 200,
): string {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const inv = 1 - clampedProgress;

  switch (preset) {
    case 'slideUp':
      return phase === 'entrance'
        ? `translateY(${inv * distance}px)`
        : `translateY(${-clampedProgress * distance}px)`;
    case 'slideDown':
      return phase === 'entrance'
        ? `translateY(${inv * -distance}px)`
        : `translateY(${clampedProgress * distance}px)`;
    case 'slideLeft':
      return phase === 'entrance'
        ? `translateX(${inv * distance}px)`
        : `translateX(${-clampedProgress * distance}px)`;
    case 'slideRight':
      return phase === 'entrance'
        ? `translateX(${inv * -distance}px)`
        : `translateX(${clampedProgress * distance}px)`;
    case 'scaleIn':
      return phase === 'entrance'
        ? `scale(${0.5 + clampedProgress * 0.5})`
        : `scale(${1 - clampedProgress * 0.5})`;
    case 'rotateIn':
      return phase === 'entrance'
        ? `rotate(${inv * 180}deg) scale(${0.5 + clampedProgress * 0.5})`
        : `rotate(${clampedProgress * 180}deg) scale(${1 - clampedProgress * 0.5})`;
    case 'tiltX':
      return phase === 'entrance'
        ? `perspective(800px) rotateX(${inv * 90}deg)`
        : `perspective(800px) rotateX(${-clampedProgress * 90}deg)`;
    case 'tiltY':
      return phase === 'entrance'
        ? `perspective(800px) rotateY(${inv * 90}deg)`
        : `perspective(800px) rotateY(${-clampedProgress * 90}deg)`;
    case 'flipX':
      return phase === 'entrance'
        ? `perspective(800px) rotateX(${inv * 180}deg)`
        : `perspective(800px) rotateX(${clampedProgress * 180}deg)`;
    case 'flipY':
      return phase === 'entrance'
        ? `perspective(800px) rotateY(${inv * 180}deg)`
        : `perspective(800px) rotateY(${clampedProgress * 180}deg)`;
    case 'elasticScale': {
      if (phase === 'entrance') {
        const elastic = 1 + Math.sin(clampedProgress * Math.PI * 3) * inv * 0.3;
        return `scale(${clampedProgress * elastic})`;
      }

      const elastic = 1 + Math.sin(clampedProgress * Math.PI * 3) * (1 - clampedProgress) * 0.18;
      return `scale(${Math.max(0, 1 - clampedProgress * 0.45) * elastic})`;
    }
    case 'swingIn':
      return phase === 'entrance'
        ? `perspective(800px) rotateY(${inv * 70}deg) translateX(${inv * -100}px)`
        : `perspective(800px) rotateY(${clampedProgress * 70}deg) translateX(${clampedProgress * 100}px)`;
    case 'zoomIn':
      return phase === 'entrance'
        ? `scale(${3 - clampedProgress * 2})`
        : `scale(${1 + clampedProgress * 2})`;
    case 'zoomOut':
      return phase === 'entrance'
        ? `scale(${1 + clampedProgress * 2})`
        : `scale(${Math.max(0.1, 1 - clampedProgress * 0.75)})`;
    case 'fadeIn':
    case 'fadeOut':
    case 'none':
    default:
      return 'none';
  }
}

export function resolveTextMotionPhase(
  frame: number,
  phase: TextMotionPhase,
  config?: TextMotionPhaseConfig<TextEntrancePresetName | TextExitPresetName>,
): ResolvedTextMotionPhase {
  if (!config) {
    return {
      progress: phase === 'entrance' ? 1 : 0,
      opacity: 1,
      transform: 'none',
    };
  }

  const delay = config.delay ?? 0;
  const duration = Math.max(0, config.duration);
  const defaultEasing: TextMotionEasing = phase === 'entrance' ? 'ease-out' : 'ease-in';

  const progress = duration === 0
    ? frame >= delay ? 1 : 0
    : interpolateWithEasing(
      frame,
      [delay, delay + duration],
      [0, 1],
      config.easing ?? defaultEasing,
    );

  return {
    progress,
    opacity: phase === 'entrance' ? progress : 1 - progress,
    transform: getTextMotionTransform(config.preset, phase, progress, config.distance),
  };
}
