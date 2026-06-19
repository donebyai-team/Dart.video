import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, X } from 'lucide-react'
import { useClientsContext } from '@coasterai/ui-core/context/ClientContext'
import { isPlatformAdmin } from '@coasterai/ui-core/helper/role'
import { useAuth } from '@coasterai/ui-core/hooks/useAuth'
import { PatchOverlay } from '@coasterai/renderer'
import { type ConversationMessage } from '@coasterai/pb/coasterai/core/v1/chat_pb'
import { Section, SlideStatus, type Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useVideoStore } from '@/stores/video'
import { getConnectError } from '@/utils/error'
import { isTemplateVideoId } from '@/utils/constants'
import toast from 'react-hot-toast'
import BrowseTab from './reimagine/BrowseTab'
import ChatTab from './reimagine/ChatTab'
import SuggestionGrid from './reimagine/SuggestionGrid'
import { categories, reimagineTabs, suggestionSources, type ReimagineTab, type SuggestionSource } from './reimagine/constants'
import { resolveSuggestionSourceSlide } from './reimagine/slideSource'
import type { CategoryItem, SuggestionItem } from './reimagine/types'
import { useTemplates } from './reimagine/useTemplates'
import { useTemplateSuggestions } from './reimagine/useTemplateSuggestions'

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
  const { user } = useAuth()
  const updateSlideById = useVideoStore(s => s.updateSlideById)
  const addSlide = useVideoStore(s => s.addSlide)
  const removeSlide = useVideoStore(s => s.removeSlide)
  const getSlideWithBackground = useVideoStore(s => s.getSlideWithBackground)
  const setSelectedSlideById = useVideoStore(s => s.setSelectedSlideById)
  const videoConfig = useVideoStore(s => s.videoConfig)
  const videoId = useVideoStore(s => s.videoConfig?.id)
  const selectedSlide = useVideoStore(s => s.selectedSlide)
  const resolution = useVideoStore(s => s.videoConfig?.metadata?.resolution)
  const fps = useVideoStore(s => s.videoConfig?.metadata?.fps) ?? 30

  const targetSlideIdRef = useRef(selectedSlide?.id ?? '')
  const insertedSlideIdsRef = useRef<string[]>([])
  const [browseTargetSlideId, setBrowseTargetSlideId] = useState(selectedSlide?.id ?? '')
  const [, setBrowseSelectedSlideSnapshot] = useState<Slide | null>(selectedSlide)
  const [browseSourceSlideSnapshot, setBrowseSourceSlideSnapshot] = useState<Slide | null>(() =>
    resolveSuggestionSourceSlide({
      videoConfig,
      selectedSlide,
      getSlideWithBackground,
    })
  )
  const [activeTab, setActiveTab] = useState<ReimagineTab>(() =>
    selectedSlide?.content?.codeRegistry?.mUrl?.trim() ? reimagineTabs.GENERATE : reimagineTabs.BROWSE
  )
  const [selectedDefaultTemplateId, setSelectedDefaultTemplateId] = useState<string | null>(null)
  const [selectedCategoryTemplateId, setSelectedCategoryTemplateId] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null)
  const [activeSuggestionSource, setActiveSuggestionSource] = useState<SuggestionSource>(suggestionSources.DEFAULT)
  const [chatMessages, setChatMessages] = useState<ConversationMessage[]>([])
  const [isChatLoading, setIsChatLoading] = useState(false)

  const emptyCategories = useMemo<string[]>(() => [], [])

  const suggestionSourceSlide = browseSourceSlideSnapshot
  const showTemplatesTab = Boolean(user && isPlatformAdmin(user) && !isTemplateVideoId(videoId))

  const selectedCategoryValues = useMemo(
    () => (selectedCategory ? [selectedCategory.value] : []),
    [selectedCategory]
  )

  const handleSuggestionError = useCallback((error: unknown) => {
    toast.error(getConnectError(error))
  }, [])

  const defaultSuggestionState = useTemplateSuggestions({
    client: portalClient,
    videoId,
    slide: suggestionSourceSlide,
    categories: emptyCategories,
    enabled: activeTab === reimagineTabs.SUGGESTIONS,
    onError: handleSuggestionError,
  })

  const categorySuggestionState = useTemplateSuggestions({
    client: portalClient,
    videoId,
    slide: suggestionSourceSlide,
    categories: selectedCategoryValues,
    enabled: activeTab === reimagineTabs.BROWSE && Boolean(selectedCategory),
    onError: handleSuggestionError,
  })

  const templatesState = useTemplates({
    client: portalClient,
    enabled: showTemplatesTab && activeTab === reimagineTabs.TEMPLATES,
    onError: handleSuggestionError,
  })

  useEffect(() => {
    if (!showTemplatesTab && activeTab === reimagineTabs.TEMPLATES) {
      setActiveTab(reimagineTabs.BROWSE)
    }
  }, [activeTab, showTemplatesTab])

  useEffect(() => {
    if ((selectedSlide?.id ?? '') === browseTargetSlideId) {
      return
    }

    setBrowseTargetSlideId(selectedSlide?.id ?? '')
    setBrowseSelectedSlideSnapshot(selectedSlide)
    setBrowseSourceSlideSnapshot(
      resolveSuggestionSourceSlide({
        videoConfig,
        selectedSlide,
        getSlideWithBackground,
      })
    )
  }, [browseTargetSlideId, getSlideWithBackground, selectedSlide, videoConfig])

  useEffect(() => {
    targetSlideIdRef.current = browseTargetSlideId || suggestionSourceSlide?.id || ''
  }, [browseTargetSlideId, suggestionSourceSlide?.id])

  useEffect(() => {
    setSelectedDefaultTemplateId(null)
    setSelectedCategoryTemplateId(null)
    setSelectedTemplateId(null)
  }, [browseTargetSlideId, suggestionSourceSlide?.id])

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

  const applySuggestion = useCallback((suggestion: Section, templateId: string, source: SuggestionSource) => {
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
      tid: firstSlide.tid,
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
        tid: slide.tid,
        backgroundStyle: slide.backgroundStyle,
      } as Slide)
    }

    insertedSlideIdsRef.current = nextInsertedSlideIds
    setSelectedSlideById(targetSlideId)
    setActiveSuggestionSource(source)

    if (source === suggestionSources.CATEGORY) {
      setSelectedCategoryTemplateId(templateId)
      return
    }

    if (source === suggestionSources.TEMPLATE) {
      setSelectedTemplateId(templateId)
      return
    }

    setSelectedDefaultTemplateId(templateId)
  }, [addSlide, removeSlide, setOverlay, setSelectedSlideById, targetSectionId, updateSlideById, videoConfig])

  const handleSelectCategory = useCallback((category: CategoryItem) => {
    setSelectedCategory(category)
    setActiveSuggestionSource(suggestionSources.CATEGORY)
    setSelectedCategoryTemplateId(null)
  }, [])

  const handleSelectDefaultSuggestion = useCallback((suggestion: SuggestionItem) => {
    if (!suggestion.suggestion) return
    applySuggestion(suggestion.suggestion, suggestion.templateId, suggestionSources.DEFAULT)
  }, [applySuggestion])

  const handleSelectCategorySuggestion = useCallback((suggestion: SuggestionItem) => {
    if (!suggestion.suggestion) return
    applySuggestion(suggestion.suggestion, suggestion.templateId, suggestionSources.CATEGORY)
  }, [applySuggestion])

  const handleSelectTemplate = useCallback((suggestion: SuggestionItem) => {
    if (!suggestion.suggestion) return
    applySuggestion(suggestion.suggestion, suggestion.templateId, suggestionSources.TEMPLATE)
  }, [applySuggestion])

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

      setChatMessages(response.messages)
    } catch (err: any) {
      setChatMessages([])
      toast.error(getConnectError(err))
    } finally {
      setIsChatLoading(false)
    }
  }, [portalClient, videoId])

  useEffect(() => {
    if (activeTab !== reimagineTabs.GENERATE) return
    void loadConversationHistory()
  }, [activeTab, loadConversationHistory])

  const selectedSuggestionItem =
    activeSuggestionSource === suggestionSources.CATEGORY && selectedCategory
      ? categorySuggestionState.suggestions.find(suggestion => suggestion.templateId === selectedCategoryTemplateId) ?? null
      : activeSuggestionSource === suggestionSources.TEMPLATE
        ? templatesState.suggestions.find(suggestion => suggestion.templateId === selectedTemplateId) ?? null
      : defaultSuggestionState.suggestions.find(suggestion => suggestion.templateId === selectedDefaultTemplateId) ?? null

  const selectedSuggestion = selectedSuggestionItem?.suggestion ?? null

  const canPreviewCurrentTab = isPreviewPlaying
    || (activeTab === reimagineTabs.GENERATE
      ? Boolean(targetSlideIdRef.current)
      : Boolean(selectedSuggestion))

  const handlePreview = useCallback(() => {
    if (isPreviewPlaying) {
      onPreviewTemplate?.()
      return
    }

    if (activeTab === reimagineTabs.GENERATE) {
      const targetSlideId = targetSlideIdRef.current
      if (!targetSlideId) return

      setSelectedSlideById(targetSlideId)
      onPreviewTemplate?.(targetSlideId)
      return
    }

    if (!selectedSuggestion) return

    const chosenTemplateId =
      activeSuggestionSource === suggestionSources.CATEGORY
        ? selectedCategoryTemplateId
        : activeSuggestionSource === suggestionSources.TEMPLATE
          ? selectedTemplateId
          : selectedDefaultTemplateId

    if (!chosenTemplateId) return

    const slides = selectedSuggestion.slides
    const firstSlideId = browseTargetSlideId || targetSlideIdRef.current
    const previewSlideIds = [firstSlideId, ...insertedSlideIdsRef.current].filter(Boolean)
    const lastSlideId = slides.length > 1 ? previewSlideIds.at(-1) : undefined

    if (!firstSlideId || slides.length === 0) return

    setSelectedSlideById(firstSlideId)

    // Let the player re-read the updated slide list before resolving the preview end slide.
    setTimeout(() => {
      onPreviewTemplate?.(firstSlideId, lastSlideId)
    }, 0)
  }, [activeSuggestionSource, activeTab, browseTargetSlideId, insertedSlideIdsRef, isPreviewPlaying, onPreviewTemplate, selectedCategoryTemplateId, selectedDefaultTemplateId, selectedSuggestion, selectedTemplateId, setSelectedSlideById])

  return (
    <div className='h-full flex flex-col bg-card'>
      <div className='flex items-center justify-between px-5 border-b border-border'>
        <h3 className='font-semibold text-sm tracking-tight'>Reimagine</h3>
        <Button variant='ghost' size='icon' onClick={onClose}>
          <X className='w-4 h-4' />
        </Button>
      </div>

      <div className='flex-1 overflow-y-auto px-3 py-2 pb-36'>
        <Tabs value={activeTab} onValueChange={value => setActiveTab(value as typeof activeTab)} className='h-full'>
          <TabsList className={`grid w-full ${showTemplatesTab ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value={reimagineTabs.SUGGESTIONS}>Suggestions</TabsTrigger>
            {showTemplatesTab && <TabsTrigger value={reimagineTabs.TEMPLATES}>Templates</TabsTrigger>}
            <TabsTrigger value={reimagineTabs.GENERATE}>Generate New</TabsTrigger>
          </TabsList>

          <TabsContent value={reimagineTabs.SUGGESTIONS} className='mt-4'>
            {activeTab === reimagineTabs.SUGGESTIONS && (
              <BrowseTab
                aiSuggestions={defaultSuggestionState.suggestions}
                aiSelectedTemplateId={selectedDefaultTemplateId}
                isAiLoading={defaultSuggestionState.isLoading}
                isAiLoadingMore={defaultSuggestionState.isLoadingMore}
                hasAiMore={defaultSuggestionState.hasMore}
                onLoadMoreAiSuggestions={() => void defaultSuggestionState.loadMore()}
                onSelectAiSuggestion={handleSelectDefaultSuggestion}
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={handleSelectCategory}
                onGenerateNew={() => setActiveTab(reimagineTabs.GENERATE)}
                categorySuggestions={categorySuggestionState.suggestions}
                categorySelectedTemplateId={selectedCategoryTemplateId}
                isCategoryLoading={categorySuggestionState.isLoading}
                isCategoryLoadingMore={categorySuggestionState.isLoadingMore}
                hasCategoryMore={categorySuggestionState.hasMore}
                onLoadMoreCategorySuggestions={() => void categorySuggestionState.loadMore()}
                onSelectCategorySuggestion={handleSelectCategorySuggestion}
                resolution={resolution}
                fps={fps}
              />
            )}
          </TabsContent>

          <TabsContent value={reimagineTabs.TEMPLATES} className='mt-4'>
            {showTemplatesTab && activeTab === reimagineTabs.TEMPLATES && (
              <SuggestionGrid
                suggestions={templatesState.suggestions}
                selectedTemplateId={selectedTemplateId}
                onSelect={handleSelectTemplate}
                resolution={resolution}
                fps={fps}
                isLoading={templatesState.isLoading}
                emptyMessage='No templates available.'
              />
            )}
          </TabsContent>

          <TabsContent value={reimagineTabs.GENERATE} className='mt-4'>
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
            disabled={!canPreviewCurrentTab}
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
