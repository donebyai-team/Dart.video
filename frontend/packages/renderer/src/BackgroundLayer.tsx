import React from 'react'
import { AbsoluteFill } from 'remotion'
import { BackgroundEffectType, type BackgroundStyle } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { BackgroundEffectRenderer } from '@coasterai/animation'
import { backgroundStyleToCSS } from './backgroundUtils'
import { getBackgroundEffectKey, getBackgroundEffectType, getSolidBackgroundColor, supportsAnimatedBackgroundEffect } from './backgroundEffectUtils'

export const BackgroundLayer: React.FC<{
  backgroundStyle?: BackgroundStyle | null
  children?: React.ReactNode
}> = ({ backgroundStyle, children }) => {
  const effectType = getBackgroundEffectType(backgroundStyle)
  const canRenderAnimatedEffect = supportsAnimatedBackgroundEffect(backgroundStyle)

  if (!canRenderAnimatedEffect || effectType === BackgroundEffectType.NONE) {
    return (
      <AbsoluteFill style={{ background: backgroundStyleToCSS(backgroundStyle) }}>
        {children}
      </AbsoluteFill>
    )
  }

  return (
    <AbsoluteFill style={{ background: 'transparent' }}>
      <BackgroundEffectRenderer
        effectType={getBackgroundEffectKey(backgroundStyle)}
        color={getSolidBackgroundColor(backgroundStyle)}
      />
      {children}
    </AbsoluteFill>
  )
}
