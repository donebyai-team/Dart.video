'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Film,
  Clock,
  Sparkles,
  TextIcon,
  X,
  Palette,
  LanguagesIcon,
  Square
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Script } from '@coasterai/pb/coasterai/core/v1/video_pb'
import ScriptEditorDialog from '@/components/dashboard/ScriptEditorDialog'
import { useClientsContext } from '@coasterai/ui-core/context/ClientContext'
import { getConnectError } from '@/utils/error'
import toast from 'react-hot-toast'
import defaultEditorConfig from '@/data/editorConfig'
import { useRouter } from 'next/navigation'
import { getDefaultResolution } from '@/stores/video/defaults'
import type { AskUserQuestion, CreateVideoResponse } from '@coasterai/pb/coasterai/portal/v1/portal_pb'
import QuestionPanel from '@/components/composer/QuestionPanel'
import ThinkingViewComponent from '@/components/composer/ThinkingViewComponent'
import { BrandIdentity } from '@coasterai/pb/coasterai/core/v1/brandkit_pb'

const DURATIONS = [
  { label: '60s', value: '60' },
  { label: '90s', value: '90' }
]

const LANGUAGES = [{ label: 'English(UK)', value: 'en' }]

const NO_BRAND_VALUE = 'none'
const MIN_SCRIPT_SECTIONS = 3
const MIN_PROMPT_LENGTH = 10

type ComposerStage = 'compose' | 'planning' | 'question'

const VideoIntentComposer = () => {
  const [prompt, setPrompt] = useState('')
  const [resolutionId, setResolutionId] = useState(defaultEditorConfig.resolution.default)
  const [selectedBrandLibraryId, setSelectedBrandLibraryId] = useState<string | undefined>()
  const [duration, setDuration] = useState('60')
  const [language, setLanguage] = useState('en')
  const [scriptDialogOpen, setScriptDialogOpen] = useState(false)
  const [script, setScript] = useState<Script | undefined>()

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

  const hasScript = !!script?.items?.length
  const router = useRouter()
  const { portalClient } = useClientsContext()

  const scriptVoiceoverCount = script?.items?.filter(i => i.voiceover?.trim()).length ?? 0
  const hasValidScript = scriptVoiceoverCount >= MIN_SCRIPT_SECTIONS
  const hasPrompt = prompt.trim().length > MIN_PROMPT_LENGTH
  const canGenerate = hasPrompt || hasValidScript
  const [identities, setIdentities] = useState<BrandIdentity[]>([])

   useEffect(() => {
        fetchBrandIdentities();
    }, [portalClient])

   const fetchBrandIdentities = async () => {
        try {
            const res = await portalClient.getBrandIdentities({})
            setIdentities(res.identities)
            if (res.identities.length > 0)          {
              setSelectedBrandLibraryId(res.identities[0].id);
            }
        } catch (err) {
            console.error("Failed to fetch brand identities", err)
            toast.error(getConnectError(err))
        }
    }

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
    setStage('question')
  }, [pendingQuestion, isThinkingBusy])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
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
        duration: Number(duration),
        brandLibraryId: selectedBrandLibraryId
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
        response
      }, { signal: controller.signal })

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

  return (
    <div className='flex flex-col w-full max-w-3xl mx-auto px-4 min-h-[calc(100vh-4rem)]'>
      <ScriptEditorDialog
        open={scriptDialogOpen}
        onOpenChange={setScriptDialogOpen}
        initialScript={script}
        onSave={(s: Script) => setScript(s)}
      />

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
        <ThinkingViewComponent
          enabled={showThinking}
          isSubmitting={isSubmitting}
          thinkingChunk={thinkingChunk}
          resetSignal={thinkingResetSignal}
          onBusyChange={setIsThinkingBusy}
        />

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
          />
        )}

        {/* Main input card */}
        <div className='rounded-2xl border bg-background shadow-sm overflow-hidden'>

          {/* Toolbar row */}
          <div className='flex items-center gap-1.5 px-4 pt-2.5 pb-2 text-xs text-muted-foreground border-b border-border/40 flex-wrap'>
            <Film className='w-4 h-4 flex-shrink-0' />
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

            <span className='text-border/60 mx-0.5'>·</span>

            <Clock className='w-4 h-4 flex-shrink-0' />
            <Select value={duration} onValueChange={setDuration} disabled={stage !== 'compose'}>
              <SelectTrigger className='h-7 text-xs bg-transparent border-none shadow-none ring-0 focus:ring-0 px-1 gap-1 w-auto min-w-0'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className='text-border/60 mx-0.5'>·</span>

            <LanguagesIcon className='w-4 h-4 flex-shrink-0' />
            <Select value={language} onValueChange={setLanguage} disabled={stage !== 'compose'}>
              <SelectTrigger className='h-7 text-xs bg-transparent border-none shadow-none ring-0 focus:ring-0 px-1 gap-1 w-auto min-w-0'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className='flex-1' />

            <button
              onClick={() => setScriptDialogOpen(true)}
              className='flex items-center gap-1.5 hover:text-foreground rounded px-1.5 py-1 hover:bg-muted/50 transition-colors'
            >
              <TextIcon className='w-3.5 h-3.5' />
              <span>{hasScript ? 'Edit script' : 'Script'}</span>
            </button>

            <span className='text-border/60 mx-0.5'>·</span>

            <Palette className='w-4 h-4 flex-shrink-0 opacity-70' />
            <Select
              value={selectedBrandLibraryId ?? NO_BRAND_VALUE}
              onValueChange={v => setSelectedBrandLibraryId(v === NO_BRAND_VALUE ? undefined : v)}
              disabled={stage !== 'compose'}
            >
              <SelectTrigger className='h-7 text-xs bg-transparent border-none shadow-none ring-0 focus:ring-0 px-1 gap-1 w-auto min-w-0'>
                <SelectValue placeholder='Brand' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_BRAND_VALUE}>No brand</SelectItem>
                {identities.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Script badge */}
          {hasScript && (
            <div
              onClick={() => setScriptDialogOpen(true)}
              className='mx-4 mt-2 flex items-center justify-between rounded-lg border bg-primary/5 border-primary/15 px-3 py-1.5 text-xs cursor-pointer hover:border-primary/30 transition-colors'
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
