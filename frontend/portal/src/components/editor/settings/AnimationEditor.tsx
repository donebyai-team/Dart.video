import { create } from '@bufbuild/protobuf'
import { useClientsContext } from '@coasterai/ui-core/context/ClientContext'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Palette, Sparkles, Square, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import QuestionPanel from '@/components/composer/QuestionPanel'
import ThinkingViewComponent from '@/components/composer/ThinkingViewComponent'
import AssetUploadDropdown from '@/components/composer/AssetUploadDropdown'
import BrandLibrarySelector from '@/components/composer/BrandLibrarySelector'
import ManualMediaImportPanel from '@/components/assets/ManualMediaImportPanel'
import FigmaImportPanel, { type ConfirmPayload as FigmaImportConfirmPayload } from '@/components/figma/FigmaImportPanel'
import SelectedAssetsDialog, { type SelectedAssetWithPreview } from '@/components/assets/SelectedAssetsDialog'
import { useVideoStore } from '@/stores/video'
import { ActiveToolType, AddOrEditAnimationSettings } from '@/types/tools'
import type { AskUserQuestion, GenerateOrEditSceneResponse } from '@coasterai/pb/coasterai/portal/v1/portal_pb'
import {SlideStatus, type Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { MediaAsset, SelectedMediaAsset, SelectedMediaAssetSchema } from '@coasterai/pb/coasterai/core/v1/media_asset_pb'
import { getConnectError } from '@/utils/error'
import toast from 'react-hot-toast'
import { PatchOverlay } from '@coasterai/renderer'
import SceneSettings from './SceneSettings'
import { useRouter } from 'next/navigation'

interface AnimationEditorProps {
    settings: AddOrEditAnimationSettings
    overlay: PatchOverlay
    onValuePatch: (id: string, prop: string, value: unknown) => void
    setOverlay: (overlay: PatchOverlay) => void
    onClose: () => void
}

type Stage = 'compose' | 'thinking' | 'question'

export default function AnimationEditor({ settings, overlay, onValuePatch, setOverlay, onClose }: AnimationEditorProps) {
    const updateSlide = useVideoStore(s => s.updateSlide)
    const selectedSlide = useVideoStore(s => s.selectedSlide)
    const videoId = useVideoStore(s => s.videoConfig?.id)
    const brandIdentity = useVideoStore(s => s.videoConfig?.metadata?.generatedBranding?.brandIdentity)
    const brandLibraryID = useVideoStore(s => s.videoConfig?.metadata?.generatedBranding?.brandLibraryID)
    const acceptVideoConfigChanges = useVideoStore(s => s.acceptVideoConfigChanges)

    const handleSelectTool = useVideoStore(s => s.handleSelectTool)
    const { portalClient } = useClientsContext()
    const router = useRouter()

    const hasBrand = !!(brandLibraryID || brandIdentity?.id)
    const selectedAnimationElementId = settings?.animationElementId ?? null

    const [prompt, setPrompt] = useState('')

    const [stage, setStage] = useState<Stage>('compose')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [thinkingChunk, setThinkingChunk] = useState('')
    const [activeQuestion, setActiveQuestion] = useState<AskUserQuestion | undefined>()
    const [pendingQuestion, setPendingQuestion] = useState<AskUserQuestion | undefined>()
    const [selectedAnswer, setSelectedAnswer] = useState('')
    const [customAnswer, setCustomAnswer] = useState('')
    const [isThinkingBusy, setIsThinkingBusy] = useState(false)

    // Asset management
    type AssetPickerMode = 'figma' | 'upload'
    const [selectedAssets, setSelectedAssets] = useState<SelectedAssetWithPreview[]>([])
    const [assetDialogOpen, setAssetDialogOpen] = useState(false)
    const [assetPickerMode, setAssetPickerMode] = useState<AssetPickerMode>('upload')
    const [selectedAssetsDialogOpen, setSelectedAssetsDialogOpen] = useState(false)
    const [questionAssets, setQuestionAssets] = useState<SelectedMediaAsset[]>([])

    const hasSelectedAssets = selectedAssets.length > 0
    const selectedAssetMessages = useMemo(
        () => selectedAssets.map(a => a.selection),
        [selectedAssets]
    )

    const abortControllerRef = useRef<AbortController | null>(null)
    const streamSessionRef = useRef(0)

    const canSubmit = prompt.trim().length > 0

    useEffect(() => {
        if (selectedSlide) {
            setPrompt(
                (selectedSlide.slide?.content?.plan?.selectedTemplateDescription) || ''
            );
        }
    }, [selectedSlide]);

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
        setStage('question')
    }, [pendingQuestion, isThinkingBusy])

    useEffect(() => {
        return () => { abortControllerRef.current?.abort() }
    }, [])

    /** 
     * If the scene is completely changed when user prompted
     * We'd get new edits with only the changed scene ids
     * In this case, we select the first element from the new edits to refresh the scene settings     
    */
    const reselectIfNeeded = (edits: PatchOverlay) => {
        if (selectedAnimationElementId && edits[selectedAnimationElementId]) return
        const firstId = Object.keys(edits)[0]
        if (firstId) {
            console.log("updated the scene id", firstId)
            handleSelectTool({
                type: ActiveToolType.ADD_OR_EDIT_ANIMATION,
                settings: { animationElementId: firstId },
            })
        }
    }

    const applySlideToStore = (slide: Slide) => {
        const updatedContent = slide.content;
        if (!updatedContent) return

        const existingContent = selectedSlide?.slide.content
            ? selectedSlide.slide.content
            : undefined

        const pathOverlay = updatedContent.edits as unknown as PatchOverlay
        setOverlay(pathOverlay)
        reselectIfNeeded(pathOverlay)

        updateSlide({
            slideStatus: SlideStatus.GENERATED,
            durationInFrames: slide.durationInFrames,
            settledFrame: slide.settledFrame,
            content: {
                ...(existingContent ?? {}),
                codeRegistry: updatedContent.codeRegistry,
                edits: pathOverlay,
            }
        } as Slide)

        // Force sync changes to backend.
        acceptVideoConfigChanges();
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
                setPrompt('')
                setStage('compose')
                setIsSubmitting(false)
                abortControllerRef.current?.abort()
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
            setStage('compose')
            setIsSubmitting(false)
            setIsThinkingBusy(false)
        }
    }

    const startStream = async (overridePrompt?: string) => {
        const finalPrompt = (overridePrompt ?? prompt).trim()
        const slideId = selectedSlide?.slide.id
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
                    slideToEdit: selectedSlide?.slide,
                    input: {
                        case: 'request',
                        value: {
                            prompt: finalPrompt,
                            assets: selectedAssetMessages,
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

    const handleSubmit = () => startStream()

    const handleStop = () => {
        streamSessionRef.current++
        abortControllerRef.current?.abort()
        abortControllerRef.current = null
        setStage('compose')
        setIsSubmitting(false)
        setIsThinkingBusy(false)
        setThinkingChunk('')
        setActiveQuestion(undefined)
        setPendingQuestion(undefined)
        setQuestionAssets([])
    }

    // ── Asset helpers ──

    const openAssetDialog = (mode: AssetPickerMode) => {
        setAssetPickerMode(mode)
        setAssetDialogOpen(true)
    }

    const upsertSelectedAsset = (asset: MediaAsset, note?: string) => {
        const nextAsset = create(SelectedMediaAssetSchema, {
            assetID: asset.id,
            note: note?.trim() || undefined
        })
        setSelectedAssets(current => {
            const remaining = current.filter(item => item.selection.assetID !== nextAsset.assetID)
            return [...remaining, { selection: nextAsset, asset }]
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
            const res = await portalClient.importFigmaFrame({ fileKey, nodeId: selectedFrame.nodeId })
            if (!res.asset) throw new Error('Figma import did not return an asset')
            if (stage === 'question') {
                upsertQuestionAsset(res.asset, sectionNote)
            } else {
                upsertSelectedAsset(res.asset, sectionNote)
            }
        } catch (err) {
            toast.error(getConnectError(err))
        }
    }

    const handleSelectUploadedAsset = ({ asset, sectionNote }: { asset: MediaAsset; sectionNote?: string }) => {
        if (stage === 'question') {
            upsertQuestionAsset(asset, sectionNote)
        } else {
            upsertSelectedAsset(asset, sectionNote)
        }
    }

    const removeSelectedAsset = (assetID: string) => {
        setSelectedAssets(current => current.filter(a => a.selection.assetID !== assetID))
    }

    const updateSelectedAssetNote = (assetID: string, note?: string) => {
        setSelectedAssets(current =>
            current.map(a => a.selection.assetID === assetID
                ? { ...a, selection: create(SelectedMediaAssetSchema, { assetID, note }) }
                : a
            )
        )
    }

    const hydrateSelectedAssets = (assets: MediaAsset[]) => {
        if (assets.length === 0) return
        setSelectedAssets(current =>
            current.map(sa => {
                const full = assets.find(a => a.id === sa.selection.assetID)
                return full ? { ...sa, asset: full } : sa
            })
        )
    }

    const handleContinuePlanning = async (responseOverride?: string) => {
        const response = (responseOverride ?? answerInput).trim()
        const slideId = selectedSlide?.slide.id
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

            const stream = portalClient.generateOrEditScene({
                videoId,
                slideToEdit: selectedSlide?.slide,
                input: {
                    case: 'askUserInput',
                    value: {
                        slideId,
                        response,
                        assets: questionAssets,
                    },
                },
            }, { signal: controller.signal })

            setQuestionAssets([])

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

    const showThinking = !!thinkingChunk

    return (
        <div className='flex flex-col h-full p-4 gap-3'>
            {/* Asset picker dialog */}
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

            <SelectedAssetsDialog
                open={selectedAssetsDialogOpen}
                selectedAssets={selectedAssets}
                onOpenChange={setSelectedAssetsDialogOpen}
                onHydrateAssets={hydrateSelectedAssets}
                onRemoveAsset={removeSelectedAsset}
                onUpdateAssetNote={updateSelectedAssetNote}
                onOpenUpload={() => openAssetDialog('upload')}
            />

            <div className='flex items-center justify-between'>
                <span className='text-sm font-medium text-foreground' />
                <Button variant='ghost' size='sm' className='h-6 w-6 p-0' onClick={onClose}>
                    <X className='w-4 h-4' />
                </Button>
            </div>

            <div className='flex flex-col flex-1 min-h-0'>
                {selectedAnimationElementId && (
                    <div className='mb-3 rounded-xl border bg-background shadow-sm overflow-hidden'>
                        <SceneSettings
                            elementId={selectedAnimationElementId}
                            overlay={overlay}
                            onValuePatch={onValuePatch}
                        />
                    </div>
                )}

                <div className='flex-1 min-h-0 rounded-xl bg-background/60 backdrop-blur-sm p-3 overflow-auto'>
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
                </div>

                {showThinking && (
                    <div className='mt-3'>
                        <ThinkingViewComponent thinkingChunk={thinkingChunk} />
                    </div>
                )}

                <div className="mt-3 rounded-xl border bg-background shadow-sm overflow-hidden relative">
                    {/* Toolbar row */}
                    <div className='flex items-center gap-1.5 px-3 pt-2 pb-1.5 text-xs text-muted-foreground border-b border-border/40 flex-wrap'>
                        {hasBrand ? (
                            <span className='flex items-center gap-1 flex-shrink-0'>
                                <Palette className='w-4 h-4 opacity-70' />
                                <span className='text-xs'>{brandIdentity?.name ?? 'Brand'}</span>
                            </span>
                        ) : (
                            <BrandLibrarySelector
                                selectedBrandLibraryId={undefined}
                                onChange={() => {}}
                                onAddBrand={() => router.push('/dashboard/brand')}
                                disabled={stage !== 'compose'}
                            />
                        )}

                        <span className='text-border/60 mx-0.5'>·</span>

                        <AssetUploadDropdown
                            disabled={stage !== 'compose'}
                            onOpenAssetPicker={openAssetDialog}
                        />
                    </div>

                    {/* Selected assets badge */}
                    {hasSelectedAssets && (
                        <div className='mx-3 mt-1.5 flex flex-wrap gap-2'>
                            <div
                                onClick={() => setSelectedAssetsDialogOpen(true)}
                                className='flex cursor-pointer items-center justify-between rounded-lg border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs transition-colors hover:border-primary/30'
                            >
                                <div className='flex items-center gap-2 text-primary'>
                                    <span className='font-medium'>
                                        {selectedAssets.length} asset{selectedAssets.length > 1 ? 's' : ''}
                                    </span>
                                </div>
                                <button
                                    onClick={e => {
                                        e.stopPropagation()
                                        setSelectedAssets([])
                                    }}
                                    className='ml-2 p-0.5 rounded hover:bg-destructive/10 hover:text-destructive'
                                    type='button'
                                >
                                    <X className='w-3.5 h-3.5' />
                                </button>
                            </div>
                        </div>
                    )}

                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSubmit && !isSubmitting) {
                                e.preventDefault()
                                void handleSubmit()
                            }
                        }}
                        placeholder="Describe the changes you'd like to make..."
                        rows={8}
                        disabled={isSubmitting || stage === 'question'}
                        className="w-full resize-none bg-transparent px-3 py-2.5 pr-12 text-sm focus:outline-none placeholder:text-muted-foreground/60 disabled:opacity-50"
                    />

                    <div className="absolute bottom-2 right-2">
                        {isSubmitting || stage === 'question' ? (
                            <Button
                                onClick={handleStop}
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                            >
                                <Square className="w-3 h-3 fill-current" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                size="sm"
                                disabled={!canSubmit}
                                className="h-8 w-8 rounded-lg"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
