import { ZoomEffect, MediaType, MetaData } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import React from 'react'

export type { ZoomEffect }

interface ZoomEffectProps {
  zoom: ZoomEffect
  frame: number
  fps: number
  width: number
  height: number
  slideDuration: number
  fullWidth: number
  fullHeight: number
  src: string
  meta: MetaData
  mediaType: MediaType
  style: {
    borderRadius: number
    objectFit: 'cover' | 'contain' | 'fill'
  }
}

/**
 * ZoomEffectComponent
 * Renders a smooth camera zoom animation on the media at CANVAS level.
 * Uses SVG transform (images) or CSS transform (video) to zoom into a marked center point.
 */
export const ZoomEffectComponent: React.FC<ZoomEffectProps> = ({
  zoom,
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
  mediaType
}) => {
  const startTime = zoom.startTime ?? 0
  const endTime = zoom.endTime ?? slideDuration
  const maxZoom = Math.max(1, zoom.zoomLevel ?? 2)

  const startFrame = startTime * fps
  const endFrame = endTime * fps

  if (frame < startFrame || frame > endFrame) return null

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
  const opacity = zoomProgress  // fade in/out matches zoom

  // Scale zoom center from resolution coords to canvas display coords
  const scaleX = width / fullWidth
  const scaleY = height / fullHeight
  const zx = (zoom.x || fullWidth / 2) * scaleX
  const zy = (zoom.y || fullHeight / 2) * scaleY

  // Media position in canvas display coords (following CalloutEffect pattern)
  const imgX = (meta.x || 0) * (meta.scale || 1)
  const imgY = (meta.y || 0) * (meta.scale || 1)
  const imgW = meta.width || 0
  const imgH = meta.height || 0

  const fitting: Record<string, string> = {
    cover: 'xMidYMid slice',
    contain: 'xMidYMid meet',
    fill: 'none'
  }
  const preserveAspectRatio = fitting[style.objectFit] || 'xMidYMid slice'

  // SVG transform: scale around the zoom center point
  const svgTransform = `translate(${zx}, ${zy}) scale(${currentZoom}) translate(${-zx}, ${-zy})`

  const canvasClipId = `zoom-canvas-clip-${zoom.id}`
  const mediaClipId = `zoom-media-clip-${zoom.id}`

  // Normalized center for CSS transform-origin (for video)
  const normX = zx / width
  const normY = zy / height

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity }}>
      {mediaType === MediaType.IMAGE && (
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
          <defs>
            {/* Clip to canvas bounds so zoomed image doesn't overflow */}
            <clipPath id={canvasClipId}>
              <rect x={0} y={0} width={width} height={height} />
            </clipPath>
            {/* Clip to media bounds (respects borderRadius) */}
            <clipPath id={mediaClipId}>
              <rect
                x={imgX}
                y={imgY}
                width={imgW}
                height={imgH}
                rx={style.borderRadius / (meta.scale || 1)}
                ry={style.borderRadius / (meta.scale || 1)}
              />
            </clipPath>
          </defs>

          {/* Zoomed image: transform group scales around the zoom center */}
          <g transform={svgTransform} clipPath={`url(#${canvasClipId})`}>
            <image
              x={imgX}
              y={imgY}
              href={src}
              width={imgW}
              height={imgH}
              preserveAspectRatio={preserveAspectRatio}
              clipPath={`url(#${mediaClipId})`}
            />
          </g>
        </svg>
      )}

      {mediaType === MediaType.VIDEO && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transform: `scale(${currentZoom})`,
              transformOrigin: `${normX * 100}% ${normY * 100}%`,
            }}
          >
            {/* Re-render the video; Remotion's Html5Video auto-syncs to current frame */}
            <video
              src={src}
              style={{
                width: '100%',
                height: '100%',
                objectFit: style.objectFit || 'cover',
                pointerEvents: 'none',
              }}
              muted
              playsInline
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ZoomEffectComponent
