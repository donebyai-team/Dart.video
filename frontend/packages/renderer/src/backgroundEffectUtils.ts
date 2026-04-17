import { BackgroundEffectType, type BackgroundStyle } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import type { BackgroundEffectKey } from '@coasterai/animation'

export const getBackgroundEffectType = (
  style?: BackgroundStyle | null,
): BackgroundEffectType => style?.effect?.type ?? BackgroundEffectType.NONE

export const getBackgroundEffectKey = (
  style?: BackgroundStyle | null,
): BackgroundEffectKey => {
  switch (getBackgroundEffectType(style)) {
    case BackgroundEffectType.AURORA:
      return 'aurora'
    case BackgroundEffectType.GLOW:
      return 'glow'
    case BackgroundEffectType.SWEEP:
      return 'sweep'
    default:
      return 'none'
  }
}

export const getSolidBackgroundColor = (
  style?: BackgroundStyle | null,
  fallback = '#f97316',
): string => {
  if (style?.style.case !== 'solid') {
    return fallback
  }

  return style.style.value.hex || fallback
}

export const supportsAnimatedBackgroundEffect = (
  style?: BackgroundStyle | null,
): boolean => style?.style.case === 'solid' && getBackgroundEffectType(style) !== BackgroundEffectType.NONE
