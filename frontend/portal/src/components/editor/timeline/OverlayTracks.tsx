import { useState } from 'react'
import { OverlayTile } from './OverlayTile'
import type { OverlayItem } from './types'
import { EffectType } from '@coasterai/pb/coasterai/core/v1/slide_pb'
interface OverlayTracksProps {
  overlayItems: OverlayItem[]
  selectedEffectId?: string | null
  currentTime: number
  pixelsPerSecond: number
  onSelectOverlay?: (overlayId: string, slideId: string) => void
  onSeek?: (time: number) => void
}

export function getOverlayName(objType: EffectType): string {
  if (objType === EffectType.SPOTLIGHT) {
    return 'spotlight'
  } else if (objType === EffectType.CALLOUT) {
    return 'callout'
  } else if (objType === EffectType.ZOOM) {
    return 'zoom'
  } else {
    return 'unknown'
  }
}

export function OverlayTracks({
  overlayItems,
  selectedEffectId,
  currentTime,
  pixelsPerSecond,
  onSelectOverlay,
  onSeek
}: OverlayTracksProps) {
  const [hoverInfo, setHoverInfo] = useState<{
    name: EffectType
    timeRange: string
    x: number
  } | null>(null)

  // Don't render if no overlays
  if (overlayItems.length === 0) {
    return null
  }

  // Group overlays by track index
  const maxTrackIndex = Math.max(...overlayItems.map(o => o.trackIndex))
  const tracks: OverlayItem[][] = []
  for (let i = 0; i <= maxTrackIndex; i++) {
    tracks.push(overlayItems.filter(o => o.trackIndex === i))
  }

  // Determine which overlays are highlighted based on current time
  const getHighlightedOverlays = () => {
    const highlighted = new Set<string>()
    overlayItems.forEach(overlay => {
      if (currentTime >= overlay.startTime && currentTime < overlay.startTime + overlay.duration) {
        highlighted.add(overlay.overlayId)
      }
    })
    return highlighted
  }
  const highlightedOverlays = getHighlightedOverlays()

  const handleTileHover = (e: React.MouseEvent, info: { name: EffectType; timeRange: string } | null) => {
    if (info) {
      const rect = e.currentTarget.getBoundingClientRect()
      const parentRect = e.currentTarget.closest('.relative')?.getBoundingClientRect()
      const x = parentRect ? e.clientX - parentRect.left : e.clientX - rect.left
      setHoverInfo({ ...info, x })
    } else {
      setHoverInfo(null)
    }
  }

  return (
    <div className='relative border-t border-border/40'>
      {tracks.map((trackOverlays, trackIndex) => (
        <div
          key={trackIndex}
          className='relative py-1.5 border-b border-border/40'
          style={{ height: 40 }}
        >
          {trackOverlays.map(overlayItem => (
            <div
              key={overlayItem.id}
              className='absolute inset-y-1.5 left-0 right-0'
              onMouseMove={e =>
                handleTileHover(e, {
                  name: overlayItem.overlayType,
                  timeRange: `${overlayItem.startTime.toFixed(1)}s - ${(overlayItem.startTime + overlayItem.duration).toFixed(1)}s`
                })
              }
              onMouseLeave={e => handleTileHover(e, null)}
            >
              <OverlayTile
                overlayItem={overlayItem}
                isSelected={overlayItem.overlayId === selectedEffectId}
                isHighlighted={highlightedOverlays.has(overlayItem.overlayId)}
                pixelsPerSecond={pixelsPerSecond}
                onClick={() => {
                  onSelectOverlay?.(overlayItem.overlayId, overlayItem.slideId)
                  if (onSeek) {
                    onSeek(overlayItem.startTime)
                  }
                }}
                onHover={() => {}}
              />
            </div>
          ))}
        </div>
      ))}

      {/* Hover info tooltip */}
      {hoverInfo && (
        <div
          className='absolute -top-8 px-2 py-1 bg-foreground text-background text-xs rounded shadow-lg z-50 pointer-events-none whitespace-nowrap'
          style={{
            left: `${hoverInfo.x}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className='font-medium'>{getOverlayName(hoverInfo.name)}</div>
          <div className='text-[10px] opacity-80'>{hoverInfo.timeRange}</div>
        </div>
      )}
    </div>
  )
}
