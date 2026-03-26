import { ZoomEffect } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import React from 'react'
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
 * Wraps any React content and applies smooth camera zoom animation.
 * Uses CSS transform to crop and scale into a selected region.
 * Works with any content: images, videos, text, UI components, etc.
 * 
 * The zoom works like a virtual camera:
 * 1. Scale the content by zoomLevel
 * 2. Translate so the selected region center moves to canvas center
 */
export const CanvasZoomEffect: React.FC<CanvasZoomEffectProps> = ({
  zooms,
  frame,
  fps,
  width,
  height,
  slideDurationInFrames,
  isPlaying = true,
  children
}) => {
  const { isRendering } = useRemotionEnvironment()
  
  // During rendering (export), always apply zoom effect
  // In player, only apply when playing (not when paused for editing)
  const shouldApplyEffect = isRendering || isPlaying
  
  if (!shouldApplyEffect) {
    return <>{children}</>
  }
  // Find the active zoom effect for the current frame
  const activeZoom = zooms.find((zoom) => {
    const startFrame = zoom.startFrame ?? 0
    const endFrame = zoom.endFrame ?? slideDurationInFrames
    return frame >= startFrame && frame <= endFrame
  })

  if (!activeZoom) {
    // No active zoom, render children as-is
    return <>{children}</>
  }

  const startFrame = activeZoom.startFrame ?? 0
  const endFrame = activeZoom.endFrame ?? slideDurationInFrames
  const maxZoom = Math.max(1, activeZoom.zoomLevel ?? 2)
  const totalFrames = endFrame - startFrame

  // Use 30% of duration for zoom-in and zoom-out, capped at 0.5s each
  const transitionFrames = Math.min(fps * 0.5, totalFrames * 0.3)

  const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)

  // Compute zoom progress: ramp up, hold, ramp down
  let zoomProgress = 1
  if (frame < startFrame + transitionFrames) {
    zoomProgress = easeInOut((frame - startFrame) / transitionFrames)
  } else if (frame > endFrame - transitionFrames) {
    zoomProgress = easeInOut((endFrame - frame) / transitionFrames)
  }

  const currentZoom = 1 + (maxZoom - 1) * zoomProgress

  // Zoom center in canvas coordinates (where user selected)
  const zoomX = activeZoom.x || width / 2
  const zoomY = activeZoom.y || height / 2

  // Canvas center
  const canvasCenterX = width / 2
  const canvasCenterY = height / 2

  // Calculate translation to move zoom center to canvas center
  // After scaling, we need to translate so (zoomX, zoomY) appears at (canvasCenterX, canvasCenterY)
  // Translation = (canvasCenter - zoomCenter) * currentZoom... but since we scale first,
  // we translate in pre-scaled coordinates: (canvasCenter - zoomCenter * currentZoom)
  const translateX = canvasCenterX - zoomX * currentZoom
  const translateY = canvasCenterY - zoomY * currentZoom

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `translate(${translateX}px, ${translateY}px) scale(${currentZoom})`,
          transformOrigin: '0 0',
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default CanvasZoomEffect
