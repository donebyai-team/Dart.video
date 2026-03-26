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
    // Zoom in phase
    const t = (frame - startFrame) / zoomInFrames
    zoomProgress = easeInOut(Math.min(1, Math.max(0, t)))
  } else if (frame > endFrame - zoomOutFrames) {
    // Zoom out phase - ensure we reach exactly 0 at endFrame
    const t = (endFrame - frame) / zoomOutFrames
    zoomProgress = easeInOut(Math.min(1, Math.max(0, t)))
  }

  const currentZoom = 1 + (maxZoom - 1) * zoomProgress
  
  // If zoom is essentially 1 (no zoom), render without transform to avoid any visual artifacts
  if (Math.abs(currentZoom - 1) < 0.001) {
    return <>{children}</>
  }

  // Zoom center in canvas coordinates (where user selected)
  const zoomX = activeZoom.x || width / 2
  const zoomY = activeZoom.y || height / 2

  // Camera zoom: scale around the zoom point
  // The content stays in place, we just zoom the "camera" into that point
  // transform-origin is set to the zoom point, so scaling happens around it
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
          transform: `scale(${currentZoom})`,
          transformOrigin: `${zoomX}px ${zoomY}px`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default CanvasZoomEffect
