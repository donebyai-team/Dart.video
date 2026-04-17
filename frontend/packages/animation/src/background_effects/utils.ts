import type { CSSProperties } from 'react'
export type BackgroundEffectKey = 'none' | 'aurora' | 'glow' | 'sweep'

export const getBackgroundEffectType = (style?: {
  effect?: { type?: number | null } | null
} | null): number => style?.effect?.type ?? 0

export const getBackgroundEffectKey = (style?: {
  effect?: { type?: number | null } | null
} | null): BackgroundEffectKey => {
  switch (getBackgroundEffectType(style)) {
    case 1:
      return 'aurora'
    case 2:
      return 'glow'
    case 3:
      return 'sweep'
    default:
      return 'none'
  }
}

export const getSolidBackgroundColor = (
  style?: {
    style?: { case?: string; value?: { hex?: string | null } | null } | null
  } | null,
  fallback = '#f97316',
): string => {
  if (style?.style?.case !== 'solid') {
    return fallback
  }

  return style.style.value?.hex || fallback
}

export const supportsAnimatedBackgroundEffect = (style?: {
  style?: { case?: string | null } | null
  effect?: { type?: number | null } | null
} | null): boolean => style?.style?.case === 'solid' && getBackgroundEffectType(style) !== 0

export const hexToRgb = (hex: string) => {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!match) {
    return { r: 249, g: 115, b: 22 }
  }

  return {
    r: Number.parseInt(match[1], 16),
    g: Number.parseInt(match[2], 16),
    b: Number.parseInt(match[3], 16),
  }
}

export const toRgba = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export const effectLayerStyle = (style: CSSProperties): CSSProperties => ({
  position: 'absolute',
  pointerEvents: 'none',
  ...style,
})
