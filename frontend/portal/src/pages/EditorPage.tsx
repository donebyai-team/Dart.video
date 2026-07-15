"use client";

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Timer, Brain, Check, X, ExternalLink, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ResolutionSelector from '@/components/editor/toolbar/ResolutionSelector'
import EditorSidebarTabs from '@/components/editor/EditorSidebarTabs'
import ToolsSettingsPanel from '@/components/editor/ToolsSettingsPanel'
import RemotionPlayer, { RemotionPlayerHandle } from '@/components/editor/canvas/RemotionPlayer'
import { type EditorConfig } from '@/types/editor'
import { defaultEditorConfig } from '@/data/editorConfig'
import { Sheet, SheetTrigger } from '@/components/ui/sheet'
import { useVideoStore } from '@/stores/video'
import { VideoStatus } from '@coasterai/pb/coasterai/core/v1/video_pb'
import toast from 'react-hot-toast'
import { getConnectError } from '@/utils/error';
import { ActiveToolType } from '@/types/tools';
import { createSlideEntityId, createOverlayEntityId } from '@/types/selection';
import Link from 'next/link';
import BackgroundMusicSelector from '@/components/editor/toolbar/BackgroundMusicSelector';
import CreditUsage from '@/components/editor/toolbar/CreditUsage';
import { useClientsContext } from '@coasterai/ui-core/context/ClientContext';
import { pollVideoRender } from '@/services/utils';
import VideoGenerationProgress from '@/components/editor/VideoGenerationProgress';
import { convertFramesToSeconds } from '@coasterai/renderer/src/frameUtils';
import { useAnimationEdit } from '@/components/editor/animation/useAnimationEdit';
import SaveTemplate from '@/components/editor/SaveTemplate';
import { isTemplateVideoId } from '@/utils/constants'

interface EditorPageProps {
  videoId: string
  config?: EditorConfig
}

type ExportProgressState = {
  status: 'submitting' | 'processing' | 'downloading'
  hasPhase: boolean
  percent?: number
  etaSeconds?: number
}

