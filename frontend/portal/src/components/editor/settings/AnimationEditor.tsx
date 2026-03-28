import { useClientsContext } from '@coasterai/ui-core/context/ClientContext'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles, Square, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import QuestionPanel from '@/components/composer/QuestionPanel'
import ThinkingViewComponent from '@/components/composer/ThinkingViewComponent'
import { useVideoStore } from '@/stores/video'
import { AddOrEditAnimationSettings } from '@/types/tools'
import type { AskUserQuestion, GenerateOrEditAnimationResponse } from '@coasterai/pb/coasterai/portal/v1/portal_pb'
import { type AnimationSlideContent, type Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { getConnectError } from '@/utils/error'
import toast from 'react-hot-toast'
import { PatchOverlay } from '@coasterai/renderer'
import SceneSettings from './SceneSettings'
import { hasEditableSceneFields } from './sceneSettingsHelpers'

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
    const addAnimationSlide = useVideoStore(s => s.addAnimationSlide)
    const videoId = useVideoStore(s => s.videoConfig?.id)
    const { portalClient } = useClientsContext()

    const normalizedSettings = settings ?? {}
    const isAdding = !!normalizedSettings.previousSlide

    const [prompt, setPrompt] = useState('')

    const [stage, setStage] = useState<Stage>('compose')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [thinkingChunk, setThinkingChunk] = useState('')
    const [activeQuestion, setActiveQuestion] = useState<AskUserQuestion | undefined>()
    const [pendingQuestion, setPendingQuestion] = useState<AskUserQuestion | undefined>()
    const [selectedAnswer, setSelectedAnswer] = useState('')
    const [customAnswer, setCustomAnswer] = useState('')
    const [isThinkingBusy, setIsThinkingBusy] = useState(false)

    const abortControllerRef = useRef<AbortController | null>(null)
    const streamSessionRef = useRef(0)
    const createdSlideIdRef = useRef<string | null>(null)
    // Tracks whether the new slide has been committed to the store yet.
    // createdSlideIdRef can be set earlier (from a waitingForUserInput event) without the slide
    // being in the store — this flag distinguishes the two states.
    const slideInStoreRef = useRef(false)
    const pendingGeneratedSlideRef = useRef<Slide | null>(null)

    const canSubmit = prompt.trim().length > 0
    const selectedAnimationElementId = normalizedSettings.animationElementId ?? null
    const shouldShowSceneSettings = !!selectedAnimationElementId
        && hasEditableSceneFields(selectedAnimationElementId, overlay)

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

    const applySlideToStore = (slide: Slide) => {
        // Editing: update codeRegistry + reconcile edits (overlay) on the current selected slide.
        // edits IS the PatchOverlay — contains both initial LLM values and user overrides.
        const updatedContent = slide.content;
        if (!updatedContent) return

        const existingContent = selectedSlide?.slide.content
            ? selectedSlide.slide.content
            : undefined

        const pathOverlay = updatedContent.edits as unknown as PatchOverlay           
        // Update editor state
        setOverlay(pathOverlay)

        updateSlide({
            durationInFrames: slide.durationInFrames,
            settledFrame: slide.settledFrame,
            content: {
                ...(existingContent ?? {}),
                codeRegistry: updatedContent.codeRegistry,
                edits: pathOverlay,
            }
        } as Slide)
    }

    const createOrUpdateAddedSlide = (slide: Slide) => {
        if (!isAdding || !normalizedSettings.previousSlide) return

        if (!slideInStoreRef.current) {
            addAnimationSlide(normalizedSettings.previousSlide.section.id, slide, normalizedSettings.previousSlide.slide.id)
            createdSlideIdRef.current = slide.id
            slideInStoreRef.current = true
            pendingGeneratedSlideRef.current = slide
            return
        }

        if (selectedSlide?.slide.id !== createdSlideIdRef.current) return
        updateSlide({
            durationInFrames: slide.durationInFrames,
            transcript: slide.transcript,
            backgroundStyle: slide.backgroundStyle,
            content: slide.content,
        })
    }

    const consumeStream = async (
        stream: AsyncIterable<GenerateOrEditAnimationResponse>,
        signal: AbortSignal,
        streamSession: number
    ) => {
        for await (const event of stream) {
            if (signal.aborted || streamSessionRef.current !== streamSession) return

            if (event.thinkingSummary) {
                setThinkingChunk(event.thinkingSummary)
                setIsThinkingBusy(true)
            }

            // completed=true means work is fully done; the event always includes a slide with its id.
            // If suggestions are present, auto-select the first one (user can switch via the grid).
            // If no suggestions, apply the slide directly to the store.
            // Either way, abort the stream and return to compose stage.
            if (event.completed) {
                setIsThinkingBusy(false)

                if (event.slide) {
                    pendingGeneratedSlideRef.current = event.slide
                     if (isAdding) {
                        createOrUpdateAddedSlide(event.slide)
                    } else {
                        applySlideToStore(event.slide)
                    }
                }               
                setPrompt('')
                setStage('compose')
                setIsSubmitting(false)
                abortControllerRef.current?.abort()
                return
            }

            // completed=false + waitingForUserInput means the backend needs more info before finishing.
            // The event includes the in-progress slide (with its id) so we can reference it in the
            // follow-up askUserInput call. Abort the current stream; it will be restarted via
            // handleContinuePlanning once the user answers.
            if (!event.completed && event.waitingForUserInput && event.askUserQuestion) {
                if (event.slide) {
                    // Only store the id for the follow-up askUserInput — do NOT add this partial
                    // slide to the store, it has no renderable content yet
                    pendingGeneratedSlideRef.current = event.slide
                    if (isAdding && !createdSlideIdRef.current) {
                        createdSlideIdRef.current = event.slide.id
                    }
                }

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

    const startStream = async (overridePrompt?: string, withSuggestions = true) => {
        const finalPrompt = (overridePrompt ?? prompt).trim()
        if (!videoId || !finalPrompt || isSubmitting) return
        const activeSlideId = createdSlideIdRef.current ?? selectedSlide?.slide.id
        const shouldEditExisting = !isAdding || !!createdSlideIdRef.current
        if (shouldEditExisting && !activeSlideId) return

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

            const stream = portalClient.generateOrEditAnimationSlide(
                shouldEditExisting
                    ? {
                        videoId,
                        input: {
                            case: 'editAnimationUserInput',
                            value: {
                                slideId: activeSlideId ?? '',
                                prompt: finalPrompt,
                            },
                        },
                    }
                    : {
                        videoId,
                        input: {
                            case: 'createNewAnimationInput',
                            value: {
                                suggestions: withSuggestions,
                                prompt: finalPrompt,
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

    const handleSubmit = () => startStream(undefined, isAdding && !createdSlideIdRef.current)

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
    }

    const handleContinuePlanning = async (responseOverride?: string) => {
        const response = (responseOverride ?? answerInput).trim()
        if (!videoId || !response || isSubmitting) return

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

            const stream = portalClient.generateOrEditAnimationSlide({
                videoId,
                input: {
                    case: 'askUserInput',
                    value: {
                        // slideId is always required: for new slides it comes from createdSlideIdRef
                        // (set when the waitingForUserInput event arrived), for edits it's the selected slide
                        slideId: createdSlideIdRef.current!,
                        response,
                    },
                },
            }, { signal: controller.signal })

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
    const showEmptyState = isAdding

    return (
        <div className='flex flex-col h-full p-4 gap-3'>
            <div className='flex items-center justify-between'>
                <span className='text-sm font-medium text-foreground'>
                    {/* {isAdding ? 'Generate Animation' : 'Edit Animation'} */}
                </span>
                <Button variant='ghost' size='sm' className='h-6 w-6 p-0' onClick={onClose}>
                    <X className='w-4 h-4' />
                </Button>
            </div>

            <div className='flex flex-col flex-1 min-h-0'>
                {shouldShowSceneSettings && selectedAnimationElementId && (
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
                        />
                    )}

                    {showEmptyState && (
                        <div className='h-full flex flex-col items-center justify-center text-center px-4'>
                            <h3 className='text-base font-semibold text-foreground'>
                                Add Animation
                            </h3>
                            <p className='mt-1 text-sm text-muted-foreground max-w-md'>
                                Describe the motion style, pacing, and visual direction to generate a new animation
                            </p>
                        </div>
                    )}
                </div>

                {showThinking && (
                    <div className='mt-3'>
                        <ThinkingViewComponent thinkingChunk={thinkingChunk} />
                    </div>
                )}

                <div className="mt-3 rounded-xl border bg-background shadow-sm overflow-hidden relative">
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSubmit && !isSubmitting) {
                                e.preventDefault()
                                void handleSubmit()
                            }
                        }}
                        placeholder={isAdding ? 'Describe the animation you want...' : 'Describe changes to make...'}
                        rows={5}
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
