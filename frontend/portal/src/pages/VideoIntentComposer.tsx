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
  CircleDashed,
  MessageSquareText,
  ChevronRight
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

const DURATIONS = [
  { label: '60s', value: '60' },
  { label: '90s', value: '90' }
]

const LANGUAGES = [{ label: 'English(UK)', value: 'en' }]

const brandLibraries = [
  { id: 'brand1', name: 'Acme Brand' },
  { id: 'brand2', name: 'Dark Mode Brand' }
]

const NO_BRAND_VALUE = 'none'
const MIN_SCRIPT_SECTIONS = 3
const MIN_PROMPT_LENGTH = 10
const THINKING_TYPING_STEP_MS = 70
const THINKING_CHANGE_DELAY_MS = 220
const THINKING_TYPING_SLIDE_DELAY_MS = 90
const THINKING_LINE_VISIBLE_CHARS = 120

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
  const [thinkingText, setThinkingText] = useState('')
  const [displayedThinkingText, setDisplayedThinkingText] = useState('')
  const [thinkingDots, setThinkingDots] = useState('')
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const changeDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const displayedThinkingRef = useRef('')
  const pendingThinkingTargetRef = useRef<string | null>(null)
  const activeThinkingTargetRef = useRef('')
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

  const answerInput = useMemo(() => {
    if (!activeQuestion) return ''
    const allowsCustom = !!activeQuestion.allowCustomEntry
    if (selectedAnswer) return selectedAnswer
    if (allowsCustom) return customAnswer.trim()
    return ''
  }, [activeQuestion, customAnswer, selectedAnswer])
  const hasThinking = thinkingText.trim().length > 0 || displayedThinkingText.trim().length > 0
  const showAgentActivity = hasSubmitted && stage !== 'question' && hasThinking
  const singleLineThinkingText = useMemo(() => {
    const normalized = displayedThinkingText.replace(/\s+/g, ' ').trim()
    if (!normalized) return ''
    const parts = normalized.split(/(?<=[.!?])\s+/)
    const line = parts[parts.length - 1] || normalized
    if (line.length <= THINKING_LINE_VISIBLE_CHARS) return line
    return line.slice(-THINKING_LINE_VISIBLE_CHARS)
  }, [displayedThinkingText])

  useEffect(() => {
    if (!pendingQuestion) return
    if (displayedThinkingText !== thinkingText) return

    setActiveQuestion(pendingQuestion)
    setPendingQuestion(undefined)
    setSelectedAnswer('')
    setCustomAnswer('')
    setStage('question')
  }, [pendingQuestion, displayedThinkingText, thinkingText])

  useEffect(() => {
    if (!isSubmitting) {
      setThinkingDots('')
      return
    }

    const frames = ['.', '..', '...']
    let idx = 0
    const timer = setInterval(() => {
      setThinkingDots(frames[idx % frames.length])
      idx += 1
    }, 320)

    return () => clearInterval(timer)
  }, [isSubmitting])

  useEffect(() => {
    displayedThinkingRef.current = displayedThinkingText
  }, [displayedThinkingText])

  useEffect(() => {
    if (!thinkingText) {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
        typingTimerRef.current = null
      }
      if (changeDelayTimerRef.current) {
        clearTimeout(changeDelayTimerRef.current)
        changeDelayTimerRef.current = null
      }
      pendingThinkingTargetRef.current = null
      activeThinkingTargetRef.current = ''
      setDisplayedThinkingText('')
      displayedThinkingRef.current = ''
      return
    }

    if (typingTimerRef.current) {
      pendingThinkingTargetRef.current = thinkingText
      return
    }

    const beginTyping = (target: string) => {
      activeThinkingTargetRef.current = target
      const current = displayedThinkingRef.current
      const base = target.startsWith(current) ? current : ''
      const remaining = target.slice(base.length)
      const chunks = remaining.match(/\S+\s*/g) ?? (remaining ? [remaining] : [])

      if (base === '' && current !== '') {
        setDisplayedThinkingText('')
        displayedThinkingRef.current = ''
      }

      const flushPending = () => {
        const pending = pendingThinkingTargetRef.current
        if (!pending || pending === activeThinkingTargetRef.current) return
        pendingThinkingTargetRef.current = null
        changeDelayTimerRef.current = setTimeout(() => {
          beginTyping(pending)
          changeDelayTimerRef.current = null
        }, THINKING_CHANGE_DELAY_MS)
      }

      if (chunks.length === 0) {
        setDisplayedThinkingText(target)
        displayedThinkingRef.current = target
        typingTimerRef.current = null
        flushPending()
        return
      }

      let nextText = base
      let idx = 0
      const tick = () => {
        nextText += chunks[idx]
        idx += 1
        setDisplayedThinkingText(nextText)
        displayedThinkingRef.current = nextText
        if (idx < chunks.length) {
          const justTyped = chunks[idx - 1]?.trim() ?? ''
          const punctuationDelay = /[.!?]$/.test(justTyped) ? THINKING_TYPING_SLIDE_DELAY_MS : 0
          typingTimerRef.current = setTimeout(tick, THINKING_TYPING_STEP_MS + punctuationDelay)
        } else {
          typingTimerRef.current = null
          flushPending()
        }
      }

      typingTimerRef.current = setTimeout(tick, THINKING_TYPING_STEP_MS)
    }

    changeDelayTimerRef.current = setTimeout(() => {
      beginTyping(thinkingText)
      changeDelayTimerRef.current = null
    }, THINKING_CHANGE_DELAY_MS)
  }, [thinkingText])

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
      }
      if (changeDelayTimerRef.current) {
        clearTimeout(changeDelayTimerRef.current)
      }
    }
  }, [])

  const consumePlanningStream = async (stream: AsyncIterable<CreateVideoResponse>) => {
    for await (const event of stream) {
      if (event.id) {
        setVideoId(event.id)
      }

      if (event.thinkingSummary) {
        setThinkingText(event.thinkingSummary)
      }

      if (event.errorMessage) {
        throw new Error(event.errorMessage)
      }

      if (event.waitingForUserInput && event.askUserQuestion) {
        setPendingQuestion(event.askUserQuestion)
        return
      }

      if (event.planningCompleted) {
        const nextVideoID = event.id || videoId
        if (!nextVideoID) {
          throw new Error('missing video id after planning completion')
        }
        router.push(`/editor/${nextVideoID}`)
        return
      }
    }
  }

  const handleSubmit = async () => {
    if (!canGenerate || isSubmitting) return

    const selectedResolution =
      defaultEditorConfig.resolution.options.find(r => r.id === resolutionId) ??
      getDefaultResolution(defaultEditorConfig)

    try {
      setIsSubmitting(true)
      setHasSubmitted(true)
      setStage('planning')
      setThinkingText('Initializing planning...')
      setActiveQuestion(undefined)
      setPendingQuestion(undefined)

      const stream = portalClient.createVideo({
        prompt,
        script,
        resolution: selectedResolution,
        duration: Number(duration),
        brandLibraryId: selectedBrandLibraryId ?? ''
      })

      await consumePlanningStream(stream)
    } catch (err: any) {
      toast.error(getConnectError(err))
      setStage('compose')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleContinuePlanning = async (responseOverride?: string) => {
    const response = (responseOverride ?? answerInput).trim()
    if (!videoId || !response || isSubmitting) return

    try {
      setIsSubmitting(true)
      setStage('planning')
      setActiveQuestion(undefined)
      setPendingQuestion(undefined)
      setSelectedAnswer('')
      setCustomAnswer('')
      setThinkingText('Received your answer. Continuing planning...')

      const stream = portalClient.continueVideoPlanning({
        id: videoId,
        response
      })

      await consumePlanningStream(stream)
    } catch (err: any) {
      toast.error(getConnectError(err))
      setStage(activeQuestion ? 'question' : 'compose')
    } finally {
      setIsSubmitting(false)
    }
  }

  const removeScript = () => setScript(undefined)

  return (
    <div className='w-full min-h-[62vh] px-4 mt-[10%] py-8'>
      <ScriptEditorDialog
        open={scriptDialogOpen}
        onOpenChange={setScriptDialogOpen}
        initialScript={script}
        onSave={(s: Script) => setScript(s)}
      />

      <div className='w-full max-w-4xl mx-auto mb-8 text-center'>
        <h1 className='text-3xl font-bold tracking-tight'>Plan your video with AI</h1>
        <p className='text-muted-foreground mt-2'>
          Submit intent, watch live planning, answer clarifications, then jump into editor.
        </p>
      </div>

      <Card className='border-0 shadow-xl rounded-3xl bg-gradient-to-b from-background to-muted/30 w-full max-w-4xl mx-auto overflow-hidden'>
        <CardContent className='p-0'>
          <div className='p-6 md:p-8'>
              <div className='flex items-center justify-between text-xs text-muted-foreground mb-4'>
                <div className='flex items-center gap-3'>
                  <div className='flex items-center gap-2'>
                    <Film className='w-4 h-4' />
                    <Select value={resolutionId} onValueChange={setResolutionId}>
                      <SelectTrigger className='h-8 text-xs bg-background w-[170px]'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {defaultEditorConfig.resolution.options.map(r => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name} ({r.height}x{r.width})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='flex items-center gap-2'>
                    <Clock className='w-4 h-4' />
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger className='h-8 text-xs bg-background w-[90px]'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATIONS.map(d => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className='flex items-center gap-2'>
                  <LanguagesIcon className='w-4 h-4' />
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className='h-8 text-xs bg-background w-[130px]'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(d => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='rounded-2xl border bg-background shadow-sm overflow-hidden'>
                <div className='flex items-center gap-3 px-4 pt-3 pb-2 text-xs text-muted-foreground'>
                  <button
                    className='flex items-center gap-1.5 hover:text-foreground'
                    onClick={() => setScriptDialogOpen(true)}
                  >
                    <TextIcon className='w-3.5 h-3.5' />
                    {hasScript ? 'Edit Script' : 'Add Script'}
                  </button>

                  <div className='flex items-center gap-1.5'>
                    <Palette className='w-3.5 h-3.5 opacity-70' />
                    <Select
                      value={selectedBrandLibraryId ?? NO_BRAND_VALUE}
                      onValueChange={v => setSelectedBrandLibraryId(v === NO_BRAND_VALUE ? undefined : v)}
                    >
                      <SelectTrigger className='h-8 text-xs bg-background min-w-[130px] border-none shadow-none ring-0'>
                        <SelectValue placeholder='Select brand' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_BRAND_VALUE}>No brand</SelectItem>
                        {brandLibraries.map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {hasScript && (
                  <div
                    onClick={() => setScriptDialogOpen(true)}
                    className='mx-4 mb-2 flex items-center justify-between rounded-xl border bg-primary/5 border-primary/20 px-3 py-2 text-xs cursor-pointer'
                  >
                    <div className='flex items-center gap-2 text-primary'>
                      <span className='font-medium'>Script attached</span>
                      <span className='text-muted-foreground'>• {scriptVoiceoverCount} sections</span>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        removeScript()
                      }}
                      className='p-1 rounded-md hover:bg-destructive/10 hover:text-destructive'
                    >
                      <X className='w-3.5 h-3.5' />
                    </button>
                  </div>
                )}

                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder={
                    hasScript
                      ? 'Add additional direction or style notes...'
                      : 'Describe the video you want to generate...'
                  }
                  className='w-full min-h-[130px] resize-none bg-transparent px-4 pb-3 pt-2 text-sm focus:outline-none'
                  disabled={stage !== 'compose'}
                />

                <div className='px-4 pb-3 flex justify-end'>
                  <Button
                    onClick={handleSubmit}
                    className='h-10 px-4 rounded-xl'
                    disabled={!canGenerate || stage !== 'compose' || isSubmitting}
                  >
                    {isSubmitting && stage === 'planning' ? (
                      <span className='inline-flex items-center gap-2'>
                        <CircleDashed className='w-4 h-4 animate-spin' /> Planning
                      </span>
                    ) : (
                      <span className='inline-flex items-center gap-2'>
                        Generate <Sparkles className='w-4 h-4' />
                      </span>
                    )}
                  </Button>
                </div>
              </div>
          </div>
        </CardContent>
      </Card>

      {showAgentActivity && (
        <div className='w-full max-w-4xl mx-auto mt-4 rounded-2xl border bg-muted/20 p-4 md:p-5'>
          <div className='flex items-center gap-2 text-sm font-medium mb-3'>
            <MessageSquareText className='w-4 h-4' /> Agent Activity
          </div>

          <div className='rounded-xl border bg-background p-3 pr-6 min-h-[44px] overflow-hidden'>
            <p className={`text-xs leading-relaxed text-muted-foreground/75 whitespace-nowrap ${isSubmitting ? 'animate-pulse' : ''}`}>
              {singleLineThinkingText || 'Waiting for planning stream...'}
              {isSubmitting && (
                <span className='inline-block w-6 text-left ml-0.5' aria-hidden='true'>
                  {thinkingDots}
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {stage === 'question' && activeQuestion && (
        <div className='w-full max-w-4xl mx-auto mt-4 rounded-2xl border bg-background p-4 space-y-3'>
          <p className='text-sm font-medium'>{activeQuestion.questionText}</p>

          {activeQuestion.options?.length > 0 && (
            <ul className='space-y-2'>
              {activeQuestion.options.map(option => (
                <li key={option}>
                  <button
                    onClick={() => {
                      setSelectedAnswer(option)
                      void handleContinuePlanning(option)
                    }}
                    disabled={isSubmitting}
                    className='w-full text-left px-3 py-2 text-xs rounded-lg border transition hover:bg-muted disabled:opacity-60'
                  >
                    {option}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {activeQuestion.allowCustomEntry && (
            <textarea
              value={customAnswer}
              onChange={e => setCustomAnswer(e.target.value)}
              placeholder='Or type your answer...'
              className='w-full min-h-[80px] resize-none bg-background border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
            />
          )}

          {activeQuestion.allowCustomEntry && (
            <Button onClick={() => void handleContinuePlanning()} disabled={!answerInput || isSubmitting} className='w-full'>
              <span className='inline-flex items-center gap-2'>
                Continue planning <ChevronRight className='w-4 h-4' />
              </span>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default VideoIntentComposer
