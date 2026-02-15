import { useRef, useEffect, useMemo } from 'react'
import { Player, PlayerRef } from '@remotion/player'
import { motion } from 'framer-motion'
import CanvasOverlay from './CanvasOverlay'
import { Slideshow } from '../RemotionSlideshow'
import { useVideoStore } from '@/stores/video'

interface PlayerCanvasProps {
  playerRef: React.RefObject<PlayerRef>
  totalFrames: number
  fps: number
  isFullscreen: boolean
  scale: number
  canvasSize: { width: number; height: number }
  onSetScale: (scale: number) => void
  isPlaying?: boolean
  onSelectTemplate?: (slideId: string) => void
}

const PlayerCanvas = ({
  playerRef,
  totalFrames,
  fps,
  isFullscreen,
  scale,
  canvasSize,
  onSetScale,
  onSelectTemplate,
  isPlaying = false
}: PlayerCanvasProps) => {
  const videoConfigFromStore = useVideoStore(s => s.videoConfig)
  const selectedSlide = useVideoStore(s => s.selectedSlide)

  // Memoization of inputProps before passing to <Player/>.
  // Prevents regressions in playback behaviour of Video 
  const inputProps = useMemo(() => {
    return {
      fps,
      isEditing: !isPlaying, // Only enable editing when NOT playing
      onSelectTemplate
    }
  }, [fps, isPlaying, onSelectTemplate])
  
  // Early return if no data
  if (!videoConfigFromStore?.config?.sections || !videoConfigFromStore?.metadata?.resolution || !selectedSlide) {
    return <div className='flex items-center justify-center h-full text-muted-foreground'>Loading...</div>
  }
  const selectedEffectId = useVideoStore(s => s.selectedEffectId)
  const handleSelectEffect = useVideoStore(s => s.handleSelectEffect)

  const onUpdateSpotlight = useVideoStore(s => s.updateSpotlight)
  const onUpdateCallout = useVideoStore(s => s.updateCallout)
  const containerRef = useRef<HTMLDivElement>(null)

  // Get effective canvas objects from store
  const spotlights = selectedSlide.slide.spotlights || []
  const callouts = selectedSlide.slide.callouts || []

  // Pinch to zoom handler
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        onSetScale(Math.min(3, Math.max(0.25, scale + delta)))
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [scale, onSetScale])

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex items-center justify-center overflow-hidden touch-none min-h-0 ${
        isFullscreen ? 'bg-black' : 'bg-muted/50'
      }`}
      style={{ touchAction: 'none' }}
    >
      <motion.div
        className={`relative overflow-hidden ${isFullscreen ? 'bg-transparent' : 'bg-background shadow-2xl'}`}
        style={{
          width: isFullscreen ? canvasSize.width : canvasSize.width * scale,
          height: isFullscreen ? canvasSize.height : canvasSize.height * scale
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Remotion Player */}
        <div
          style={{
            position: 'relative',
            zIndex: isPlaying ? 2 : 25,
            width: '100%',
            height: '100%',
            pointerEvents: 'auto' // Always allow pointer events to reach templates
          }}
        >
          <Player
            ref={playerRef}
            component={Slideshow as any}
            inputProps={inputProps}
            durationInFrames={totalFrames || 1}
            compositionWidth={videoConfigFromStore?.metadata?.resolution.width}
            compositionHeight={videoConfigFromStore?.metadata?.resolution.height}
            fps={fps}
            style={{
              width: '100%',
              height: '100%'
            }}
            playbackRate={1}
          />
        </div>

        {/* Canvas overlay - always rendered for click handling and displaying objects */}
        {!isPlaying && handleSelectEffect && (
          <div className='absolute inset-0' style={{ zIndex: 30, pointerEvents: 'none' }}>
            <CanvasOverlay
              resolution={videoConfigFromStore?.metadata?.resolution}
              spotlights={spotlights}
              callouts={callouts}
              selectedEffectId={selectedEffectId || null}
              onSelectObject={handleSelectEffect}
              onUpdateSpotlight={(id, updates) => onUpdateSpotlight(id, updates)}
              onUpdateCallout={(id, updates) => onUpdateCallout(id, updates)}
              containerWidth={canvasSize.width * scale}
              containerHeight={canvasSize.height * scale}
            />
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default PlayerCanvas
