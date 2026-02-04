import { useVideoStore } from '@/stores/video'
import { MetaData, SpotlightEffect } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import React from 'react'
import { useMemo } from 'react'

interface SpotlightEffectProps {
  spotlight: SpotlightEffect
  frame: number
  fps: number
  width: number
  height: number
  slideDuration: number
  fullWidth: number
  src: string
  fullHeight: number
  meta: MetaData
  style: {
    borderRadius: number
    objectFit:"cover" | "contain" | "fill"
  }
}

/**
 * SpotlightEffect Component (NEW ARCHITECTURE)
 * Renders a spotlight overlay with blur effect on image/video slides at CANVAS level
 * Creates a clear spotlight area while darkening and optionally blurring the rest
 */
export const SpotlightEffectComponent: React.FC<SpotlightEffectProps> = ({
  spotlight,
  frame,
  fps,
  width,
  height,
  slideDuration,
  fullWidth,
  fullHeight,
  src,
  meta,
  style
}) => {
  const startTime = spotlight.startTime ?? 0
  const endTime = spotlight.endTime ?? slideDuration

  const startFrame = startTime * fps
  const endFrame = endTime * fps
  const fitting = {
    ['cover']: 'xMidYMid slice',
    ['contain']: 'xMidYMid meet',
    ['fill']: 'none'
  }

  const preserveAspectRatio = fitting[style.objectFit]

  // Check if spotlight is visible at current frame
  if (frame < startFrame || frame > endFrame) {
    return null
  }

  // Calculate fade in/out
  const fadeInDuration = fps * 0.3 // 0.3s fade
  const fadeOutDuration = fps * 0.3

  let opacity = 1
  if (frame < startFrame + fadeInDuration) {
    opacity = (frame - startFrame) / fadeInDuration
  } else if (frame > endFrame - fadeOutDuration) {
    opacity = (endFrame - frame) / fadeOutDuration
  }

  // Scale spotlight coordinates from full resolution to actual container size
  const scaleX = width / fullWidth
  const scaleY = height / fullHeight

  const x = (spotlight.x || 100) * scaleX
  const y = (spotlight.y || 100) * scaleY
  const spotWidth = (spotlight.width || 200) * scaleX
  const spotHeight = (spotlight.height || 150) * scaleY
  const borderRadius = (spotlight.borderRadius || 8) * Math.min(scaleX, scaleY)
  const blurAmount = spotlight.blurAmount || 0

  // Create unique IDs for this spotlight
  const maskId = `spotlight-mask-${spotlight.id}`
  const filterId = `spotlight-blur-${spotlight.id}`
  const clipId = `clip-${spotlight.id}`

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <clipPath id={clipId}>
            <rect
              x={(meta.x || 1) * (meta.scale || 1)}
              y={(meta.y || 1) * (meta.scale || 1)}
              width={meta.width || 0}
              height={meta.height || 0}
              rx={style.borderRadius / (meta.scale || 1)}
              ry={style.borderRadius / (meta.scale || 1)}
            />
          </clipPath>

          {/* Blur filter */}
          <filter id={filterId}>
            <feGaussianBlur stdDeviation={blurAmount} />
          </filter>

          {/* Mask with spotlight cutout */}
          <mask id={maskId}>
            {/* White background (visible/blurred area) */}
            <rect x='0' y='0' width={width} height={height} fill='white' />
            {/* Black spotlight area (clear/unblurred) */}
            <rect x={x} y={y} width={spotWidth} height={spotHeight} rx={borderRadius} ry={borderRadius} fill='black' />
          </mask>
        </defs>

        <image
          x={(meta.x || 1) * (meta.scale || 1)}
          y={(meta.y || 1) * (meta.scale || 1)}
          href={src}
          width={meta.width || 0}
          height={meta.height || 0}
          preserveAspectRatio={preserveAspectRatio}
          filter={`url(#${filterId})`}
          mask={`url(#${maskId})`}
          clipPath={`url(#${clipId})`}
        />

        {/* Blurred overlay - covers everything except spotlight area */}
        <rect
          x='0'
          y='0'
          width={width}
          height={height}
          filter={`url(#${filterId})`}
          fill='rgba(0, 0, 0, 0.6)'
          mask={`url(#${maskId})`}
          style={{ opacity }}
        />
      </svg>

      {/* Spotlight border highlight - removed during playback, only shows in edit mode via SpotlightOverlay */}
    </div>
  )
}

export default SpotlightEffectComponent
