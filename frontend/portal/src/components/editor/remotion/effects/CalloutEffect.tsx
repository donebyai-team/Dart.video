import { CalloutEffect, MediaType, MetaData } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import React from 'react'

interface CalloutEffectProps {
  callout: CalloutEffect
  frame: number
  fps: number
  width: number
  height: number
  slideDuration: number
  fullWidth: number
  src: string
  fullHeight: number
  meta: MetaData
  borderColor: string
  mediaType: MediaType
  style: {
    borderRadius: number
    objectFit: 'cover' | 'contain' | 'fill'
  }
}

/**
 * CalloutEffect Component (NEW ARCHITECTURE)
 * Renders a callout overlay with zoom and border translation effects on image/video slides at CANVAS level
 * Creates a clear callout area with animated zoom and border while darkening and optionally blurring the rest
 */
export const CalloutEffectComponent: React.FC<CalloutEffectProps> = ({
  callout,
  frame,
  fps,
  width,
  height,
  slideDuration,
  fullWidth,
  fullHeight,
  src,
  meta,
  style,
  borderColor,
  mediaType
}) => {
  const startTime = callout.startTime ?? 0
  const endTime = callout.endTime ?? slideDuration
  const zoom = 2
  const startFrame = startTime * fps
  const endFrame = endTime * fps
  const fitting = {
    ['cover']: 'xMidYMid slice',
    ['contain']: 'xMidYMid meet',
    ['fill']: 'none'
  }

  const preserveAspectRatio = fitting[style.objectFit]

  // Check if callout is visible at current frame
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

  // Calculate zoom animation progress
  const totalFrames = endFrame - startFrame
  const currentProgress = (frame - startFrame) / totalFrames

  // Smooth easing function for zoom (ease-in-out)
  const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)
  const zoomProgress = easeInOut(currentProgress)

  // Apply zoom - starts at 1 and zooms to the specified zoom value
  const currentZoom = 1 + (zoom - 1) * zoomProgress

  // Scale callout coordinates from full resolution to actual container size
  const scaleX = width / fullWidth
  const scaleY = height / fullHeight

  const baseX = (callout.x || 100) * scaleX
  const baseY = (callout.y || 100) * scaleY
  const baseSpotWidth = (callout.width || 200) * scaleX
  const baseSpotHeight = (callout.height || 150) * scaleY
  const borderRadius = (callout.borderRadius || 8) * Math.min(scaleX, scaleY)
  const blurAmount = callout.blurAmount || 0

  // Apply zoom to callout dimensions (zoom from center)
  const spotWidth = baseSpotWidth * currentZoom
  const spotHeight = baseSpotHeight * currentZoom
  const x = baseX - (spotWidth - baseSpotWidth) / 2
  const y = baseY - (spotHeight - baseSpotHeight) / 2

  // Apply zoom to the image inside the callout (zoom from callout center)
  const zoomedImageWidth = (meta.width || 0) * currentZoom
  const zoomedImageHeight = (meta.height || 0) * currentZoom
  const zoomedImageX = (meta.x || 1) * (meta.scale || 1) - (zoomedImageWidth - (meta.width || 0)) / 2
  const zoomedImageY = (meta.y || 1) * (meta.scale || 1) - (zoomedImageHeight - (meta.height || 0)) / 2

  // Border translation effect - oscillating animation
  const borderAnimationSpeed = 2 // Speed of border animation
  const borderOffset = Math.sin(currentProgress * Math.PI * borderAnimationSpeed) * 3 // Oscillate +/- 3px

  // Create unique IDs for this callout
  const maskId = `callout-mask-${callout.id}`
  const filterId = `callout-blur-${callout.id}`
  const clipId = `clip-${callout.id}`
  const calloutClipId = `callout-clip-${callout.id}`

  // Calculate the perimeter of the rectangle for stroke animation
  const perimeter = 2 * (spotWidth + spotHeight)

  // Calculate stroke animation progress (0 to 1)
  const strokeProgress = easeInOut(currentProgress)

  // Animate stroke from 0 to full perimeter
  const strokeDashoffset = perimeter * (1 - strokeProgress)

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

          {/* Clip path for the callout area only */}
          <clipPath id={calloutClipId}>
            <rect x={x} y={y} width={spotWidth} height={spotHeight} rx={borderRadius} ry={borderRadius} />
          </clipPath>

          {/* Blur filter */}
          <filter id={filterId}>
            <feGaussianBlur stdDeviation={blurAmount} />
          </filter>

          {/* Mask with callout cutout */}
          <mask id={maskId}>
            {/* White background (visible/blurred area) */}
            <rect x='0' y='0' width={width} height={height} fill='white' />
            {/* Black callout area (clear/unblurred) */}
            <rect x={x} y={y} width={spotWidth} height={spotHeight} rx={borderRadius} ry={borderRadius} fill='black' />
          </mask>
        </defs>

        {/* Blurred background image */}
        {mediaType == MediaType.IMAGE && (
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
        )}

        {/* Zoomed image visible only in callout area */}
        {mediaType == MediaType.IMAGE && (
          <image
            x={zoomedImageX}
            y={zoomedImageY}
            href={src}
            width={zoomedImageWidth}
            height={zoomedImageHeight}
            preserveAspectRatio={preserveAspectRatio}
            clipPath={`url(#${calloutClipId})`}
            style={{ opacity }}
          />
        )}

        {/* Blurred overlay - covers everything except callout area */}
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

        {/* Animated border with translation effect */}
        <rect
          x={x + borderOffset}
          y={y + borderOffset}
          width={spotWidth}
          height={spotHeight}
          rx={borderRadius}
          ry={borderRadius}
          fill='none'
          stroke={borderColor}
          strokeWidth={10}
          strokeDasharray={perimeter}
          strokeDashoffset={strokeDashoffset}
          style={{ opacity }}
        />
      </svg>
    </div>
  )
}

export default CalloutEffectComponent
