'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useClientsContext } from '@coasterai/ui-core/context/ClientContext'
import { Mic2, Play, RefreshCw, Sparkles, X } from 'lucide-react'
import type { Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { Button } from '@/components/ui/button'
import { PauseAwareTextarea } from '@/components/editor/settings/voiceover/PauseAwareTextarea'
import { cn } from '@/lib/utils'
import { useVideoStore } from '@/stores/video'
import { getConnectError } from '@/utils/error'
import toast from 'react-hot-toast'

interface VoiceOverSettingsProps {
  onClose?: () => void
  onPlayPreview?: (slideId: string) => void
}

const DEFAULT_VOICE_ID = 'Puck'

const voiceoverToEditorText = (slide: Slide) => {
  const voiceover = slide.voiceover

  if (!voiceover) return ''

  if (voiceover.fullText?.trim()) {
    return voiceover.fullText.replace(/@(\d+)@/g, (_match, ms) => {
      const display = `${(Number(ms) / 1000).toFixed(Number(ms) % 1000 === 0 ? 0 : 1)}s`
      return `/[${display}](${ms})`
    })
  }

  return voiceover.segments
    .map(segment => segment.text.trim())
    .filter(Boolean)
    .join(' ')
}

const editorTextToVoiceoverText = (text: string) => text.replace(/\/\[[^\]]+\]\((\d+)\)/g, '@$1@')

const hasGeneratedVoiceover = (slide: Slide) => Boolean(slide.voiceover?.segments?.some(segment => segment.asset))

const getVoiceoverDurationInFrames = (slide: Pick<Slide, 'voiceover'>) =>
  slide.voiceover?.segments.reduce(
    (maxEndFrame, segment) => Math.max(maxEndFrame, Math.round(segment.endFrame)),
    0
  ) ?? 0

