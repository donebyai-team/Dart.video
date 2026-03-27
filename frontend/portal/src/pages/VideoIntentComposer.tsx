'use client'

import { create, fromJsonString } from '@bufbuild/protobuf'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Film,
  Sparkles,
  TextIcon,
  X,
  Square
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import FigmaImportPanel, { type ConfirmPayload as FigmaImportConfirmPayload } from '@/components/figma/FigmaImportPanel'
import ManualMediaImportPanel from '@/components/assets/ManualMediaImportPanel'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Script } from '@coasterai/pb/coasterai/core/v1/video_pb'
import ScriptEditorDialog from '@/components/dashboard/ScriptEditorDialog'
import { useClientsContext } from '@coasterai/ui-core/context/ClientContext'
import { getConnectError } from '@/utils/error'
import toast from 'react-hot-toast'
import defaultEditorConfig from '@/data/editorConfig'
import { useRouter } from 'next/navigation'
import { getDefaultResolution } from '@/stores/video/defaults'
import { type AskUserQuestion, type CreateVideoResponse } from '@coasterai/pb/coasterai/portal/v1/portal_pb'
import QuestionPanel from '@/components/composer/QuestionPanel'
import ThinkingViewComponent from '@/components/composer/ThinkingViewComponent'
import { StyleType, VideoMetadataSchema } from '@coasterai/pb/coasterai/core/v1/video_pb'
import StylePickerDialog from '@/components/composer/StylePickerDialog'
import AssetUploadDropdown from '@/components/composer/AssetUploadDropdown'
import LanguageSelector from '@/components/composer/LanguageSelector'
import BrandLibrarySelector from '@/components/composer/BrandLibrarySelector'
import { MediaAsset, SelectedMediaAsset, SelectedMediaAssetSchema } from '@coasterai/pb/coasterai/core/v1/media_asset_pb'

const MIN_SCRIPT_SECTIONS = 3
const MIN_PROMPT_LENGTH = 10
const VIDEO_COMPOSER_PREFILL_STORAGE_KEY = 'video-composer-prefill-metadata'

type ComposerStage = 'compose' | 'planning' | 'question'
type AssetPickerMode = 'figma' | 'upload'

