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
import type { Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { getConnectError } from '@/utils/error'
import toast from 'react-hot-toast'

interface AnimationEditorProps {
    settings: AddOrEditAnimationSettings
}

type Stage = 'compose' | 'thinking' | 'question'

// Stub for adding a generated slide — not yet implemented
function addGeneratedSlide(_slide: Slide, _sectionId: string, _afterSlideId: string) {
    // TODO: implement adding a new animation slide to the video config
    console.warn('addGeneratedSlide not implemented', _slide, _sectionId, _afterSlideId)
}

export default function AnimationEditor({ settings }: AnimationEditorProps) {
    const updateSlide = useVideoStore(s => s.updateSlide)
    const { portalClient } = useClientsContext()

    const isEditing = !!settings.slideToEdit
    // Track the active slide ID for edits — may update after first add
    const activeSlideIdRef = useRef<string | undefined>(settings.slideToEdit?.slide.id)

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
        if (activeSlideIdRef.current) {
            // Editing: update the existing slide in the store
            updateSlide(slide)
        } else {
            // Adding: insert the new slide after the previous one
            const previousSlide = settings.previousSlide
            if (previousSlide) {
                addGeneratedSlide(slide, previousSlide.section.id, previousSlide.slide.id)
                activeSlideIdRef.current = slide.id
            }
        }
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
                applySlideToStore(event.slide)
                setIsThinkingBusy(false)
            }

            if (event.suggestions.length > 0) {
                setSuggestions(event.suggestions)
                setSelectedSuggestionIndex(0)
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
        if (!finalPrompt || isSubmitting) return

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

            const stream = portalClient.generateOrEditAnimationSlide({
                slideId: activeSlideIdRef.current,
                prompt: finalPrompt,
                suggestions: withSuggestions,
            }, { signal: controller.signal })

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

    const handleSubmit = () => startStream(undefined, !isEditing)

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
        if (!response || isSubmitting) return

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
                slideId: activeSlideIdRef.current,
                prompt: response,
                suggestions: false,
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

    const handleSelectSuggestion = (index: number) => {
        setSelectedSuggestionIndex(index)
        // Update the slide with the selected template's code registry
        const template = suggestions[index]
        if (!template || !activeSlideIdRef.current) return
        updateSlide({ content: { case: 'animation', value: { codeRegistry: template.registry } } as any })
    }

    const handleDislikeSuggestions = () => {
        setSuggestions([])
        startStream(undefined, false)
    }

    const showThinking = stage === 'thinking'

    return (
        <div className='flex flex-col h-full p-4 gap-3'>
            <div className='text-sm font-medium text-foreground'>
                {isEditing ? 'Edit Animation' : 'Generate Animation'}
            </div>

            <div className='flex flex-col gap-2.5 flex-1'>
                {/* Thinking bar */}
                {showThinking && <ThinkingViewComponent thinkingChunk={thinkingChunk} />}

                {/* Question panel */}
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

                {/* Suggestions grid */}
                {suggestions.length > 0 && (
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

                {/* Input card */}
                <div className='rounded-xl border bg-background shadow-sm overflow-hidden'>
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSubmit && !isSubmitting) {
                                e.preventDefault()
                                void handleSubmit()
                            }
                        }}
                        placeholder={isEditing ? 'Describe changes to make...' : 'Describe the animation you want...'}
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
