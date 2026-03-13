"use client";

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Mic2, Eye, Volume2, RefreshCw, Video, Home, Settings, HelpCircle, Timer, Music2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import ResolutionSelector from '@/components/editor/remotion/components/ResolutionSelector'
import StoryboardPanel from '@/components/editor/StoryboardPanel'
import ToolsSettingsPanel from '@/components/editor/ToolsSettingsPanel'
import RemotionPlayer, { RemotionPlayerHandle } from '@/components/editor/canvas/RemotionPlayer'
import { type EditorConfig } from '@/types/editor'
import { defaultEditorConfig } from '@/data/editorConfig'
import { Sheet, SheetTrigger } from '@/components/ui/sheet'
import { useVideoStore } from '@/stores/video'
import { Video as VideoConfig } from '@coasterai/pb/coasterai/core/v1/video_pb'
import toast from 'react-hot-toast'
import { getConnectError } from '@/utils/error';
import { ActiveToolType } from '@/types/tools';
import { createSlideEntityId, createOverlayEntityId } from '@/types/selection';
import Link from 'next/link';
import BackgroundMusicSelector from '@/components/editor/remotion/components/BackgroundMusicSelector';
import { useClientsContext } from '@coasterai/ui-core/context/ClientContext';
import { pollVideoRender } from '@/services/utils';
import VideoGenerationProgress from '@/components/editor/VideoGenerationProgress';

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
  const router = useRouter()
  const { portalClient } = useClientsContext()
  const playerRef = useRef<RemotionPlayerHandle>(null)
  const initializationRef = useRef<{ config?: EditorConfig; videoConfig?: VideoConfig }>({})

  // State for loading video data
  const [isLoadingVideo, setIsLoadingVideo] = useState(true)
  const [isExportingVideo, setIsExportingVideo] = useState(false)
  const [isPlayerPlaying, setIsPlayerPlaying] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgressState | null>(null)
  const prepareProgressRef = useRef(0)

  // ---- Values (reactive) ----
  const initialize = useVideoStore(s => s.initialize)
  const isInitialized = useVideoStore(s => s.isInitialized)

  // Streaming state
  const startVideoStream = useVideoStore(s => s.startVideoStream)
  const stopVideoStream = useVideoStore(s => s.stopVideoStream)
  const isStreamingVideo = useVideoStore(s => s.isStreamingVideo)
  const streamingThinkingSummary = useVideoStore(s => s.streamingThinkingSummary)
  const streamingTotalSlides = useVideoStore(s => s.streamingTotalSlides)

  // Video data from store (this is the single source of truth)
  const videoConfigFromStore = useVideoStore(s => s.videoConfig);
  const selectedSlide = useVideoStore(s => s.selectedSlide)

  const setShowVoiceover = useVideoStore(s => s.setShowVoiceover)

  const activeTool = useVideoStore(s => s.activeTool)
  const selectedEffectId = useVideoStore(s => s.selectedEffectId)
  const editingSectionId = useVideoStore(s => s.editingSectionId)
  const editingSectionTitle = useVideoStore(s => s.editingSectionTitle)
  const generatingSlideVoiceover = useVideoStore(s => s.generatingSlideVoiceover)

  // ---- Setters / Actions (stable functions) ----
  const setEditingSectionId = useVideoStore(s => s.setEditingSectionId)
  const setEditingSectionTitle = useVideoStore(s => s.setEditingSectionTitle)

  // ---- Handlers / Actions ----
  const updateSectionTitle = useVideoStore(s => s.updateSectionTitle)
  const updateSlideTranscript = useVideoStore(s => s.updateSlideTranscript)
  const handleGenerateSlideVoiceover = useVideoStore(s => s.handleGenerateSlideVoiceover)
  const handleCloseTool = useVideoStore(s => s.handleCloseTool)
  const updateSpotlight = useVideoStore(s => s.updateSpotlight)
  const updateCallout = useVideoStore(s => s.updateCallout)
  const updateZoom = useVideoStore(s => s.updateZoom)
  const deleteSpotlight = useVideoStore(s => s.deleteSpotlight)
  const deleteCallout = useVideoStore(s => s.deleteCallout)
  const deleteZoom = useVideoStore(s => s.deleteZoom)
  const updateSlide = useVideoStore(s => s.updateSlide)
  const handleSelectEntity = useVideoStore(s => s.handleSelectEntity)
  const openEntitySettings = useVideoStore(s => s.openEntitySettings)

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

  const handleExportVideo = async () => {
    if (!portalClient || !videoConfigFromStore) return

    try {
      setIsExportingVideo(true)
      prepareProgressRef.current = 2
      setExportProgress({ status: 'submitting', hasPhase: false, percent: prepareProgressRef.current })

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
          renderResponse.videoId, Number(renderResponse.version))

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



  // Centralized preview handler - plays a slide from start and pauses at end
  const handlePreviewSlide = (slideId: string) => {
    playerRef.current?.seekToSlide(slideId)
    setTimeout(() => playerRef.current?.play(), 100)
  }

  const handleTogglePreviewSlide = (slideId: string) => {
    const currentlyPlaying = playerRef.current?.isPlaying() ?? false

    if (currentlyPlaying) {
      playerRef.current?.pause()
      return
    }

    handlePreviewSlide(slideId)
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
          {/* Duration Badge (Non-clickable) */}
          <div className="flex items-center gap-1 px-2 py-1 text-sm font-medium rounded-md border bg-muted text-muted-foreground">
            <Timer className='w-4 h-4' />
            {/* To fixed is used here to show only 2 decimal point to user for UX */}
            {videoConfigFromStore?.metadata?.duration.toFixed(2)}s
          </div>
          <ResolutionSelector />
          <BackgroundMusicSelector />
          {/* <Button
            variant='outline'
            size='sm'
            onClick={() => setShowVoiceover(true)}
            className='gap-2'
            disabled={isStreamingVideo}
          >
            <Mic2 className='w-4 h-4' />
            Voiceover
          </Button> */}
          <Button
            className='btn-accent-gradient gap-2'
            disabled={isStreamingVideo ||
               isExportingVideo || 
               videoConfigFromStore?.config?.sections.length == 0 ||
               videoConfigFromStore?.config?.sections[0].slides.length == 0
              }
            onClick={handleExportVideo}
          >
            <Eye className='w-4 h-4' />
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
                  isPreviewPlaying={isPlayerPlaying}
                  onPreviewTemplate={() => handleTogglePreviewSlide(selectedSlide.slide.id)}
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
                onSpotlightPlay={() => handleTogglePreviewSlide(selectedSlide.slide.id)}
              />
            ) : (
              <motion.div
                key='storyboard'
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className='h-full flex flex-col'
              >
                <div className='p-4 border-b border-border flex items-center justify-between'>
                  <h2 className='font-semibold'>Storyboard</h2>
                  <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                    <span>{videoConfigFromStore?.config?.sections.length} sections</span>
                    <span>•</span>
                    <span>{videoConfigFromStore?.config?.sections.reduce((acc, s) => acc + s.slides.length, 0)} scenes</span>
                  </div>
                </div>

                {selectedSlide && (
                  <StoryboardPanel
                    isStreamingVideo={isStreamingVideo}
                    onSelectSlide={(_section, slide) => {
                      // Update store — RemotionPlayer's useEffect reacts and seeks to visual end
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
                  />
                )}
              </motion.div>
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
                // Use unified selection handler
                handleSelectEntity(createSlideEntityId(slideId))
              }}             
              onFullscreenChange={handleFullscreenChange}
              onPlaybackStateChange={setIsPlayerPlaying}
              onSelectOverlayFromTimeline={(overlayId, slideId) => {
                // Use unified selection handler
                handleSelectEntity(createOverlayEntityId(slideId, overlayId))
              }}
              // Duration change handler — newDuration is in seconds, store as frames
              onDurationChange={(_slideId, newDuration) => {
                updateSlide({ durationInFrames: Math.round(newDuration * 30) })
              }}
              onSelectTemplate={slideId => {
                console.debug('selected templated slide: ', slideId)
                const entityId = createSlideEntityId(slideId)
                handleSelectEntity(entityId)
                // Open template settings when clicking on template
                openEntitySettings(entityId)
              }}
              transcriptPanel={(() => {
                // Handle case where no slide is selected yet (during streaming)
                if (!selectedSlide) {
                  return (
                    <div className='space-y-2'>
                      <div className='flex items-center gap-2'>
                        <Volume2 className='w-4 h-4 text-muted-foreground' />
                        <span className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
                          Voiceover Script
                        </span>
                      </div>
                      <div className='flex items-center gap-3'>
                        <div className='flex-1 max-w-xl'>
                          <Textarea
                            value=''
                            placeholder={isStreamingVideo ? 'Waiting for slides...' : 'No slide selected'}
                            className='text-sm min-h-[40px] resize-none'
                            rows={1}
                            disabled={true}
                          />
                        </div>
                        <Button variant='outline' size='icon' className='h-9 w-9 flex-shrink-0' disabled={true}>
                          <Mic2 className='w-4 h-4' />
                        </Button>
                      </div>
                    </div>
                  )
                }

                let currentTranscript = selectedSlide.slide.transcript
                let handleTranscriptChange = updateSlideTranscript               

                return (
                  <div className='space-y-2'>
                    <div className='flex items-center gap-2'>
                      <Volume2 className='w-4 h-4 text-muted-foreground' />
                      <span className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
                        Voiceover Script
                      </span>
                    </div>
                    <div className='flex items-center gap-3'>
                      <div className='flex-1 max-w-xl'>
                        <Textarea
                          value={currentTranscript || ''}
                          onChange={e => handleTranscriptChange(e.target.value)}
                          placeholder='Enter slide transcript...'
                          className='text-sm min-h-[40px] resize-none'
                          rows={1}
                          onInput={e => {
                            const target = e.target as HTMLTextAreaElement
                            target.style.height = 'auto'
                            target.style.height = `${target.scrollHeight}px`
                          }}
                          disabled={isStreamingVideo} // Disable editing during streaming
                        />
                      </div>
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant='outline'
                              size='icon'
                              className='h-9 w-9 flex-shrink-0'
                              onClick={handleGenerateSlideVoiceover}
                              disabled={
                                !selectedSlide ||
                                generatingSlideVoiceover === selectedSlide.slide.id ||
                                isStreamingVideo
                              }
                            >
                              {selectedSlide && generatingSlideVoiceover === selectedSlide.slide.id ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                >
                                  <RefreshCw className='w-4 h-4' />
                                </motion.div>
                              ) : (
                                <Mic2 className='w-4 h-4' />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className='text-xs'>
                            {selectedSlide?.slide.voiceoverGenerated ? 'Regenerate' : 'Generate'} voiceover
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                )
              })()}
            />
          </div>

          {/* Template props are now shown in the left storyboard/settings panel for consistency */}
        </div>
      </div>

      {/* Modals */}
      {/* <ScreenshotLibrary /> */}
      {/* <VoiceoverPanel /> */}
    </div>
  )
}
export default EditorPage