export const VoiceOverSettings = ({ onClose, onPlayPreview }: VoiceOverSettingsProps) => {
  const { portalClient } = useClientsContext()
  const videoConfig = useVideoStore(s => s.videoConfig)
  const selectedSlide = useVideoStore(s => s.selectedSlide)
  const setSelectedSlideById = useVideoStore(s => s.setSelectedSlideById)
  const updateSlideById = useVideoStore(s => s.updateSlideById)
  const setBackgroundMusicVolume = useVideoStore(s => s.setBackgroundMusicVolume)

  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [generatingBySlide, setGeneratingBySlide] = useState<Record<string, boolean>>({})

  const slides = useMemo(
    () => videoConfig?.config?.sections?.flatMap(section => section.slides ?? []) ?? [],
    [videoConfig]
  )
  const isAnyGenerating = useMemo(
    () => Object.values(generatingBySlide).some(Boolean),
    [generatingBySlide]
  )
  const slidesMissingVoiceover = useMemo(
    () => slides.filter(slide => !hasGeneratedVoiceover(slide)),
    [slides]
  )

  useEffect(() => {
    setDrafts(currentDrafts => {
      const nextDrafts: Record<string, string> = {}

      slides.forEach(slide => {
        nextDrafts[slide.id] = currentDrafts[slide.id] ?? voiceoverToEditorText(slide)
      })

      return nextDrafts
    })
  }, [slides])

  const handleDraftChange = useCallback((slideId: string, value: string) => {
    setDrafts(currentDrafts => ({
      ...currentDrafts,
      [slideId]: value,
    }))
  }, [])

  const handleGenerateVoiceover = useCallback(async (slide: Slide) => {
    if (!portalClient || !videoConfig?.id) return false

    const editorText = (drafts[slide.id] ?? '').trim()
    if (!editorText) {
      toast.error('Please enter voiceover text first')
      return false
    }

    const voiceId = slide.voiceover?.voiceId || DEFAULT_VOICE_ID
    const text = editorTextToVoiceoverText(editorText)

    try {
      setGeneratingBySlide(current => ({
        ...current,
        [slide.id]: true,
      }))

      const voiceover = await portalClient.generateVoiceover({
        voiceId,
        text,
        videoId: videoConfig.id,
        slideId: slide.id,
      })

      const nextDurationInFrames = Math.max(
        Math.round(slide.durationInFrames),
        getVoiceoverDurationInFrames({ voiceover })
      )

      updateSlideById(slide.id, {
        voiceover,
        durationInFrames: nextDurationInFrames,
      })
      setDrafts(currentDrafts => ({
        ...currentDrafts,
        [slide.id]: voiceoverToEditorText({ ...slide, voiceover }),
      }))

      const currentBackgroundMusicUrl =
        videoConfig.metadata?.bgAudio?.url ?? videoConfig.metadata?.backgroundAudioUrl
      const currentBackgroundMusicVolume = videoConfig.metadata?.bgAudio?.volume ?? (
        currentBackgroundMusicUrl ? 0.8 : undefined
      )

      if (currentBackgroundMusicUrl && (currentBackgroundMusicVolume ?? 0) > 0.1) {
        setBackgroundMusicVolume(0.1)
        toast.success('Background music volume reduced, adjust if needed')
      }

      return true
    } catch (error) {
      console.error('Failed to generate voiceover', error)
      toast.error(getConnectError(error))
      return false
    } finally {
      setGeneratingBySlide(current => ({
        ...current,
        [slide.id]: false,
      }))
    }
  }, [drafts, portalClient, setBackgroundMusicVolume, updateSlideById, videoConfig])

  const handleGenerateAllVoiceovers = useCallback(async () => {
    if (!slidesMissingVoiceover.length || isAnyGenerating) return

    let generatedCount = 0

    for (const slide of slidesMissingVoiceover) {
      const editorText = (drafts[slide.id] ?? '').trim()

      if (!editorText) continue

      const generated = await handleGenerateVoiceover(slide)

      if (generated) {
        generatedCount += 1
      }
    }       
  }, [drafts, handleGenerateVoiceover, isAnyGenerating, slidesMissingVoiceover])

  return (
    <div className='flex h-full flex-col gap-3 p-4'>
      <div className='flex items-center justify-between'>
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
  <ul className="list-disc pl-4 space-y-1">
    <li>
      Type <span className="font-medium">'/'</span> to insert pauses and sync
      the voiceover with the visuals.
    </li>
    <li>
      Regenerate the voiceover after changing the text or pauses.
    </li>
  </ul>
</div>
        {onClose && (
          <Button variant='ghost' size='sm' className='h-6 w-6 p-0' onClick={onClose}>
            <X className='h-4 w-4' />
          </Button>
        )}
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto pr-1 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
        <div className='space-y-4'>
          {slides.map(slide => {
            const draft = drafts[slide.id] ?? ''
            const isActiveSlide = selectedSlide?.id === slide.id
            const isGenerating = Boolean(generatingBySlide[slide.id])
            const isGenerated = hasGeneratedVoiceover(slide)
            const voiceId = slide.voiceover?.voiceId || DEFAULT_VOICE_ID
            const hasPlayableVoiceover = Boolean(slide.voiceover?.segments?.some(segment => segment.asset?.url))

            return (
              <div key={slide.id} className='relative w-full space-y-2' onClick={() => setSelectedSlideById(slide.id)}>
                <div className='pointer-events-none absolute inset-x-3 top-3 z-10 flex items-center justify-between gap-3'>
                  <div className='inline-flex h-7 max-w-[60%] items-center gap-1.5 overflow-hidden rounded-md border border-border/70 bg-background/90 px-2.5 text-[11px] font-medium text-foreground backdrop-blur-sm'>
                    <Mic2 className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
                    <span className='truncate'>{voiceId}</span>
                  </div>

                  <div className='pointer-events-auto flex items-center gap-1.5'>
                    {hasPlayableVoiceover && (
                        <Button
                          type='button'
                          size='icon'
                          variant='secondary'
                          className='h-7 w-7 rounded-md border border-border/70 bg-background/90 backdrop-blur-sm'
                          onClick={event => {
                            event.stopPropagation()
                            onPlayPreview?.(slide.id)
                          }}
                          disabled={!onPlayPreview}
                          title='Play voiceover'
                          aria-label='Play voiceover'
                        >
                          <Play className='h-3.5 w-3.5' />
                        </Button>
                    )}

                    <Button
                      type='button'
                      size='icon'
                      variant='secondary'
                      className='h-7 w-7 rounded-md border border-border/70 bg-background/90 backdrop-blur-sm'
                      onClick={event => {
                        event.stopPropagation()
                        void handleGenerateVoiceover(slide)
                      }}
                      disabled={!portalClient || isGenerating}
                      title={isGenerated ? 'Regenerate voiceover' : 'Generate voiceover'}
                      aria-label={isGenerated ? 'Regenerate voiceover' : 'Generate voiceover'}
                    >
                      {isGenerating ? (
                        <RefreshCw className='h-3.5 w-3.5 animate-spin' />
                      ) : isGenerated ? (
                        <RefreshCw className='h-3.5 w-3.5' />
                      ) : (
                        <Sparkles className='h-3.5 w-3.5' />
                      )}
                    </Button>
                  </div>
                </div>

                <PauseAwareTextarea
                  value={draft}
                  onChange={nextValue => handleDraftChange(slide.id, nextValue)}
                  onFocus={() => setSelectedSlideById(slide.id)}
                  onClick={() => setSelectedSlideById(slide.id)}
                  placeholder='Write narration...'
                  className={cn(
                    isActiveSlide
                      ? 'border-primary/80 bg-primary/[0.03]'
                      : 'border-border/70 hover:border-primary/30'
                  )}
                />
              </div>
            )
          })}

          {slides.length === 0 && (
            <div className='rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground'>
              No slides available for voiceover.
            </div>
          )}
        </div>
      </div>

      <div className='shrink-0 border-t border-border bg-background pt-3'>
        <Button
          type='button'
          className='w-full'
          onClick={() => void handleGenerateAllVoiceovers()}
          disabled={!portalClient || isAnyGenerating || slidesMissingVoiceover.length === 0}
        >
          {isAnyGenerating ? (
            <>
              <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className='mr-2 h-4 w-4' />
              Generate all
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
