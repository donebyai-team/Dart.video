import { ZoomEffect } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import React, { useLayoutEffect, useRef } from 'react'
import { useRemotionEnvironment } from 'remotion'

interface CanvasZoomEffectProps {
  zooms: ZoomEffect[]
  frame: number
  fps: number
  width: number
  height: number
  slideDurationInFrames: number
  isPlaying?: boolean // Only apply zoom effect when playing (not when paused in editor)
  children: React.ReactNode
}


/**
 * CanvasZoomEffect
 * Applies the zoom transform directly to the first MediaAsset in the scene.
 * This keeps scene layout, text, and drag/resize wrappers stable while
 * zooming only the underlying image or video content.
 */
export const CanvasZoomEffect: React.FC<CanvasZoomEffectProps> = ({
  zooms,
  frame,
  fps,
  slideDurationInFrames,
  isPlaying = true,
  children
}) => {
  const { isRendering } = useRemotionEnvironment()
  const rootRef = useRef<HTMLDivElement>(null)
  
  // During rendering (export), always apply zoom effect
  // In player, only apply when playing (not when paused for editing)
  const shouldApplyEffect = isRendering || isPlaying

  // Find the active zoom effect for the current frame
  const activeZoom = zooms.find((zoom) => {
    const startFrame = zoom.startFrame ?? 0
    const endFrame = zoom.endFrame ?? slideDurationInFrames
    return frame >= startFrame && frame <= endFrame
  })

  let transform = ''
  let transformOrigin = ''

  if (shouldApplyEffect && activeZoom) {
    const startFrame = activeZoom.startFrame ?? 0
    const endFrame = activeZoom.endFrame ?? slideDurationInFrames
    const maxZoom = Math.max(1, activeZoom.zoomLevel ?? 2)
    const totalFrames = endFrame - startFrame

    // Use 25% of duration for zoom-in, 35% for zoom-out (slower return feels smoother)
    const zoomInFrames = Math.min(fps * 0.5, totalFrames * 0.25)
    const zoomOutFrames = Math.min(fps * 0.7, totalFrames * 0.35)

    // Smoother cubic ease-in-out for gentler zoom transitions
    const easeInOut = (t: number) => t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2

    // Compute zoom progress: ramp up, hold, ramp down
    let zoomProgress = 1
    if (frame < startFrame + zoomInFrames) {
      const t = (frame - startFrame) / zoomInFrames
      zoomProgress = easeInOut(Math.min(1, Math.max(0, t)))
    } else if (frame > endFrame - zoomOutFrames) {
      const t = (endFrame - frame) / zoomOutFrames
      zoomProgress = easeInOut(Math.min(1, Math.max(0, t)))
    }

    const currentZoom = 1 + (maxZoom - 1) * zoomProgress

    if (Math.abs(currentZoom - 1) >= 0.001) {
      const zoomX = Math.min(1, Math.max(0, activeZoom.x ?? 0.5))
      const zoomY = Math.min(1, Math.max(0, activeZoom.y ?? 0.5))
      transform = `scale(${currentZoom})`
      transformOrigin = `${(zoomX * 100).toFixed(3)}% ${(zoomY * 100).toFixed(3)}%`
    }
  }

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const target = root.querySelector<HTMLElement>('[data-coaster-media-content="true"]')
    if (!target) return

    target.style.transform = transform
    target.style.transformOrigin = transformOrigin || 'center center'

    return () => {
      target.style.transform = ''
      target.style.transformOrigin = 'center center'
    }
  }, [transform, transformOrigin, children])

  return (
    <div
      ref={rootRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
    >
      {children}
    </div>
  )
}

export default CanvasZoomEffect
