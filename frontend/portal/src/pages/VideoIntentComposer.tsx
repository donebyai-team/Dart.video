'use client'

import { useMemo, useState } from 'react'
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
  const [videoId, setVideoId] = useState('')
  const [thinkingFeed, setThinkingFeed] = useState<string[]>([])
  const [activeQuestion, setActiveQuestion] = useState<AskUserQuestion | undefined>()
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

  const appendThinking = (msg: string) => {
    if (!msg) return
    setThinkingFeed(prev => {
      if (prev[prev.length - 1] === msg) return prev
      return [...prev, msg].slice(-12)
    })
  }

  const consumePlanningStream = async (stream: AsyncIterable<CreateVideoResponse>) => {
    for await (const event of stream) {
      if (event.id) {
        setVideoId(event.id)
      }

      if (event.thinkingSummary) {
        appendThinking(event.thinkingSummary)
      }

      if (event.errorMessage) {
        throw new Error(event.errorMessage)
      }

      if (event.waitingForUserInput && event.askUserQuestion) {
        setActiveQuestion(event.askUserQuestion)
        setSelectedAnswer('')
        setCustomAnswer('')
        setStage('question')
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
      setStage('planning')
      setThinkingFeed(['Initializing planning...'])
      setActiveQuestion(undefined)

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

  const handleContinuePlanning = async () => {
    if (!videoId || !answerInput || isSubmitting) return

    try {
      setIsSubmitting(true)
      setStage('planning')
      appendThinking('Received your answer. Continuing planning...')

      const stream = portalClient.continueVideoPlanning({
        id: videoId,
        response: answerInput
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
    <div className='w-full min-h-[70vh] px-4 py-8 bg-[radial-gradient(circle_at_top_right,rgba(0,204,255,0.08),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(255,149,0,0.08),transparent_50%)]'>
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
          <div className='grid md:grid-cols-[1.2fr_0.8fr]'>
            <div className='p-6 md:p-8 border-b md:border-b-0 md:border-r border-border/60'>
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
                  className='w-full min-h-[170px] resize-none bg-transparent px-4 pb-4 pt-2 text-sm focus:outline-none'
                  disabled={stage !== 'compose'}
                />

                <div className='px-4 pb-4 flex justify-end'>
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

            <div className='p-6 md:p-8 bg-muted/20'>
              <div className='flex items-center gap-2 text-sm font-medium mb-4'>
                <MessageSquareText className='w-4 h-4' /> Agent Activity
              </div>

              <div className='rounded-2xl border bg-background p-4 min-h-[260px] max-h-[360px] overflow-auto space-y-3'>
                {thinkingFeed.length === 0 && (
                  <p className='text-sm text-muted-foreground'>
                    No activity yet. Submit your request to start planning.
                  </p>
                )}
                {thinkingFeed.map((line, idx) => (
                  <div key={`${line}-${idx}`} className='text-sm leading-relaxed border-l-2 border-primary/30 pl-3'>
                    {line}
                  </div>
                ))}
              </div>

              {stage === 'question' && activeQuestion && (
                <div className='mt-5 rounded-2xl border bg-background p-4 space-y-3'>
                  <p className='text-sm font-medium'>{activeQuestion.questionText}</p>

                  {activeQuestion.options?.length > 0 && (
                    <div className='flex flex-wrap gap-2'>
                      {activeQuestion.options.map(option => (
                        <button
                          key={option}
                          onClick={() => setSelectedAnswer(option)}
                          className={`px-3 py-1.5 text-xs rounded-full border transition ${selectedAnswer === option ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeQuestion.allowCustomEntry && (
                    <textarea
                      value={customAnswer}
                      onChange={e => setCustomAnswer(e.target.value)}
                      placeholder='Or type your answer...'
                      className='w-full min-h-[80px] resize-none bg-background border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
                    />
                  )}

                  <Button onClick={handleContinuePlanning} disabled={!answerInput || isSubmitting} className='w-full'>
                    <span className='inline-flex items-center gap-2'>
                      Continue planning <ChevronRight className='w-4 h-4' />
                    </span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default VideoIntentComposer