const EditorPage = ({ videoId, config = defaultEditorConfig }: EditorPageProps) => {
  const { portalClient } = useClientsContext()
  const playerRef = useRef<RemotionPlayerHandle>(null)
  const decodedVideoId = decodeURIComponent(videoId)

  // State for loading video data
  const [isLoadingVideo, setIsLoadingVideo] = useState(true)
  const [isExportingVideo, setIsExportingVideo] = useState(false)
  const [isPlayerPlaying, setIsPlayerPlaying] = useState(false)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgressState | null>(null)
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false)
  const prepareProgressRef = useRef(0)

  // ---- Values (reactive) ----
  const initialize = useVideoStore(s => s.initialize)
  const reset = useVideoStore(s => s.reset)
  const isInitialized = useVideoStore(s => s.isInitialized)

  // Streaming state
  const startVideoStream = useVideoStore(s => s.startVideoStream)
  const stopVideoStream = useVideoStore(s => s.stopVideoStream)
  const isStreamingVideo = useVideoStore(s => s.isStreamingVideo)
  const streamingThinkingSummary = useVideoStore(s => s.streamingThinkingSummary)
  const streamingTotalSlides = useVideoStore(s => s.streamingTotalSlides)

  // Video data from store (this is the single source of truth)
  const videoConfigFromStore = useVideoStore(s => s.videoConfig);
  const hasPendingChanges = useVideoStore(s => s.hasPendingChanges)
  const isSyncing = useVideoStore(s => s.isSyncing)
  const undoCount = useVideoStore(s => s.undoStack.length)
  const selectedSlide = useVideoStore(s => s.selectedSlide)

  const activeTool = useVideoStore(s => s.activeTool)
  const selectedEffectId = useVideoStore(s => s.selectedEffectId)
  const editingSectionId = useVideoStore(s => s.editingSectionId)
  const editingSectionTitle = useVideoStore(s => s.editingSectionTitle)

  // ---- Setters / Actions (stable functions) ----
  const setEditingSectionId = useVideoStore(s => s.setEditingSectionId)
  const setEditingSectionTitle = useVideoStore(s => s.setEditingSectionTitle)

  // ---- Handlers / Actions ----
  const updateSectionTitle = useVideoStore(s => s.updateSectionTitle)
  const handleCloseTool = useVideoStore(s => s.handleCloseTool)
  const acceptVideoConfigChanges = useVideoStore(s => s.acceptVideoConfigChanges)
  const discardVideoConfigChanges = useVideoStore(s => s.discardVideoConfigChanges)
  const undoVideoConfigChanges = useVideoStore(s => s.undoVideoConfigChanges)
  const updateSpotlight = useVideoStore(s => s.updateSpotlight)
  const updateCallout = useVideoStore(s => s.updateCallout)
  const updateZoom = useVideoStore(s => s.updateZoom)
  const deleteSpotlight = useVideoStore(s => s.deleteSpotlight)
  const deleteCallout = useVideoStore(s => s.deleteCallout)
  const deleteZoom = useVideoStore(s => s.deleteZoom)
  const updateSlide = useVideoStore(s => s.updateSlide)
  const handleSelectEntity = useVideoStore(s => s.handleSelectEntity)
  const openEntitySettings = useVideoStore(s => s.openEntitySettings)
  const fps = useVideoStore(s => s.getFPS)
  const animationEdit = useAnimationEdit()

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const downloadBlob = (blob: Blob, fileName: string) => {
    const fileUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(fileUrl)
  }

  const isProcessingVideo = videoConfigFromStore?.status === VideoStatus.PROCESSING
  const isTemplateVideo = isTemplateVideoId(videoId)

  const handleExportVideo = async () => {
    if (!portalClient || !videoConfigFromStore) return

    try {
      setIsExportingVideo(true)
      prepareProgressRef.current = 2
      setExportProgress({ status: 'submitting', hasPhase: false, percent: prepareProgressRef.current })
      const renderVersion = Number(videoConfigFromStore.version)

      const renderResponse = await portalClient.renderVideo({ videoId })
      while (true) {
        if (prepareProgressRef.current < 22) {
          // Optimistic progress while waiting for first meaningful polling response.
          prepareProgressRef.current = Math.min(22, prepareProgressRef.current + 1.8)
          setExportProgress(prev =>
            prev && !prev.hasPhase
              ? { ...prev, percent: prepareProgressRef.current }
              : prev
          )
        }

        const renderStatus = await pollVideoRender(renderResponse.jobId,
          renderResponse.videoId, renderVersion)

        if (renderStatus.type === 'file') {
          setExportProgress({ status: 'downloading', hasPhase: true, percent: 100 })
          downloadBlob(renderStatus.blob, renderStatus.fileName)
          break
        }

        const { render_phase, render_current, render_total, render_percent, render_eta_seconds } = renderStatus.data
        const hasPhase = Boolean(render_phase)
        const rawPercent =
          render_percent !== undefined
            ? Math.max(0, Math.min(100, render_percent))
            : (render_current !== undefined && render_total !== undefined && render_total > 0
              ? Math.max(0, Math.min(100, (render_current / render_total) * 100))
              : 0)

        // Blend render + encode into one continuous timeline to avoid a visible reset at 100%.
        const phase = String(render_phase || '').toLowerCase()
        const seamlessPercent =
          !hasPhase ? 0
            : phase.includes('render') ? rawPercent * 0.85
              : phase.includes('encod') ? 85 + rawPercent * 0.15
                : rawPercent
        const adjustedPercent = hasPhase ? Math.max(seamlessPercent, prepareProgressRef.current) : prepareProgressRef.current

        setExportProgress({
          status: 'processing',
          hasPhase,
          percent: adjustedPercent,
          etaSeconds: render_eta_seconds
        })

        await wait(2000)
      }
    } catch (error) {
      console.error('Video export failed', error)
      toast.error(getConnectError(error))
    } finally {
      setIsExportingVideo(false)
      setExportProgress(null)
    }
  }

  // Start video streaming
  useEffect(() => {
    const initializeStreaming = async () => {
      try {
        console.log('Starting video stream for videoId:', videoId)

        // Start streaming immediately - the store will handle all updates.
        // startVideoStream returns null (no throw) when stopped intentionally,
        // so this .catch only fires on genuine errors.
        startVideoStream(videoId).catch(error => {
          console.error('Stream failed:', error);
          toast.error(getConnectError(error));
        });

        // Show editor immediately with sample config, real data will come from stream
        setIsLoadingVideo(false)
      } catch (error) {
        console.error('Failed to start video stream:', error)
        setIsLoadingVideo(false)
      }
    }

    initializeStreaming()
  }, [videoId, startVideoStream])

  useEffect(() => {
    if (isLoadingVideo || !videoConfigFromStore || isInitialized) return;

    console.log("Initializing editor once", "name: ", videoConfigFromStore.name, videoConfigFromStore.id);

    initialize(config, videoConfigFromStore);

  }, [
    isLoadingVideo,
    videoConfigFromStore,
    isInitialized,
    config,
    initialize
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTypingTarget = Boolean(
        target &&
        (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable
        )
      )

      if (isTypingTarget) {
        return
      }

      if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.key.toLowerCase() !== 'z') {
        return
      }

      if (isProcessingVideo || isSyncing || hasPendingChanges || undoCount === 0) {
        return
      }

      event.preventDefault()
      void undoVideoConfigChanges()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasPendingChanges, isProcessingVideo, isSyncing, undoCount, undoVideoConfigChanges])

  // Clean up store when leaving the editor
  useEffect(() => {
    return () => {
      stopVideoStream()
      reset()
    }
  }, [stopVideoStream, reset])

  // A bounded preview can target one slide or a contiguous slide range.
  const handleTogglePreviewSlide = (slideId?: string, endSlideId?: string) => {
    if (!slideId) return

    const currentlyPlaying = playerRef.current?.isPlaying() ?? false

    if (currentlyPlaying && isPreviewPlaying) {
      playerRef.current?.pause()
      return
    }

    playerRef.current?.playSlidePreview(slideId, endSlideId)
  }

  // Centralized fullscreen handler
  const handleFullscreenChange = (isFullscreen: boolean) => {
    if (isFullscreen) {
      // Auto-play when entering fullscreen
      setTimeout(() => {
        playerRef.current?.play()
      }, 150)
    }
  }

  // Early return if not initialized yet OR if streaming but no sections received yet
  if (!isInitialized || (isStreamingVideo && videoConfigFromStore?.config?.sections.length === 0)) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='h-screen flex flex-col bg-muted/30 relative'>
      <SaveTemplate
        open={isSaveTemplateOpen}
        onOpenChange={setIsSaveTemplateOpen}
        videoId={decodedVideoId}
      />

      {/* Video Generation Progress — floating overlay while the agent generates slides */}
      {isStreamingVideo && (
        <VideoGenerationProgress
          receivedSlides={videoConfigFromStore?.config?.sections.reduce((acc, s) => acc + s.slides.length, 0) ?? 0}
          totalSlides={streamingTotalSlides}
          thinkingSummary={streamingThinkingSummary}
          onStop={stopVideoStream}
        />
      )}

      {/* Export Progress Overlay */}
      {isExportingVideo && exportProgress && (
        <div className='absolute top-16 right-4 z-50 w-80 rounded-xl border border-border bg-card/95 backdrop-blur-sm shadow-xl p-4'>
          <div className='flex items-start justify-between mb-3'>
            <div>
              <p className='text-sm font-semibold'>Exporting Video</p>
              <p className='text-xs text-muted-foreground capitalize'>
                {exportProgress.status === 'submitting' || !exportProgress.hasPhase
                  ? 'Preparing'
                  : exportProgress.status === 'downloading'
                    ? 'Preparing download'
                    : 'Processing'}
              </p>
            </div>
            <span className='text-xs font-medium text-muted-foreground'>
              {(exportProgress.percent ?? 0).toFixed(1)}%
            </span>
          </div>

          <div className='h-2 w-full rounded-full bg-muted overflow-hidden'>
            <div
              className='h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300 ease-out'
              style={{ width: `${exportProgress.percent ?? 0}%` }}
            />
          </div>

          <div className='mt-3 flex items-center justify-between text-xs text-muted-foreground'>
            <span>{exportProgress.hasPhase ? 'Working...' : 'Preparing assets...'}</span>
            <span>
              {exportProgress.hasPhase && exportProgress.etaSeconds !== undefined && exportProgress.etaSeconds > 0
                ? `ETA ${exportProgress.etaSeconds}s`
                : exportProgress.status === 'downloading'
                  ? 'Finalizing'
                  : ''}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className='h-14 bg-card border-b border-border flex items-center justify-between px-4 flex-shrink-0'>
        <div className='flex items-center gap-4'>
          <Sheet>
            <SheetTrigger asChild>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Home className="w-5 h-5" />
              </Link>
            </SheetTrigger>
          </Sheet>

          <div className='h-6 w-px bg-border' />
          <div className='flex items-center gap-3'>
            <span className='font-semibold'>{videoConfigFromStore?.name || 'Untitled Video'}</span>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          {/* Pending changes */}
          {hasPendingChanges && !isProcessingVideo && !isSyncing && (
            <>
              <Button
                variant='ghost'
                size='icon'
                onClick={discardVideoConfigChanges}
                className='h-8 w-8'
                aria-label='Discard changes'
              >
                <X className='w-4 h-4' />
              </Button>
              <Button
                size='sm'
                onClick={() => void acceptVideoConfigChanges()}
                className='h-8 gap-1 rounded-md px-2 py-1 text-sm'
              >
                <Check className='w-4 h-4' />
                Accept changes
              </Button>
            </>
          )}

          {isSyncing && !isProcessingVideo && (
            <div className='px-2 py-1 text-sm text-muted-foreground'>
              Syncing...
            </div>
          )}

          {/* Thinking Summary */}
          {videoConfigFromStore?.metadata?.thinkingSummary && (
            <div className="relative group inline-flex">

              <div className="flex cursor-pointer items-center gap-1 rounded-md border bg-muted px-2 py-1 text-sm font-medium text-muted-foreground">
                <Brain className="w-4 h-4" />
                Thoughts
              </div>

              <div className="absolute left-0 top-8 z-50 hidden w-max max-w-sm rounded-md border bg-popover p-3 text-xs shadow-lg group-hover:block">
                <div className="max-h-64 overflow-auto whitespace-pre-wrap">
                  {videoConfigFromStore.metadata.thinkingSummary}
                </div>
              </div>

            </div>
          )}        
          {/* Duration Badge (Non-clickable) */}
          <div className="flex items-center gap-1 px-2 py-1 text-sm font-medium rounded-md border bg-muted text-muted-foreground">
            <Timer className='w-4 h-4' />
            {/* To fixed is used here to show only 2 decimal point to user for UX */}
            {convertFramesToSeconds(videoConfigFromStore?.metadata?.durationInFrames!, fps()).toFixed(2)}s            
          </div>
          <CreditUsage videoId={decodedVideoId} />
          {/* <ResolutionSelector /> */}
          <BackgroundMusicSelector />
          {isTemplateVideo && (
            <Button
              variant='outline'
              className='gap-2'
              disabled={isStreamingVideo || isSyncing || hasPendingChanges}
              onClick={() => setIsSaveTemplateOpen(true)}
            >
              <Save className='w-4 h-4' />
              Save Template
            </Button>
          )}
          <Button
            className='btn-accent-gradient gap-2'
            disabled={isStreamingVideo ||
              isExportingVideo ||
              hasPendingChanges ||
              videoConfigFromStore?.config?.sections.length == 0 ||
              videoConfigFromStore?.config?.sections[0].slides.length == 0
            }
            onClick={handleExportVideo}
          >
            <ExternalLink className='w-4 h-4' />
            Export
          </Button>
        </div>
      </header>

      {/* Main Editor Area */}
      <div className='flex-1 flex overflow-hidden'>
        {/* Left Sidebar - Storyboard Timeline OR Settings Panel */}
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className='w-96 bg-card border-r border-border flex flex-col'
        >
          <AnimatePresence mode='wait'>
            {activeTool.type != ActiveToolType.NONE && selectedSlide ? (
              <ToolsSettingsPanel
                deleteSpotlight={deleteSpotlight}
                deleteCallout={deleteCallout}
                deleteZoom={deleteZoom}
                overlay={animationEdit.overlay}
                onValuePatch={animationEdit.applyValuePatch}
                setOverlay={animationEdit.setOverlay}
                isPreviewPlaying={isPreviewPlaying}
                onPreviewTemplate={(slideId, endSlideId) => handleTogglePreviewSlide(slideId ?? selectedSlide.id, endSlideId)}
                onUpdateSpotlight={updates => {
                  if (selectedEffectId) {
                    updateSpotlight(selectedEffectId, updates)
                  }
                }}
                onUpdateCallout={updates => {
                  if (selectedEffectId) {
                    updateCallout(selectedEffectId, updates)
                  }
                }}
                onUpdateZoom={updates => {
                  if (selectedEffectId) {
                    updateZoom(selectedEffectId, updates)
                  }
                }}
                onSpotlightApply={() => {
                  // Apply spotlight - just close the panel
                  handleCloseTool()
                }}
                onSpotlightPlay={() => handleTogglePreviewSlide(selectedSlide.id)}
              />
            ) : (
              <EditorSidebarTabs
                isStreamingVideo={isStreamingVideo}
                onSelectSlide={(_section, slide) => {
                  handleSelectEntity(createSlideEntityId(slide.id))
                }}
                onStartEditTitle={(id, title) => {
                  setEditingSectionId(id)
                  setEditingSectionTitle(title)
                }}
                onSaveTitle={() => {
                  if (editingSectionId) {
                    updateSectionTitle(editingSectionId, editingSectionTitle)
                  }
                }}
                onPlayVoiceoverPreview={slideId => handleTogglePreviewSlide(slideId)}
              />
            )}
          </AnimatePresence>
        </motion.aside>

        {/* Right - Full Preview with Remotion Player and optional props panel */}
        <div className='flex-1 flex overflow-hidden'>
          {/* Main player area */}
          <div className='flex-1 flex flex-col min-w-0'>
            <RemotionPlayer
              ref={playerRef}
              onSlideChange={slideId => {
                if (isPreviewPlaying) return
                // Use unified selection handler
                handleSelectEntity(createSlideEntityId(slideId))
              }}
              onFullscreenChange={handleFullscreenChange}
              onPlaybackStateChange={setIsPlayerPlaying}
              onPreviewPlaybackChange={setIsPreviewPlaying}
              onSelectOverlayFromTimeline={(overlayId, slideId) => {
                // Use unified selection handler
                handleSelectEntity(createOverlayEntityId(slideId, overlayId))
              }}
              // Duration change handler — newDuration is in seconds, store as frames
              onDurationChange={(_slideId, newDurationInSeconds) => {
                updateSlide({ durationInFrames: Math.round(newDurationInSeconds * fps()) })
              }}
              animationEdit={animationEdit}
              onSelectTemplate={slideId => {
                console.debug('selected templated slide: ', slideId)
                const entityId = createSlideEntityId(slideId)
                handleSelectEntity(entityId)
                // Open template settings when clicking on template
                openEntitySettings(entityId)
              }}
            />
          </div>

          {/* Template props are now shown in the left storyboard/settings panel for consistency */}
        </div>
      </div>

      {/* Modals */}
      {/* <ScreenshotLibrary /> */}
    </div>
  )
}
export default EditorPage
