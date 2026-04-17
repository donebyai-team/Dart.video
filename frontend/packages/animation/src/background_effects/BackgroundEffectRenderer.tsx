import React, { useEffect, useState } from 'react'
import { continueRender, delayRender, getRemotionEnvironment } from 'remotion'
import type { BackgroundEffectKey } from './utils'

type BackgroundEffectComponent = React.ComponentType<{ color: string }>

const loaders: Record<BackgroundEffectKey, (() => Promise<{ default?: BackgroundEffectComponent; AuroraBackground?: BackgroundEffectComponent; GlowBackground?: BackgroundEffectComponent; SweepBackground?: BackgroundEffectComponent }>) | null> = {
  none: null,
  aurora: () => import('./AuroraBackground'),
  glow: () => import('./GlowBackground'),
  sweep: () => import('./SweepBackground'),
}

const cache = new Map<BackgroundEffectKey, BackgroundEffectComponent>()

const getExportedComponent = (
  type: BackgroundEffectKey,
  mod: Awaited<ReturnType<Exclude<(typeof loaders)[BackgroundEffectKey], null>>>,
): BackgroundEffectComponent | null => {
  switch (type) {
    case 'aurora':
      return mod.AuroraBackground ?? mod.default ?? null
    case 'glow':
      return mod.GlowBackground ?? mod.default ?? null
    case 'sweep':
      return mod.SweepBackground ?? mod.default ?? null
    default:
      return null
  }
}

export const BackgroundEffectRenderer: React.FC<{
  effectType: BackgroundEffectKey
  color: string
}> = ({ effectType, color }) => {
  const cached = cache.get(effectType) ?? null
  const [Component, setComponent] = useState<BackgroundEffectComponent | null>(() => cached)
  const [renderHandle] = useState(() =>
    getRemotionEnvironment().isRendering && !cached && effectType !== 'none'
      ? delayRender(`Loading background effect: ${effectType}`)
      : null,
  )

  useEffect(() => {
    if (effectType === 'none') {
      setComponent(null)
      if (renderHandle) continueRender(renderHandle)
      return
    }

    const cachedComponent = cache.get(effectType) ?? null
    if (cachedComponent) {
      setComponent(() => cachedComponent)
      if (renderHandle) continueRender(renderHandle)
      return
    }

    const load = loaders[effectType]
    if (!load) {
      setComponent(null)
      if (renderHandle) continueRender(renderHandle)
      return
    }

    let disposed = false

    load()
      .then((mod) => {
        const resolved = getExportedComponent(effectType, mod)
        if (!resolved) {
          throw new Error(`Background effect component missing for ${effectType}`)
        }
        cache.set(effectType, resolved)
        if (!disposed) {
          setComponent(() => resolved)
        }
      })
      .catch((error) => {
        console.error('Failed to load background effect', error)
        if (!disposed) {
          setComponent(null)
        }
      })
      .finally(() => {
        if (!disposed && renderHandle) {
          continueRender(renderHandle)
        }
      })

    return () => {
      disposed = true
    }
  }, [effectType, renderHandle])

  if (!Component) {
    return null
  }

  return <Component color={color} />
}
