import { useRef, useEffect, useMemo } from 'react'
import { Player, PlayerRef } from '@remotion/player'
import { motion } from 'framer-motion'
import CanvasOverlay from './CanvasOverlay'
import { SlideshowWithStore as Slideshow } from '../SlideshowWithStore'
import { useVideoStore } from '@/stores/video'
import { AnimationEditLayer } from '../animation/AnimationEditLayer'
import type { PatchOverlay } from '@coasterai/renderer'
import { getRealSlideStartFrame } from '../frame_calculations'
import { ActiveToolType } from '@/types/tools'
import { resolveOwningSceneElementId } from '../settings/sceneSettingsHelpers'

interface PlayerCanvasProps {
  playerRef: React.RefObject<PlayerRef>
  totalFrames: number
  fps: number
  currentFrame: number
  isFullscreen: boolean
  isEditing: boolean
  scale: number
  canvasSize: { width: number; height: number }
  onSetScale: (scale: number) => void
  isPlaying?: boolean
  onSelectTemplate?: (slideId: string) => void
  animationEdit: {
    overlay: PatchOverlay
    selectedEid: string | null
    setSelectedEid: (eid: string | null) => void
    animEditVersion: number
    applyValuePatch: (id: string, prop: string, value: unknown) => void
    applyStyleOverride: (id: string, style: Record<string, string | number>) => void
  }
}

const PlayerCanvas = ({
  playerRef,
  totalFrames,
  fps,
  currentFrame,
  isFullscreen,
  isEditing,
  scale,
  canvasSize,
  onSetScale,
  onSelectTemplate,
  isPlaying = false,
  animationEdit,
}: PlayerCanvasProps) => {
  const videoConfigFromStore = useVideoStore(s => s.videoConfig)
  const selectedSlide = useVideoStore(s => s.selectedSlide)
  const selectedEffectId = useVideoStore(s => s.selectedEffectId)
  const handleSelectEffect = useVideoStore(s => s.handleSelectEffect)
  const handleSelectTool = useVideoStore(s => s.handleSelectTool)
  const handleCloseTool = useVideoStore(s => s.handleCloseTool)
  const onUpdateSpotlight = useVideoStore(s => s.updateSpotlight)
  const onUpdateCallout = useVideoStore(s => s.updateCallout)
  const onUpdateZoom = useVideoStore(s => s.updateZoom)
  const getTimelineSlides = useVideoStore(s => s.getTimelineSlides)

  const {
    overlay,
    selectedEid,
    setSelectedEid,
    animEditVersion,
    applyValuePatch,
    applyStyleOverride,
  } = animationEdit

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const inputProps = useMemo(() => ({
    fps,
    isEditing: isEditing && !isPlaying,
    onSelectTemplate,
    isPlaying,
    animEditVersion,
  }), [fps, isEditing, onSelectTemplate, isPlaying, animEditVersion])

  // Pinch-to-zoom
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

  if (!videoConfigFromStore?.config?.sections || !videoConfigFromStore?.metadata?.resolution || !selectedSlide) {
    return <div className='flex items-center justify-center h-full text-muted-foreground'>Loading...</div>
  }

  const spotlights = selectedSlide.slide.spotlights ?? []
  const callouts = selectedSlide.slide.callouts ?? []
  const zooms = selectedSlide.slide.zooms ?? []

  // Calculate slide start frame for overlay visibility check
  const slideStartFrame = getRealSlideStartFrame(getTimelineSlides(), selectedSlide.slide.id, fps)

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 flex items-center justify-center overflow-hidden touch-none min-h-0 ${isFullscreen ? 'bg-black' : 'bg-muted/50'}`}
      style={{ touchAction: 'none' }}
    >
      <motion.div
        ref={canvasRef}
        className={`relative overflow-hidden ${isFullscreen ? 'bg-transparent' : 'bg-background shadow-2xl'}`}
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          transform: `scale(${scale})`,
          transformOrigin: 'center',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <Player
          ref={playerRef}
          component={Slideshow}
          inputProps={inputProps}
          durationInFrames={Math.round(totalFrames) || 1}
          compositionWidth={videoConfigFromStore.metadata!.resolution.width}
          compositionHeight={videoConfigFromStore.metadata!.resolution.height}
          fps={fps}
          style={{ width: '100%', height: '100%' }}
          playbackRate={1}
        />

        {!isPlaying && isEditing && handleSelectEffect && (
          <div className="absolute inset-0" style={{ zIndex: 30, pointerEvents: 'none' }}>
            <CanvasOverlay
              resolution={videoConfigFromStore.metadata!.resolution}
              spotlights={spotlights}
              callouts={callouts}
              zooms={zooms}
              selectedEffectId={selectedEffectId ?? null}
              onSelectObject={handleSelectEffect}
              onUpdateSpotlight={(id, updates) => onUpdateSpotlight(id, updates)}
              onUpdateCallout={(id, updates) => onUpdateCallout(id, updates)}
              onUpdateZoom={(id, updates) => onUpdateZoom(id, updates)}
              containerWidth={canvasSize.width}
              containerHeight={canvasSize.height}
              currentFrame={currentFrame}
              slideStartFrame={slideStartFrame}
            />
          </div>
        )}
      </motion.div>

      {/* Animation edit layer - disabled when an effect (zoom/spotlight/callout) is selected */}
      {isEditing && !isPlaying && !selectedEffectId && (
        <AnimationEditLayer
          playerRef={canvasRef}
          selectedEid={selectedEid}
          overlay={overlay}
          animEditVersion={animEditVersion}
          onSelectElement={eid => {
            const sceneElementId = eid ? resolveOwningSceneElementId(eid) : null
            setSelectedEid(eid)

            if (!sceneElementId) {
              // handleCloseTool()
              return
            }

            handleSelectTool({
              type: ActiveToolType.ADD_OR_EDIT_ANIMATION,
              settings: { animationElementId: sceneElementId }
            })
          }}
          onValuePatch={applyValuePatch}
          onStyleOverride={applyStyleOverride}
        />
      )}
    </div>
  )
}

export default PlayerCanvas
