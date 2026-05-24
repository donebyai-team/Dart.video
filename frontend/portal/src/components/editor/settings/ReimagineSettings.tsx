import { useEffect, useMemo, useRef, useState } from 'react'
import { Layers3, Pause, Play, X } from 'lucide-react'
import { useClientsContext } from '@coasterai/ui-core/context/ClientContext'
import { PatchOverlay } from '@coasterai/renderer'
import { Section, SlideStatus, type Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { Button } from '@/components/ui/button'
import SlideThumbnail from '@/components/editor/SlideThumbnail'
import { useVideoStore } from '@/stores/video'
import { getConnectError } from '@/utils/error'
import toast from 'react-hot-toast'

const sceneSuggestionsCache = new Map<string, Section[]>()

interface ReimagineSettingsProps {
  onClose: () => void
  setOverlay: (overlay: PatchOverlay) => void
  onPreviewTemplate?: (slideId?: string, endSlideId?: string) => void
  isPreviewPlaying?: boolean
}

const ReimagineSettings = ({
  onClose,
  setOverlay,
  onPreviewTemplate,
  isPreviewPlaying = false,
}: ReimagineSettingsProps) => {
  const { portalClient } = useClientsContext()
  const updateSlideById = useVideoStore(s => s.updateSlideById)
  const addSlide = useVideoStore(s => s.addSlide)
  const removeSlide = useVideoStore(s => s.removeSlide)
  const setSelectedSlideById = useVideoStore(s => s.setSelectedSlideById)
  const videoConfig = useVideoStore(s => s.videoConfig)
  const videoId = useVideoStore(s => s.videoConfig?.id)
  const selectedSlide = useVideoStore(s => s.selectedSlide)
  const resolution = useVideoStore(s => s.videoConfig?.metadata?.resolution)
  const fps = useVideoStore(s => s.videoConfig?.metadata?.fps) ?? 30

  const targetSlideIdRef = useRef(selectedSlide?.id ?? '')
  const insertedSlideIdsRef = useRef<string[]>([])
  const [scenes, setScenes] = useState<Section[]>([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const targetSectionId = useMemo(() => {
    const targetSlideId = targetSlideIdRef.current
    if (!targetSlideId || !videoConfig?.config?.sections) return null

    for (const section of videoConfig.config.sections) {
      if (section.slides.some(slide => slide.id === targetSlideId)) {
        return section.id
      }
    }

    return null
  }, [videoConfig])

  const applySuggestion = (suggestion: Section, suggestionIndex: number) => {
    const slides = suggestion.slides
    const firstSlide = slides[0]
    const targetSlideId = targetSlideIdRef.current
    if (!targetSectionId || !targetSlideId || !firstSlide) return

    // Remove previously inserted sibling slides before applying the next suggestion.
    for (const insertedSlideId of insertedSlideIdsRef.current) {
      removeSlide(targetSectionId, insertedSlideId)
    }
    insertedSlideIdsRef.current = []

    const updatedContent = firstSlide.content
    if (!updatedContent) return

    const existingContent = videoConfig?.config?.sections
      .flatMap(section => section.slides)
      .find(slide => slide.id === targetSlideId)
      ?.content

    const pathOverlay = updatedContent.edits as unknown as PatchOverlay
    setOverlay(pathOverlay)
    setSelectedSlideById(targetSlideId)

    updateSlideById(targetSlideId, {
      slideStatus: SlideStatus.GENERATED,
      durationInFrames: firstSlide.durationInFrames,
      settledFrame: firstSlide.settledFrame,
      content: {
        ...(existingContent ?? {}),
        codeRegistry: updatedContent.codeRegistry,
        edits: pathOverlay,
      },
      backgroundStyle: firstSlide.backgroundStyle,
    } as Slide)

    let previousSlideId = targetSlideId
    const nextInsertedSlideIds: string[] = []

    for (const slide of slides.slice(1)) {
      const insertedSlideId = addSlide(targetSectionId, previousSlideId)
      nextInsertedSlideIds.push(insertedSlideId)
      previousSlideId = insertedSlideId

      updateSlideById(insertedSlideId, {
        slideStatus: SlideStatus.GENERATED,
        durationInFrames: slide.durationInFrames,
        settledFrame: slide.settledFrame,
        content: slide.content,
        backgroundStyle: slide.backgroundStyle,
      } as Slide)
    }

    insertedSlideIdsRef.current = nextInsertedSlideIds
    setSelectedSlideById(targetSlideId)
    setSelectedSuggestionIndex(suggestionIndex)
  }

  useEffect(() => {
    let cancelled = false

    const loadSuggestions = async () => {
      const targetSlideId = targetSlideIdRef.current
      if (!videoId || !targetSlideId) {
        setScenes([])
        setIsLoading(false)
        return
      }

      const cachedScenes = sceneSuggestionsCache.get(targetSlideId)
      if (cachedScenes) {
        setScenes(cachedScenes)
        setSelectedSuggestionIndex(0)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const response = await portalClient.suggestScenes({
          videoId,
          sceneId: targetSlideId,
        })

        if (!cancelled) {
          const suggestionSections = (response.groups ?? []).filter(section => section.slides.length > 0)

          sceneSuggestionsCache.set(targetSlideId, suggestionSections)
          setScenes(suggestionSections)
          setSelectedSuggestionIndex(0)
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
  }, [portalClient, videoId])

  const selectedSuggestion = scenes[selectedSuggestionIndex]

  const handlePreview = () => {
    if (isPreviewPlaying) {
      onPreviewTemplate?.()
      return
    }

    if (!selectedSuggestion) return

    // Preview always reflects the currently highlighted suggestion, even before an explicit apply click.
    applySuggestion(selectedSuggestion, selectedSuggestionIndex)

    const slides = selectedSuggestion.slides
    const firstSlideId = targetSlideIdRef.current
    const previewSlideIds = [firstSlideId, ...insertedSlideIdsRef.current].filter(Boolean)
    const lastSlideId = previewSlideIds.at(-1)

    if (!firstSlideId || !lastSlideId || slides.length === 0) return

    setSelectedSlideById(firstSlideId)

    // Let the player re-read the updated slide list before resolving the preview end slide.
    setTimeout(() => {
      onPreviewTemplate?.(firstSlideId, previewSlideIds.length > 1 ? lastSlideId : undefined)
    }, 0)
  }

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
            {scenes.map((suggestion, index) => {
              const previewSlide = suggestion.slides[0]
              if (!previewSlide) return null

              return (
              <button
                key={`${suggestion.id || previewSlide.id || 'suggested-slide'}-${index}`}
                type='button'
                onClick={() => applySuggestion(suggestion, index)}
                className={`overflow-hidden rounded-lg border bg-muted/20 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                  selectedSuggestionIndex === index ? 'border-primary' : 'border-border hover:border-primary'
                }`}
              >
                <div
                  className='relative overflow-hidden'
                  style={resolution ? { aspectRatio: `${resolution.width} / ${resolution.height}` } : undefined}
                >
                  <SlideThumbnail slide={previewSlide} index={index} resolution={resolution} fps={fps} />
                  {suggestion.slides.length > 1 && (
                    <div className='absolute bottom-0 right-0 inline-flex items-center gap-0.5 bg-background/45 px-1 py-0.5 text-[10px] font-medium text-foreground backdrop-blur-sm'>
                      <Layers3 className='h-3 w-3' />
                      <span>{suggestion.slides.length}</span>
                    </div>
                  )}
                </div>
              </button>
              )
            })}
          </div>
        )}
      </div>

      {onPreviewTemplate && (
        <div className='border-t border-border px-5 py-4 mt-auto'>
          <Button variant='default' size='sm' className='w-full gap-2' onClick={handlePreview} disabled={!selectedSuggestion}>
            {isPreviewPlaying ? <Pause className='w-3.5 h-3.5' /> : <Play className='w-3.5 h-3.5' />}
            {isPreviewPlaying ? 'Stop Preview' : 'Preview'}
          </Button>
        </div>
      )}
    </div>
  )
}

export default ReimagineSettings
