import { useEffect, useState } from 'react'
import { Pause, Play, X } from 'lucide-react'
import { useClientsContext } from '@coasterai/ui-core/context/ClientContext'
import { PatchOverlay } from '@coasterai/renderer'
import { SlideStatus, type Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { Button } from '@/components/ui/button'
import SlideThumbnail from '@/components/editor/SlideThumbnail'
import { useVideoStore } from '@/stores/video'
import { getConnectError } from '@/utils/error'
import toast from 'react-hot-toast'

const sceneSuggestionsCache = new Map<string, Slide[]>()

interface ReimagineSettingsProps {
  onClose: () => void
  setOverlay: (overlay: PatchOverlay) => void
  onPlay?: () => void
  isPreviewPlaying?: boolean
}

const ReimagineSettings = ({
  onClose,
  setOverlay,
  onPlay,
  isPreviewPlaying = false,
}: ReimagineSettingsProps) => {
  const { portalClient } = useClientsContext()
  const updateSlide = useVideoStore(s => s.updateSlide)
  const videoId = useVideoStore(s => s.videoConfig?.id)
  const selectedSlide = useVideoStore(s => s.selectedSlide)
  const resolution = useVideoStore(s => s.videoConfig?.metadata?.resolution)
  const fps = useVideoStore(s => s.videoConfig?.metadata?.fps) ?? 30

  const [scenes, setScenes] = useState<Slide[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const applySlide = (slide: Slide) => {
    const updatedContent = slide.content
    if (!updatedContent) return

    const existingContent = selectedSlide?.content
      ? selectedSlide.content
      : undefined

    const pathOverlay = updatedContent.edits as unknown as PatchOverlay
    setOverlay(pathOverlay)

    updateSlide({
      slideStatus: SlideStatus.GENERATED,
      durationInFrames: slide.durationInFrames,
      settledFrame: slide.settledFrame,
      content: {
        ...(existingContent ?? {}),
        codeRegistry: updatedContent.codeRegistry,
        edits: pathOverlay,
      },
      backgroundStyle: slide.backgroundStyle,
    } as Slide)  
  }

  useEffect(() => {
    let cancelled = false

    const loadSuggestions = async () => {
      if (!videoId || !selectedSlide?.id) {
        setScenes([])
        setIsLoading(false)
        return
      }

      const cachedScenes = sceneSuggestionsCache.get(selectedSlide.id)
      if (cachedScenes) {
        setScenes(cachedScenes)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const response = await portalClient.suggestScenes({
          videoId,
          sceneId: selectedSlide.id,
        })

        if (!cancelled) {
          sceneSuggestionsCache.set(selectedSlide.id, response.scenes)
          setScenes(response.scenes)
        }
      } catch (err: any) {
        if (!cancelled) {
          setScenes([])
          toast.error(getConnectError(err))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadSuggestions()

    return () => {
      cancelled = true
    }
  }, [portalClient, selectedSlide?.id, videoId])

  return (
    <div className='h-full flex flex-col bg-card'>
      <div className='flex items-center justify-between px-5 border-b border-border'>
        <h3 className='font-semibold text-sm tracking-tight'>AI Suggestions</h3>
        <Button variant='ghost' size='icon' onClick={onClose}>
          <X className='w-4 h-4' />
        </Button>
      </div>

      <div className='flex-1 overflow-y-auto px-5 py-6'>
        {isLoading ? (
          <div className='flex h-full min-h-48 flex-col items-center justify-center gap-3 text-sm text-muted-foreground'>
            <div className='h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent' />
            <p>Generating scene suggestions...</p>
          </div>
        ) : scenes.length === 0 ? (
          <div className='flex h-full min-h-48 items-center justify-center text-sm text-muted-foreground'>
            No suggestions available.
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-4'>
            {scenes.map((slide, index) => (
              <button
                key={`${slide.id || 'suggested-slide'}-${index}`}
                type='button'
                onClick={() => applySlide(slide)}
                className='overflow-hidden rounded-lg border border-border bg-muted/20 text-left transition-colors hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40'
              >
                <div
                  className='overflow-hidden'
                  style={resolution ? { aspectRatio: `${resolution.width} / ${resolution.height}` } : undefined}
                >
                  <SlideThumbnail slide={slide} index={index} resolution={resolution} fps={fps} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {onPlay && (
        <div className='border-t border-border px-5 py-4 mt-auto'>
          <Button variant='default' size='sm' className='w-full gap-2' onClick={onPlay}>
            {isPreviewPlaying ? <Pause className='w-3.5 h-3.5' /> : <Play className='w-3.5 h-3.5' />}
            {isPreviewPlaying ? 'Stop Preview' : 'Preview'}
          </Button>
        </div>
      )}
    </div>
  )
}

export default ReimagineSettings