const VideoIntentComposer = () => {
  const [prompt, setPrompt] = useState('')
  const [resolutionId, setResolutionId] = useState(defaultEditorConfig.resolution.default)
  const [selectedBrandLibraryId, setSelectedBrandLibraryId] = useState<string | undefined>()
  const [duration, setDuration] = useState('60')
  const [language, setLanguage] = useState('en')
  const [scriptDialogOpen, setScriptDialogOpen] = useState(false)
  const [styleDialogOpen, setStyleDialogOpen] = useState(false)
  const [assetDialogOpen, setAssetDialogOpen] = useState(false)
  const [assetPickerMode, setAssetPickerMode] = useState<AssetPickerMode>('upload')
  const [selectedStyle, setSelectedStyle] = useState<StyleType>(StyleType.UNDEFINED)
  const [script, setScript] = useState<Script | undefined>()
  const [selectedAssets, setSelectedAssets] = useState<SelectedMediaAsset[]>([])

  const [stage, setStage] = useState<ComposerStage>('compose')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [videoId, setVideoId] = useState('')
  const [isThinkingBusy, setIsThinkingBusy] = useState(false)
  const [thinkingChunk, setThinkingChunk] = useState('')
  const [thinkingResetSignal, setThinkingResetSignal] = useState(0)
  const streamSessionRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [activeQuestion, setActiveQuestion] = useState<AskUserQuestion | undefined>()
  const [pendingQuestion, setPendingQuestion] = useState<AskUserQuestion | undefined>()
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [customAnswer, setCustomAnswer] = useState('')
  const [questionAssets, setQuestionAssets] = useState<SelectedMediaAsset[]>([])

  const hasScript = !!script?.items?.length
  const router = useRouter()
  const { portalClient } = useClientsContext()

  const scriptVoiceoverCount = script?.items?.filter(i => i.voiceover?.trim()).length ?? 0
  const hasValidScript = scriptVoiceoverCount >= MIN_SCRIPT_SECTIONS
  const hasPrompt = prompt.trim().length > MIN_PROMPT_LENGTH
  const hasSelectedAssets = selectedAssets.length > 0
  const canGenerate = hasPrompt || hasValidScript || hasSelectedAssets

  const answerInput = useMemo(() => {
    if (!activeQuestion) return ''
    const allowsCustom = !!activeQuestion.allowCustomEntry
    if (selectedAnswer) return selectedAnswer
    if (allowsCustom) return customAnswer.trim()
    return ''
  }, [activeQuestion, customAnswer, selectedAnswer])
  const showThinking = hasSubmitted && stage !== 'question'

  useEffect(() => {
    if (!pendingQuestion) return
    if (isThinkingBusy) return

    setActiveQuestion(pendingQuestion)
    setPendingQuestion(undefined)
    setSelectedAnswer('')
    setCustomAnswer('')
    setQuestionAssets([])
    setStage('question')
  }, [pendingQuestion, isThinkingBusy])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const serializedMetadata = window.sessionStorage.getItem(VIDEO_COMPOSER_PREFILL_STORAGE_KEY)
    if (!serializedMetadata) return

    try {
      const metadata = fromJsonString(VideoMetadataSchema, serializedMetadata)
      setPrompt(metadata.prompt ?? '')
      setSelectedAssets(metadata.assets ?? [])
      if (metadata.generatedBranding?.brandLibraryID || metadata.generatedBranding?.brandIdentity?.id) {
        setSelectedBrandLibraryId(metadata.generatedBranding?.brandLibraryID || metadata.generatedBranding?.brandIdentity?.id)
      }
    } catch (err) {
      console.error('Failed to restore video metadata prefill', err)
      toast.error('Unable to prefill composer from the selected video')
    } finally {
      window.sessionStorage.removeItem(VIDEO_COMPOSER_PREFILL_STORAGE_KEY)
    }
  }, [])

  const consumePlanningStream = async (stream: AsyncIterable<CreateVideoResponse>, signal?: AbortSignal, streamSession?: number) => {
    for await (const event of stream) {
      if (signal?.aborted) return
      if (streamSession && streamSessionRef.current !== streamSession) return

      if (event.id) {
        setVideoId(event.id)
      }

      if (event.thinkingSummary) {
        setThinkingChunk(event.thinkingSummary)
      }

      if (event.errorMessage) {
        throw new Error(event.errorMessage)
      }

      if (event.waitingForUserInput && event.askUserQuestion) {
        setPendingQuestion(event.askUserQuestion)
        setIsThinkingBusy(false)
        return
      }

      if (event.planningCompleted) {
        if (signal?.aborted) return
        const nextVideoID = event.id || videoId
        if (!nextVideoID) {
          throw new Error('missing video id after planning completion')
        }
        router.push(`/editor/${nextVideoID}`)
        return
      }
    }
  }

  const handleStop = () => {
    streamSessionRef.current += 1

    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setThinkingChunk('')
    setThinkingResetSignal(v => v + 1)
    setIsThinkingBusy(false)
    setIsSubmitting(false)
    setHasSubmitted(false)
    setStage('compose')
    setActiveQuestion(undefined)
    setPendingQuestion(undefined)
    setQuestionAssets([])
  }

  const handleSubmit = async () => {
    if (!canGenerate || isSubmitting) return

    const selectedResolution =
      defaultEditorConfig.resolution.options.find(r => r.id === resolutionId) ??
      getDefaultResolution(defaultEditorConfig)

    const controller = new AbortController()
    abortControllerRef.current = controller
    const streamSession = streamSessionRef.current + 1
    streamSessionRef.current = streamSession

    try {
      setThinkingResetSignal(v => v + 1)
      setIsSubmitting(true)
      setHasSubmitted(true)
      setStage('planning')
      setThinkingChunk('Initializing planning...')
      setActiveQuestion(undefined)
      setPendingQuestion(undefined)

      const stream = portalClient.createVideo({
        prompt,
        script,
        resolution: selectedResolution,
        durationInSec: Number(duration),
        brandLibraryId: selectedBrandLibraryId,
        styleType: selectedStyle,
        assets: selectedAssets
      }, { signal: controller.signal })

      await consumePlanningStream(stream, controller.signal, streamSession)
    } catch (err: any) {
      if (!controller.signal.aborted) {
        toast.error(getConnectError(err))
        setStage('compose')
        setThinkingChunk('')
        setThinkingResetSignal(v => v + 1)
      }
    } finally {
      if (!controller.signal.aborted && streamSessionRef.current === streamSession) {
        setIsSubmitting(false)
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }

  const handleContinuePlanning = async (responseOverride?: string) => {
    const response = (responseOverride ?? answerInput).trim()
    if (!videoId || !response || isSubmitting) return

    const controller = new AbortController()
    abortControllerRef.current = controller
    const streamSession = streamSessionRef.current + 1
    streamSessionRef.current = streamSession

    try {
      setThinkingResetSignal(v => v + 1)
      setIsSubmitting(true)
      setStage('planning')
      setActiveQuestion(undefined)
      setPendingQuestion(undefined)
      setSelectedAnswer('')
      setCustomAnswer('')
      setThinkingChunk('Received your answer. Continuing planning...')

      const stream = portalClient.continueVideoPlanning({
        id: videoId,
        response,
        assets: questionAssets
      }, { signal: controller.signal })

      setQuestionAssets([])

      await consumePlanningStream(stream, controller.signal, streamSession)
    } catch (err: any) {
      if (!controller.signal.aborted) {
        toast.error(getConnectError(err))
        setStage(activeQuestion ? 'question' : 'compose')
        setThinkingChunk('')
        setThinkingResetSignal(v => v + 1)
      }
    } finally {
      if (!controller.signal.aborted && streamSessionRef.current === streamSession) {
        setIsSubmitting(false)
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }

  const removeScript = () => setScript(undefined)

  const upsertSelectedAsset = (asset: MediaAsset, note?: string) => {
    const nextAsset = create(SelectedMediaAssetSchema, {
      assetID: asset.id,
      note: note?.trim() || undefined
    })

    setSelectedAssets(current => {
      const remaining = current.filter(item => item.assetID !== nextAsset.assetID)
      return [...remaining, nextAsset]
    })
    setAssetDialogOpen(false)
  }

  const upsertQuestionAsset = (asset: MediaAsset, note?: string) => {
    const nextAsset = create(SelectedMediaAssetSchema, {
      assetID: asset.id,
      note: note?.trim() || undefined
    })

    setQuestionAssets(current => {
      const remaining = current.filter(item => item.assetID !== nextAsset.assetID)
      return [...remaining, nextAsset]
    })
    setAssetDialogOpen(false)
  }

  const handleSelectFigmaFrame = async ({ fileKey, selectedFrame, sectionNote }: FigmaImportConfirmPayload) => {
    try {
      const res = await portalClient.importFigmaFrame({
        fileKey,
        nodeId: selectedFrame.nodeId
      })
      if (!res.asset) {
        throw new Error('Figma import did not return an asset')
      }
      if (stage === 'question') {
        upsertQuestionAsset(res.asset, sectionNote)
      } else {
        upsertSelectedAsset(res.asset, sectionNote)
      }
    } catch (err) {
      toast.error(getConnectError(err))
    }
  }

  const handleSelectUploadedAsset = async ({ asset, sectionNote }: { asset: MediaAsset; sectionNote?: string }) => {
    if (stage === 'question') {
      upsertQuestionAsset(asset, sectionNote)
    } else {
      upsertSelectedAsset(asset, sectionNote)
    }
  }

  const openAssetDialog = (mode: AssetPickerMode) => {
    setAssetPickerMode(mode)
    setAssetDialogOpen(true)
  }

  return (
    <div className='flex flex-col w-full max-w-3xl mx-auto px-4 min-h-[calc(100vh-4rem)]'>
      <ScriptEditorDialog
        open={scriptDialogOpen}
        onOpenChange={setScriptDialogOpen}
        initialScript={script}
        onSave={(s: Script) => setScript(s)}
      />

      <StylePickerDialog
        open={styleDialogOpen}
        onOpenChange={setStyleDialogOpen}
        selectedStyle={selectedStyle}
        onSelect={setSelectedStyle}
      />

      <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
        <DialogContent className='max-w-2xl p-0 overflow-hidden' forceMount>
          <div className={assetPickerMode === 'figma' ? 'block' : 'hidden'}>
            <FigmaImportPanel
              onClose={() => setAssetDialogOpen(false)}
              onConfirm={handleSelectFigmaFrame}
              canConfirm={stage === 'compose' || stage === 'question'}
            />
          </div>
          <div className={assetPickerMode === 'upload' ? 'block' : 'hidden'}>
            <ManualMediaImportPanel
              onClose={() => setAssetDialogOpen(false)}
              onConfirm={handleSelectUploadedAsset}
              canConfirm={stage === 'compose' || stage === 'question'}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Center area — grows to push input to the bottom */}
      <div className='flex-1 flex items-center justify-center py-8'>
        <div className='text-center'>
          <h1 className='text-2xl font-semibold tracking-tight'>Plan your video</h1>
          <p className='text-sm text-muted-foreground mt-1.5'>
            Describe your video, add a script, or both
          </p>
        </div>
      </div>

      {/* Bottom composite area */}
      <div className='pb-6 space-y-2.5'>

        {/* Thinking bar — appears above input when agent is active */}
        { showThinking && <ThinkingViewComponent thinkingChunk={thinkingChunk} />}

        {/* Question panel — appears above input when agent asks something */}
        {stage === 'question' && activeQuestion && (
          <QuestionPanel
            question={activeQuestion}
            isSubmitting={isSubmitting}
            customAnswer={customAnswer}
            answerInput={answerInput}
            onOptionClick={option => {
              setSelectedAnswer(option)
              void handleContinuePlanning(option)
            }}
            onCustomAnswerChange={setCustomAnswer}
            onContinue={() => void handleContinuePlanning()}
            selectedQuestionAssets={questionAssets}
            onOpenAssetPicker={openAssetDialog}
          />
        )}

        {/* Main input card */}
        <div className='rounded-2xl border bg-background shadow-sm overflow-hidden'>

          {/* Toolbar row */}
          <div className='flex items-center gap-1.5 px-4 pt-2.5 pb-2 text-xs text-muted-foreground border-b border-border/40 flex-wrap'>
            <span className='flex items-center gap-1 flex-shrink-0'>
              <Film className='w-4 h-4' />
              <Select value={resolutionId} onValueChange={setResolutionId} disabled={stage !== 'compose'}>
                <SelectTrigger className='h-7 text-xs bg-transparent border-none shadow-none ring-0 focus:ring-0 px-1 gap-1 w-auto min-w-0'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {defaultEditorConfig.resolution.options.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.width}x{r.height})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </span>

            <span className='text-border/60 mx-0.5'>·</span>

            {/* <DurationSelector
              value={duration}
              onChange={setDuration}
              disabled={stage !== 'compose'}
            />

            <span className='text-border/60 mx-0.5'>·</span> */}

            <LanguageSelector
              value={language}
              onChange={setLanguage}
              disabled={stage !== 'compose'}
            />

            <div className='flex-1' />

            {/* <button
              onClick={() => setScriptDialogOpen(true)}
              className='flex items-center gap-1.5 flex-shrink-0 hover:text-foreground rounded px-1.5 py-1 hover:bg-muted/50 transition-colors'
            >
              <TextIcon className='w-3.5 h-3.5' />
              <span>{hasScript ? 'Edit script' : 'Script'}</span>
            </button>

            <span className='text-border/60 mx-0.5'>·</span> */}

           {/* Add Style */}
            {/* <StyleSelector
              selectedStyle={selectedStyle}
              onOpenDialog={() => setStyleDialogOpen(true)}
              disabled={stage !== 'compose'}
            /> */}

            <span className='text-border/60 mx-0.5'>·</span>

            <AssetUploadDropdown
              disabled={stage !== 'compose'}
              onOpenAssetPicker={openAssetDialog}
            />

            <span className='text-border/60 mx-0.5'>·</span>

            {/* Add Brand Library */}
            <BrandLibrarySelector
              selectedBrandLibraryId={selectedBrandLibraryId}
              onChange={setSelectedBrandLibraryId}
              onAddBrand={() => router.push('/dashboard/brand')}
              disabled={stage !== 'compose'}
            />
          </div>

          {/* Script badge */}
          {hasScript && (
            <div className='mx-4 mt-2 flex flex-wrap gap-2'>
            <div
              onClick={() => setScriptDialogOpen(true)}
              className='flex items-center justify-between rounded-lg border bg-primary/5 border-primary/15 px-3 py-1.5 text-xs cursor-pointer hover:border-primary/30 transition-colors'
            >
              <div className='flex items-center gap-2 text-primary'>
                <span className='font-medium'>Script attached</span>
                <span className='text-muted-foreground'>· {scriptVoiceoverCount} sections</span>
              </div>
              <button
                onClick={e => {
                  e.stopPropagation()
                  removeScript()
                }}
                className='p-0.5 rounded hover:bg-destructive/10 hover:text-destructive'
              >
                <X className='w-3.5 h-3.5' />
              </button>
            </div>
            </div>
          )}

          {hasSelectedAssets && (
            <div className='mx-4 mt-2 flex flex-wrap gap-2'>
              <div
                onClick={() => setAssetDialogOpen(true)}
                className='flex cursor-pointer items-center justify-between rounded-lg border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs transition-colors hover:border-primary/30'
              >
                <div className='flex items-center gap-2 text-primary'>
                  <span className='font-medium'>
                    {selectedAssets.length} selected screen{selectedAssets.length > 1 ? 's' : ''}
                  </span>
                  <span className='text-muted-foreground'>
                    · Imported assets
                  </span>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    setSelectedAssets([])
                  }}
                  className='p-0.5 rounded hover:bg-destructive/10 hover:text-destructive'
                  type='button'
                >
                  <X className='w-3.5 h-3.5' />
                </button>
              </div>
            </div>
          )}

          {/* Textarea */}
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={
              hasScript
                ? 'Add direction or style notes...'
                : 'Describe the video you want to generate...'
            }
            rows={4}
            className='w-full resize-none bg-transparent px-4 py-3 text-sm focus:outline-none placeholder:text-muted-foreground/60'
            disabled={stage !== 'compose'}
          />

          {/* Action row */}
          <div className='px-4 pb-3 flex justify-end'>
            {isSubmitting || stage === 'question' ? (
              <Button
                onClick={handleStop}
                variant='outline'
                size='sm'
                className='h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30'
              >
                <Square className='w-3.5 h-3.5 fill-current' />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                size='sm'
                className='h-9 w-9 rounded-xl'
                disabled={!canGenerate || stage !== 'compose'}
              >
                <Sparkles className='w-4 h-4' />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoIntentComposer
