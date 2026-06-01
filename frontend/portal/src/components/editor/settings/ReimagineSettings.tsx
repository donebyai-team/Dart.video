import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, X } from 'lucide-react'
import { useClientsContext } from '@coasterai/ui-core/context/ClientContext'
import { PatchOverlay } from '@coasterai/renderer'
import { ConversationRole, type ConversationMessage } from '@coasterai/pb/coasterai/core/v1/chat_pb'
import { Section, SlideStatus, type Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { AnimationCategory } from '@coasterai/pb/coasterai/core/v1/template_pb'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useVideoStore } from '@/stores/video'
import { getConnectError } from '@/utils/error'
import toast from 'react-hot-toast'
import BrowseTab from './reimagine/BrowseTab'
import ChatTab from './reimagine/ChatTab'
import { categories } from './reimagine/constants'
import type { CategoryItem } from './reimagine/types'

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
  const [activeTab, setActiveTab] = useState<'browse' | 'generate'>('browse')
  const [defaultScenes, setDefaultScenes] = useState<Section[]>([])
  const [categoryScenes, setCategoryScenes] = useState<Section[]>([])
  const [selectedDefaultSuggestionIndex, setSelectedDefaultSuggestionIndex] = useState(0)
  const [selectedCategorySuggestionIndex, setSelectedCategorySuggestionIndex] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null)
  const [activeSuggestionSource, setActiveSuggestionSource] = useState<'default' | 'category'>('default')
  const [isDefaultLoading, setIsDefaultLoading] = useState(true)
  const [isCategoryLoading, setIsCategoryLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<ConversationMessage[]>([])
  const [isChatLoading, setIsChatLoading] = useState(false)

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

  const applySuggestion = useCallback((suggestion: Section, suggestionIndex: number, source: 'default' | 'category') => {
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
    setActiveSuggestionSource(source)

    if (source === 'category') {
      setSelectedCategorySuggestionIndex(suggestionIndex)
      return
    }

    setSelectedDefaultSuggestionIndex(suggestionIndex)
  }, [addSlide, removeSlide, setOverlay, setSelectedSlideById, targetSectionId, updateSlideById, videoConfig])

  const loadSuggestions = useCallback(async (category: AnimationCategory, options?: { silent?: boolean }) => {
    const targetSlideId = targetSlideIdRef.current
    const cacheKey = `${targetSlideId}:${category}`
    const isCategoryRequest = category !== AnimationCategory.UNSPECIFIED

    const setLoadingState = isCategoryRequest ? setIsCategoryLoading : setIsDefaultLoading
    const setScenesState = isCategoryRequest ? setCategoryScenes : setDefaultScenes

    if (!videoId || !targetSlideId) {
      setScenesState([])
      setLoadingState(false)
      return
    }

    const cachedScenes = sceneSuggestionsCache.get(cacheKey)
    if (cachedScenes) {
      setScenesState(cachedScenes)
      setLoadingState(false)
      return
    }

    if (!options?.silent) {
      setLoadingState(true)
    }

    try {
      const response = await portalClient.suggestScenes({
        videoId,
        sceneId: targetSlideId,
        category,
      })

      const suggestionSections = (response.groups ?? []).filter(section => section.slides.length > 0)

      sceneSuggestionsCache.set(cacheKey, suggestionSections)
      setScenesState(suggestionSections)
    } catch (err: any) {
      setScenesState([])
      toast.error(getConnectError(err))
    } finally {
      setLoadingState(false)
    }
  }, [portalClient, videoId])

  useEffect(() => {
    let cancelled = false

    const loadDefaultSuggestions = async () => {
      setIsDefaultLoading(true)

      await loadSuggestions(AnimationCategory.UNSPECIFIED)

      if (!cancelled) {
        setSelectedDefaultSuggestionIndex(0)
      }
    }

    void loadDefaultSuggestions()

    return () => {
      cancelled = true
    }
  }, [loadSuggestions])

  const handleSelectCategory = useCallback((category: CategoryItem) => {
    setSelectedCategory(category)
    setActiveSuggestionSource('category')
    setSelectedCategorySuggestionIndex(0)
    void loadSuggestions(category.value)
  }, [loadSuggestions])

  const loadConversationHistory = useCallback(async () => {
    const slideId = targetSlideIdRef.current
    if (!videoId || !slideId) {
      setChatMessages([])
      setIsChatLoading(false)
      return
    }

    try {
      setIsChatLoading(true)
      const response = await portalClient.getConversationHistory({
        videoId,
        slideId,
      })

      setChatMessages(
        (response.messages ?? []).filter(message =>
          message.role === ConversationRole.USER || message.role === ConversationRole.ASSISTANT
        )
      )
    } catch (err: any) {
      setChatMessages([])
      toast.error(getConnectError(err))
    } finally {
      setIsChatLoading(false)
    }
  }, [portalClient, videoId])

  useEffect(() => {
    if (activeTab !== 'generate') return
    void loadConversationHistory()
  }, [activeTab, loadConversationHistory])

  const selectedSuggestion =
    activeSuggestionSource === 'category' && selectedCategory
      ? categoryScenes[selectedCategorySuggestionIndex] ?? defaultScenes[selectedDefaultSuggestionIndex]
      : defaultScenes[selectedDefaultSuggestionIndex]

  const handlePreview = () => {
    if (isPreviewPlaying) {
      onPreviewTemplate?.()
      return
    }

    if (!selectedSuggestion) return

    // Preview always reflects the currently highlighted suggestion, even before an explicit apply click.
    applySuggestion(
      selectedSuggestion,
      activeSuggestionSource === 'category' ? selectedCategorySuggestionIndex : selectedDefaultSuggestionIndex,
      activeSuggestionSource
    )

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
        <h3 className='font-semibold text-sm tracking-tight'>Reimagine</h3>
        <Button variant='ghost' size='icon' onClick={onClose}>
          <X className='w-4 h-4' />
        </Button>
      </div>

      <div className='flex-1 overflow-y-auto px-3 py-2 pb-36'>
        <Tabs value={activeTab} onValueChange={value => setActiveTab(value as 'browse' | 'generate')} className='h-full'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='browse'>Browse</TabsTrigger>
            <TabsTrigger value='generate'>Generate New</TabsTrigger>
          </TabsList>

          <TabsContent value='browse' className='mt-4'>
            <BrowseTab
              aiSuggestions={defaultScenes}
              aiSelectedIndex={selectedDefaultSuggestionIndex}
              isAiLoading={isDefaultLoading}
              onSelectAiSuggestion={(suggestion, index) => applySuggestion(suggestion, index, 'default')}
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={handleSelectCategory}
              onGenerateNew={() => setActiveTab('generate')}
              categorySuggestions={categoryScenes}
              categorySelectedIndex={selectedCategorySuggestionIndex}
              isCategoryLoading={isCategoryLoading}
              onSelectCategorySuggestion={(suggestion, index) => applySuggestion(suggestion, index, 'category')}
              resolution={resolution}
              fps={fps}
            />
          </TabsContent>

          <TabsContent value='generate' className='mt-4'>
            <ChatTab
              messages={chatMessages}
              isLoading={isChatLoading}
              setOverlay={setOverlay}
              onConversationUpdated={() => void loadConversationHistory()}
            />
          </TabsContent>
        </Tabs>
      </div>

      {onPreviewTemplate && (
        <div className='border-t border-border px-5 py-2 mt-2'>
          <Button
            variant='default'
            size='sm'
            className='w-full gap-2 h-8 text-sm'
            onClick={handlePreview}
            disabled={!selectedSuggestion}
          >
            {isPreviewPlaying ? (
              <Pause className='w-3.5 h-3.5' />
            ) : (
              <Play className='w-3.5 h-3.5' />
            )}
            {isPreviewPlaying ? 'Stop Preview' : 'Preview'}
          </Button>
        </div>
      )}
    </div>
  )
}

export default ReimagineSettings
