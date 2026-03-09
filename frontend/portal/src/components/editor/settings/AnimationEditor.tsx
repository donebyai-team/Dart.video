import { useClientsContext } from '@coasterai/ui-core/context/ClientContext'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles, Square, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import QuestionPanel from '@/components/composer/QuestionPanel'
import ThinkingViewComponent from '@/components/composer/ThinkingViewComponent'
import { useVideoStore } from '@/stores/video'
import { AddOrEditAnimationSettings } from '@/types/tools'
import type { AskUserQuestion, GenerateOrEditAnimationResponse } from '@coasterai/pb/coasterai/portal/v1/portal_pb'
import type { AnimationTemplate } from '@coasterai/pb/coasterai/core/v1/template_pb'
import { SlideType, type AnimationSlideContent, type Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { getConnectError } from '@/utils/error'
import toast from 'react-hot-toast'
import { reconcileEdits } from '../animation/reconcileEdits'

interface AnimationEditorProps {
    settings: AddOrEditAnimationSettings
}

type Stage = 'compose' | 'thinking' | 'question'

export default function AnimationEditor({ settings }: AnimationEditorProps) {
    const updateSlide = useVideoStore(s => s.updateSlide)
    const selectedSlide = useVideoStore(s => s.selectedSlide)
    const addAnimationSlide = useVideoStore(s => s.addAnimationSlide)
    const videoId = useVideoStore(s => s.videoConfig?.id)
    const { portalClient } = useClientsContext()

    const isAdding = !!settings.previousSlide

    const [prompt, setPrompt] = useState('')
    const [stage, setStage] = useState<Stage>('compose')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [thinkingChunk, setThinkingChunk] = useState('')
    const [activeQuestion, setActiveQuestion] = useState<AskUserQuestion | undefined>()
    const [pendingQuestion, setPendingQuestion] = useState<AskUserQuestion | undefined>()
    const [selectedAnswer, setSelectedAnswer] = useState('')
    const [customAnswer, setCustomAnswer] = useState('')
    const [suggestions, setSuggestions] = useState<AnimationTemplate[]>([])
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
    const [isThinkingBusy, setIsThinkingBusy] = useState(false)

    const abortControllerRef = useRef<AbortController | null>(null)
    const streamSessionRef = useRef(0)
    const createdSlideIdRef = useRef<string | null>(null)
    const pendingGeneratedSlideRef = useRef<Slide | null>(null)

    const canSubmit = prompt.trim().length > 0

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
        // Editing: only update registry, codeRegistry, edits on the current selected slide.
        // Always read existingContent from the store so any concurrent manual edits are preserved.
        const updatedContent = slide.content?.case === 'animation' ? slide.content.value : undefined
        if (!updatedContent) return

        const existingContent = selectedSlide?.slide.content?.case === 'animation'
            ? selectedSlide.slide.content.value
            : undefined

        const existingEdits = (existingContent?.edits ?? {}) as unknown as Parameters<typeof reconcileEdits>[2]
        const reconciledEdits = reconcileEdits(
            (existingContent?.registry ?? {}) as unknown as Parameters<typeof reconcileEdits>[0],
            (updatedContent.registry ?? {}) as unknown as Parameters<typeof reconcileEdits>[1],
            existingEdits
        )
        console.debug('[AnimationEditor] Reconciling edits', existingContent?.edits, reconciledEdits)

        updateSlide({
            content: {
                case: 'animation' as const,
                value: {
                    ...(existingContent ?? {}),
                    registry: updatedContent.registry,
                    codeRegistry: updatedContent.codeRegistry,
                    edits: reconciledEdits as unknown as AnimationSlideContent['edits'],
                } as AnimationSlideContent
            }
        })
    }

    const randomSlideId = () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID()
        }
        return `slide_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    }

    const buildSlideWithTemplate = (baseSlide: Slide, template: AnimationTemplate): Slide => {
        const baseAnimation = baseSlide.content?.case === 'animation'
            ? baseSlide.content.value
            : undefined

        return {
            ...baseSlide,
            id: baseSlide.id || randomSlideId(),
            type: SlideType.ANIMATION,
            content: {
                case: 'animation',
                value: {
                    ...(baseAnimation ?? {}),
                    codeRegistry: template.codeRegistry,
                    registry: template.registry,
                    edits: template.edits,
                    plan: template.plan,
                } as AnimationSlideContent
            },
        }
    }

    const createOrUpdateAddedSlide = (slide: Slide) => {
        if (!isAdding || !settings.previousSlide) return

        if (!createdSlideIdRef.current) {
            addAnimationSlide(settings.previousSlide.section.id, slide, settings.previousSlide.slide.id)
            createdSlideIdRef.current = slide.id
            pendingGeneratedSlideRef.current = slide
            return
        }

        if (selectedSlide?.slide.id !== createdSlideIdRef.current) return
        updateSlide({
            duration: slide.duration,
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

            if (event.slide) {
                pendingGeneratedSlideRef.current = event.slide
                if (isAdding) {
                    if (event.suggestions.length === 0) {
                        createOrUpdateAddedSlide(event.slide)
                    }
                } else {
                    applySlideToStore(event.slide)
                }
                setIsThinkingBusy(false)
            }

            if (event.suggestions.length > 0) {
                setSuggestions(event.suggestions)
                setSelectedSuggestionIndex(0)
                handleSelectSuggestion(0, event.suggestions)
            }

            if (event.waitingForUserInput && event.askUserQuestion) {
                setPendingQuestion(event.askUserQuestion)
                setIsThinkingBusy(false)
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
        if (!isAdding && !selectedSlide?.slide.id) return

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
                isAdding
                    ? {
                        videoId,
                        input: {
                            case: 'createNewAnimationInput',
                            value: {
                                suggestions: withSuggestions,
                                prompt: finalPrompt,
                            },
                        },
                    }
                    : {
                        videoId,
                        input: {
                            case: 'editAnimationUserInput',
                            value: {
                                slideId: selectedSlide?.slide.id ?? '',
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
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null
            }
        }
    }

    const handleSubmit = () => startStream(undefined, isAdding)

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
                        slideId: isAdding ? undefined : selectedSlide?.slide.id,
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

    const handleSelectSuggestion = (index: number, sourceSuggestions?: AnimationTemplate[]) => {
        setSelectedSuggestionIndex(index)
        const template = (sourceSuggestions ?? suggestions)[index]
        if (!template) return

        if (isAdding && settings.previousSlide) {
            if (!createdSlideIdRef.current) {
                const baseSlide = pendingGeneratedSlideRef.current ?? {
                    ...settings.previousSlide.slide,
                    id: randomSlideId(),
                    type: SlideType.ANIMATION,
                    content: {
                        case: 'animation',
                        value: {
                            plan: template.plan,
                        } as AnimationSlideContent,
                    },
                }
                createOrUpdateAddedSlide(buildSlideWithTemplate(baseSlide, template))
                return
            }
        }

        const existingContent = selectedSlide?.slide.content?.case === 'animation'
            ? selectedSlide.slide.content.value
            : undefined
        updateSlide({
            content: {
                case: 'animation' as const,
                value: {
                    ...(existingContent ?? {}),
                    codeRegistry: template.codeRegistry,
                    registry: template.registry,
                    edits: template.edits ?? existingContent?.edits,
                } as AnimationSlideContent
            }
        })
    }

    const handleDislikeSuggestions = () => {
        setSuggestions([])
        startStream(undefined, false)
    }

    const showThinking = stage === 'thinking'
    const showSuggestions = suggestions.length > 0
    const showEmptyState = !showThinking && stage !== 'question' && !showSuggestions

    return (
        <div className='flex flex-col h-full p-4 gap-3'>
            {/* <div className='text-sm font-medium text-foreground'>
                {isAdding ? 'Generate Animation' : 'Edit Animation'}
            </div> */}

            <div className='flex flex-col flex-1 min-h-0'>
                <div className='flex-1 min-h-0 rounded-xl border bg-background/60 backdrop-blur-sm p-3 overflow-auto'>
                    {showThinking && <ThinkingViewComponent thinkingChunk={thinkingChunk} />}

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

                    {showSuggestions && (
                        <div className='flex flex-col gap-2'>
                            <p className='text-xs text-muted-foreground font-medium'>Choose a style</p>
                            <div className='grid grid-cols-2 gap-2'>
                                {suggestions.map((template, index) => (
                                    <button
                                        key={template.id}
                                        onClick={() => handleSelectSuggestion(index)}
                                        className={`relative rounded-lg overflow-hidden border-2 transition-colors aspect-video bg-muted ${
                                            selectedSuggestionIndex === index
                                                ? 'border-primary'
                                                : 'border-transparent hover:border-border'
                                        }`}
                                    >
                                        {template.previewUrl ? (
                                            <img
                                                src={template.previewUrl}
                                                alt={template.name}
                                                className='w-full h-full object-cover'
                                            />
                                        ) : (
                                            <div className='w-full h-full flex items-center justify-center text-xs text-muted-foreground'>
                                                {template.name}
                                            </div>
                                        )}
                                        {selectedSuggestionIndex === index && (
                                            <div className='absolute inset-0 bg-primary/10' />
                                        )}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={handleDislikeSuggestions}
                                disabled={isSubmitting}
                                className='flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 self-start'
                            >
                                <X className='w-3 h-3' />
                                I don't like any of these
                            </button>
                        </div>
                    )}

                    {showEmptyState && (
                        <div className='h-full flex flex-col items-center justify-center text-center px-4'>
                            <h3 className='text-base font-semibold text-foreground'>
                                {isAdding ? 'Add Animation' : 'Edit Animation'}
                            </h3>
                            <p className='mt-1 text-sm text-muted-foreground max-w-md'>
                                {isAdding
                                    ? 'Describe the motion style, pacing, and visual direction to generate a new animation'
                                    : 'Describe the changes you want in this animation (e.g., change text, colors, timing, or layout)'}
                            </p>
                        </div>
                    )}
                </div>

                <div className='mt-3 rounded-xl border bg-background shadow-sm overflow-hidden'>
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
                        rows={3}
                        disabled={isSubmitting}
                        className='w-full resize-none bg-transparent px-3 py-2.5 text-sm focus:outline-none placeholder:text-muted-foreground/60 disabled:opacity-50'
                    />
                    <div className='px-3 pb-2.5 flex justify-end'>
                        {isSubmitting || stage === 'question' ? (
                            <Button
                                onClick={handleStop}
                                variant='outline'
                                size='sm'
                                className='h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30'
                            >
                                <Square className='w-3 h-3 fill-current' />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                size='sm'
                                disabled={!canSubmit}
                                className='h-8 w-8 rounded-lg'
                            >
                                <Sparkles className='w-3.5 h-3.5' />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
