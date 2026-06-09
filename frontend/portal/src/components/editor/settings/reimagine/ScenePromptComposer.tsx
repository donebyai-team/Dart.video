import { create } from '@bufbuild/protobuf'
import { useClientsContext } from '@coasterai/ui-core/context/ClientContext'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Palette, Sparkles, Square, X } from 'lucide-react'
import type { PatchOverlay } from '@coasterai/renderer'
import { useRouter } from 'next/navigation'
import type { AskUserQuestion, GenerateOrEditSceneResponse } from '@coasterai/pb/coasterai/portal/v1/portal_pb'
import { MediaType, SelectedMediaAssetSchema, type MediaAsset, type SelectedMediaAsset } from '@coasterai/pb/coasterai/core/v1/media_asset_pb'
import { CodeRegistrySchema, SlideStatus, type Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import QuestionPanel from '@/components/composer/QuestionPanel'
import ThinkingViewComponent from '@/components/composer/ThinkingViewComponent'
import AssetUploadDropdown from '@/components/composer/AssetUploadDropdown'
import BrandLibrarySelector from '@/components/composer/BrandLibrarySelector'
import ManualMediaImportPanel from '@/components/assets/ManualMediaImportPanel'
import SelectedAssetsDialog, { type SelectedAssetWithPreview } from '@/components/assets/SelectedAssetsDialog'
import { useVideoStore } from '@/stores/video'
import { getConnectError } from '@/utils/error'
import toast from 'react-hot-toast'

interface ScenePromptComposerProps {
  setOverlay: (overlay: PatchOverlay) => void
  onConversationUpdated?: () => void
}

type Stage = 'compose' | 'thinking' | 'question'

/**
 * Returns true for images that should be treated as attachments (assets)
 * instead of image references sent to the model.
 *
 * Typically considered assets:
 * - App / website icons (32x32, 64x64, 128x128 or < 256 and area 98304)
 * - Favicons
 * - Small badges or stickers
 * - Small UI graphics
 *
 * Typically NOT considered assets:
 * - Product screenshots
 * - Website screenshots
 * - Photos
 * - Diagrams
 * - Documents exported as images
 * - Whiteboard screenshots
 * - Full-page UI screenshots (e.g. 1440x900)
 *
 * Currently this only classifies small images that are likely to be icons
 * or similar UI assets.
 */
const isLikelyIconOrLogoImage = (asset: MediaAsset) => {
  if (asset.mediaType !== MediaType.IMAGE) return false

  // Favicon / icon files should always be treated as assets.
  if (asset.url?.toLowerCase().endsWith('.ico')) return true

  const width = asset.width
  const height = asset.height

  // If dimensions are unavailable, treat it as a normal image reference.
  if (!width || !height) return false

  const longestSide = Math.max(width, height)
  const area = width * height

  // Small images are typically icons, favicons, badges, etc.
  const isLikelyIcon = longestSide <= 256 && area <= 98304

  return isLikelyIcon
}

const splitSelectedReferences = (
  selectedReferences: SelectedAssetWithPreview[]
) => {
  const assets: SelectedMediaAsset[] = []
  const references: SelectedMediaAsset[] = []

  for (const selectedReference of selectedReferences) {
    const asset = selectedReference.asset

    const shouldSendAsAsset =
      asset?.mediaType === MediaType.SVG ||
      (asset && isLikelyIconOrLogoImage(asset))

    if (shouldSendAsAsset) {
      assets.push(selectedReference.selection)
    } else {
      references.push(selectedReference.selection)
    }
  }

  return { assets, references }
}

export default function ScenePromptComposer({ setOverlay, onConversationUpdated }: ScenePromptComposerProps) {
  const updateSlide = useVideoStore(s => s.updateSlide)
  const selectedSlide = useVideoStore(s => s.selectedSlide)
  const videoId = useVideoStore(s => s.videoConfig?.id)
  const brandIdentity = useVideoStore(s => s.videoConfig?.metadata?.generatedBranding?.brandIdentity)
  const brandLibraryID = useVideoStore(s => s.videoConfig?.metadata?.generatedBranding?.brandLibraryID)
  const handleSelectEntity = useVideoStore(s => s.handleSelectEntity)
  const acceptVideoConfigChanges = useVideoStore(s => s.acceptVideoConfigChanges)
  const { portalClient } = useClientsContext()
  const router = useRouter()

  const hasBrand = !!(brandLibraryID || brandIdentity?.id)
  const [prompt, setPrompt] = useState('')
  const [stage, setStage] = useState<Stage>('compose')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [thinkingChunk, setThinkingChunk] = useState('')
  const [activeQuestion, setActiveQuestion] = useState<AskUserQuestion | undefined>()
  const [pendingQuestion, setPendingQuestion] = useState<AskUserQuestion | undefined>()
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [customAnswer, setCustomAnswer] = useState('')
  const [isThinkingBusy, setIsThinkingBusy] = useState(false)
  const [selectedReferences, setSelectedReferences] = useState<SelectedAssetWithPreview[]>([])
  const [assetDialogOpen, setAssetDialogOpen] = useState(false)
  const [selectedAssetsDialogOpen, setSelectedAssetsDialogOpen] = useState(false)
  const [questionAssetsDialogOpen, setQuestionAssetsDialogOpen] = useState(false)
  const [questionAssets, setQuestionAssets] = useState<SelectedAssetWithPreview[]>([])

  const hasSelectedAssets = selectedReferences.length > 0
  const abortControllerRef = useRef<AbortController | null>(null)
  const streamSessionRef = useRef(0)
  const canSubmit = prompt.trim().length > 0

  useEffect(() => {
    if (selectedSlide) {
      setPrompt(selectedSlide.content?.plan?.selectedTemplateDescription || '')
    }
  }, [selectedSlide])

  const answerInput = useMemo(() => {
    if (!activeQuestion) return ''
    if (selectedAnswer) return selectedAnswer
    if (activeQuestion.allowCustomEntry) return customAnswer.trim()
    return ''
  }, [activeQuestion, customAnswer, selectedAnswer])

  useEffect(() => {
    if (!pendingQuestion || isThinkingBusy) return
    setActiveQuestion(pendingQuestion)
    setPendingQuestion(undefined)
    setSelectedAnswer('')
    setCustomAnswer('')
    setThinkingChunk('')
    setQuestionAssets([])
    setQuestionAssetsDialogOpen(false)
    setStage('question')
  }, [pendingQuestion, isThinkingBusy])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const isSlideEmpty = (slide: Slide) => {
    const updatedContent = slide.content
    if (!updatedContent) return false

    const existingContent = selectedSlide?.content ? selectedSlide.content : undefined
    return !existingContent?.edits || Object.keys(existingContent.edits).length === 0
  }

  const applySlideToStore = (slide: Slide) => {
    const updatedContent = slide.content
    if (!updatedContent) return

    const existingContent = selectedSlide?.content ? selectedSlide.content : undefined
    const pathOverlay = updatedContent.edits as unknown as PatchOverlay

    const previousHistoryEntry = existingContent?.codeRegistry
      ? create(CodeRegistrySchema, {
        ...existingContent.codeRegistry,
        edits: existingContent.edits,
      })
      : undefined

    const history = [...(existingContent?.history ?? [])];

    if (previousHistoryEntry) {
      history.push(previousHistoryEntry);
    }

    setOverlay(pathOverlay)

    updateSlide({
      slideStatus: SlideStatus.GENERATED,
      durationInFrames: slide.durationInFrames,
      settledFrame: slide.settledFrame,
      content: {
        ...(existingContent ?? {}),
        codeRegistry: updatedContent.codeRegistry,
        edits: pathOverlay,
        history,
      },
      backgroundStyle: slide.backgroundStyle,
    } as Slide)

    // if (isSlideEmpty(slide)) {
    //   acceptVideoConfigChanges()
    // }

    handleSelectEntity(slide.id)
  }

  const resetAfterStop = () => {
    setPrompt('')
    setSelectedReferences([])
    setSelectedAssetsDialogOpen(false)
    setQuestionAssets([])
    setQuestionAssetsDialogOpen(false)
  }

  const resetAfterStreamEnd = () => {
    setStage('compose')
    setIsSubmitting(false)
    setIsThinkingBusy(false)
    setThinkingChunk('')
    setActiveQuestion(undefined)
    setPendingQuestion(undefined)
    resetAfterStop()
  }

  const consumeStream = async (
    stream: AsyncIterable<GenerateOrEditSceneResponse>,
    signal: AbortSignal,
    streamSession: number
  ) => {
    for await (const event of stream) {
      if (signal.aborted || streamSessionRef.current !== streamSession) return

      if (event.thinkingSummary) {
        setThinkingChunk(event.thinkingSummary)
        setIsThinkingBusy(true)
      }

      if (event.completed) {
        setIsThinkingBusy(false)

        if (event.slide) {
          applySlideToStore(event.slide)
        }

        resetAfterStreamEnd()
        setThinkingChunk(event.thinkingSummary)
        abortControllerRef.current?.abort()
        onConversationUpdated?.()
        return
      }

      if (!event.completed && event.waitingForUserInput && event.askUserQuestion) {
        setPendingQuestion(event.askUserQuestion)
        setIsThinkingBusy(false)
        setIsSubmitting(false)
        abortControllerRef.current?.abort()
        return
      }
    }

    if (!signal.aborted && streamSessionRef.current === streamSession) {
      resetAfterStreamEnd()
    }
  }

  const startStream = async (overridePrompt?: string) => {
    const finalPrompt = (overridePrompt ?? prompt).trim()
    const { assets, references } = splitSelectedReferences(selectedReferences)
    const slideId = selectedSlide?.id
    if (!videoId || !finalPrompt || !slideId || isSubmitting) return

    const controller = new AbortController()
    abortControllerRef.current = controller
    const streamSession = ++streamSessionRef.current

    try {
      setIsSubmitting(true)
      setStage('thinking')
      setThinkingChunk('Generating animation...')
      setActiveQuestion(undefined)
      setPendingQuestion(undefined)
      setIsThinkingBusy(true)

      const stream = portalClient.generateOrEditScene(
        {
          videoId,
          slideToEdit: selectedSlide,
          input: {
            case: 'request',
            value: {
              prompt: finalPrompt,
              assets,
              references,
            },
          },
        },
        { signal: controller.signal }
      )

      await consumeStream(stream, controller.signal, streamSession)
    } catch (err: any) {
      if (!controller.signal.aborted) {
        toast.error(getConnectError(err))
        setStage('compose')
        setThinkingChunk('')
        setIsThinkingBusy(false)
        setIsSubmitting(false)
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

  const handleStop = () => {
    streamSessionRef.current++
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    resetAfterStreamEnd()
  }

  const openAssetDialog = (_mode?: 'figma' | 'upload') => {
    setAssetDialogOpen(true)
  }

  const upsertSelectedAsset = (asset: MediaAsset, note?: string) => {
    const nextAsset = create(SelectedMediaAssetSchema, {
      assetID: asset.id,
      note: note?.trim() || undefined,
    })

    setSelectedReferences(current => {
      const remaining = current.filter(item => item.selection.assetID !== nextAsset.assetID)
      return [...remaining, { selection: nextAsset, asset }]
    })
    setAssetDialogOpen(false)
  }

  const upsertQuestionAsset = (asset: MediaAsset, note?: string) => {
    const nextAsset = create(SelectedMediaAssetSchema, {
      assetID: asset.id,
      note: note?.trim() || undefined,
    })

    setQuestionAssets(current => {
      const remaining = current.filter(item => item.selection.assetID !== nextAsset.assetID)
      return [...remaining, { selection: nextAsset, asset }]
    })
    setAssetDialogOpen(false)
  }

  const handleSelectUploadedAsset = ({ asset, sectionNote }: { asset: MediaAsset; sectionNote?: string }) => {
    if (stage === 'question') {
      upsertQuestionAsset(asset, sectionNote)
      return
    }

    upsertSelectedAsset(asset, sectionNote)
  }

  const removeSelectedAsset = (assetID: string) => {
    setSelectedReferences(current => current.filter(asset => asset.selection.assetID !== assetID))
  }

  const updateSelectedAssetNote = (assetID: string, note?: string) => {
    setSelectedReferences(current =>
      current.map(asset =>
        asset.selection.assetID === assetID
          ? { ...asset, selection: create(SelectedMediaAssetSchema, { assetID, note }) }
          : asset
      )
    )
  }

  const hydrateSelectedAssets = (assets: MediaAsset[]) => {
    if (assets.length === 0) return
    setSelectedReferences(current =>
      current.map(selectedAsset => {
        const fullAsset = assets.find(asset => asset.id === selectedAsset.selection.assetID)
        return fullAsset ? { ...selectedAsset, asset: fullAsset } : selectedAsset
      })
    )
  }

  const removeQuestionAsset = (assetID: string) => {
    setQuestionAssets(current => current.filter(asset => asset.selection.assetID !== assetID))
  }

  const updateQuestionAssetNote = (assetID: string, note?: string) => {
    setQuestionAssets(current =>
      current.map(asset =>
        asset.selection.assetID === assetID
          ? { ...asset, selection: create(SelectedMediaAssetSchema, { assetID, note }) }
          : asset
      )
    )
  }

  const hydrateQuestionAssets = (assets: MediaAsset[]) => {
    if (assets.length === 0) return
    setQuestionAssets(current =>
      current.map(selectedAsset => {
        const fullAsset = assets.find(asset => asset.id === selectedAsset.selection.assetID)
        return fullAsset ? { ...selectedAsset, asset: fullAsset } : selectedAsset
      })
    )
  }

  const handleContinuePlanning = async (responseOverride?: string) => {
    const response = (responseOverride ?? answerInput).trim()
    const slideId = selectedSlide?.id
    if (!videoId || !response || !slideId || isSubmitting) return

    const controller = new AbortController()
    abortControllerRef.current = controller
    const streamSession = ++streamSessionRef.current

    try {
      setIsSubmitting(true)
      setStage('thinking')
      setActiveQuestion(undefined)
      setPendingQuestion(undefined)
      setSelectedAnswer('')
      setCustomAnswer('')
      setThinkingChunk('Processing your answer...')
      setIsThinkingBusy(true)

      const stream = portalClient.generateOrEditScene(
        {
          videoId,
          slideToEdit: selectedSlide,
          input: {
            case: 'askUserInput',
            value: {
              slideId,
              response,
              // assets: questionAssets.map(asset => asset.selection),
            },
          },
        },
        { signal: controller.signal }
      )

      setQuestionAssets([])
      setQuestionAssetsDialogOpen(false)

      await consumeStream(stream, controller.signal, streamSession)
    } catch (err: any) {
      if (!controller.signal.aborted) {
        toast.error(getConnectError(err))
        setStage(activeQuestion ? 'question' : 'compose')
        setThinkingChunk('')
        setIsThinkingBusy(false)
        setIsSubmitting(false)
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }

  return (
    <div className='space-y-3'>
      <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
        <DialogContent className='max-w-2xl overflow-hidden p-0' forceMount>
          <ManualMediaImportPanel
            showPreview={false}
            onClose={() => setAssetDialogOpen(false)}
            onConfirm={handleSelectUploadedAsset}
            canConfirm={stage === 'compose' || stage === 'question'}
          />
        </DialogContent>
      </Dialog>

      <SelectedAssetsDialog
        open={selectedAssetsDialogOpen}
        selectedAssets={selectedReferences}
        onOpenChange={setSelectedAssetsDialogOpen}
        onHydrateAssets={hydrateSelectedAssets}
        onRemoveAsset={removeSelectedAsset}
        onUpdateAssetNote={updateSelectedAssetNote}
        onOpenUpload={openAssetDialog}
      />

      <SelectedAssetsDialog
        open={questionAssetsDialogOpen}
        selectedAssets={questionAssets}
        onOpenChange={setQuestionAssetsDialogOpen}
        onHydrateAssets={hydrateQuestionAssets}
        onRemoveAsset={removeQuestionAsset}
        onUpdateAssetNote={updateQuestionAssetNote}
        onOpenUpload={openAssetDialog}
      />

      {stage === 'question' && activeQuestion && (
        <div className='rounded-xl bg-background/60 p-3 backdrop-blur-sm'>
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
            onContinue={responseOverride => void handleContinuePlanning(responseOverride)}
            selectedQuestionAssets={questionAssets}
            onOpenAssetPicker={openAssetDialog}
            onOpenSelectedAssetsDialog={() => setQuestionAssetsDialogOpen(true)}
          />
        </div>
      )}

      {thinkingChunk && (
        <ThinkingViewComponent thinkingChunk={thinkingChunk} />
      )}

      <div className='relative overflow-hidden rounded-xl border bg-background shadow-sm'>
        <div className='flex flex-wrap items-center gap-1.5 border-b border-border/40 px-3 pb-1.5 pt-2 text-xs text-muted-foreground'>
          {hasBrand ? (
            <span className='flex flex-shrink-0 items-center gap-1'>
              <Palette className='h-4 w-4 opacity-70' />
              <span className='text-xs'>{brandIdentity?.name ?? 'Brand'}</span>
            </span>
          ) : (
            <BrandLibrarySelector
              selectedBrandLibraryId={undefined}
              onChange={() => { }}
              onAddBrand={() => router.push('/dashboard/brand')}
              disabled={stage !== 'compose'}
            />
          )}

          <span className='mx-0.5 text-border/60'>·</span>

          <AssetUploadDropdown
            disabled={stage !== 'compose'}
            onOpenAssetPicker={openAssetDialog}
          />
        </div>

        {hasSelectedAssets && (
          <div className='mx-3 mt-1.5 flex flex-wrap gap-2'>
            <div
              onClick={() => setSelectedAssetsDialogOpen(true)}
              className='flex cursor-pointer items-center justify-between rounded-lg border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs transition-colors hover:border-primary/30'
            >
              <div className='flex items-center gap-2 text-primary'>
                <span className='font-medium'>
                  {selectedReferences.length} asset{selectedReferences.length > 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={event => {
                  event.stopPropagation()
                  setSelectedReferences([])
                }}
                className='ml-2 rounded p-0.5 hover:bg-destructive/10 hover:text-destructive'
                type='button'
              >
                <X className='h-3.5 w-3.5' />
              </button>
            </div>
          </div>
        )}

        <textarea
          value={prompt}
          onChange={event => setPrompt(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && canSubmit && !isSubmitting) {
              event.preventDefault()
              void startStream()
            }
          }}
          placeholder="Describe the changes you'd like to make..."
          rows={5}
          disabled={isSubmitting || stage === 'question'}
          className='w-full resize-none bg-transparent px-3 py-2.5 pr-12 text-sm placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50'
        />

        <div className='absolute bottom-2 right-2'>
          {isSubmitting || stage === 'question' ? (
            <Button
              onClick={handleStop}
              variant='outline'
              size='sm'
              className='h-8 w-8 rounded-lg hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive'
            >
              <Square className='h-3 w-3 fill-current' />
            </Button>
          ) : (
            <Button
              onClick={() => void startStream()}
              size='sm'
              disabled={!canSubmit}
              className='h-8 w-8 rounded-lg'
            >
              <Sparkles className='h-3.5 w-3.5' />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
