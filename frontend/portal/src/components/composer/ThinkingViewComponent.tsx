'use client'

import { useEffect, useRef, useState } from 'react'
import { CircleDashed } from 'lucide-react'

type ThinkingViewComponentProps = {
  enabled: boolean
  isSubmitting: boolean
  thinkingChunk?: string
  resetSignal: number
  onBusyChange?: (busy: boolean) => void
}

const ThinkingViewComponent = ({
  enabled,
  isSubmitting,
  thinkingChunk,
  resetSignal,
  onBusyChange
}: ThinkingViewComponentProps) => {

  const [typedText, setTypedText] = useState('')
  const [thinkingDots, setThinkingDots] = useState('')
  const [isThinkingBusy, setIsThinkingBusy] = useState(false)

  const thinkingContainerRef = useRef<HTMLDivElement | null>(null)

  const latestTargetRef = useRef('')
  const lastThinkingChunkRef = useRef('')
  const [showShimmer, setShowShimmer] = useState(false)

  const typingIndexRef = useRef(0)
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const setBusy = (busy: boolean) => {
    setIsThinkingBusy(busy)
    onBusyChange?.(busy)
  }

  const NON_TYPED_STATES = [
    'Generating...',
    'Matching...',
    'Extracting...',
    'Searching...',
    'Processing...',
    'Starting planning...',
    // Retry tones
    "Refining the motion...",
    "Polishing the animation...",
    "Adding final touches...",
    "Stabilizing the performance...",

    // Creative stages
    "Understanding the scene...",
    "Crafting motion direction...",
    "Designing the animation...",
    "Translating motion into code...",
    "Saving creative draft...",
    "Bringing animation to life...",
    "Smoothing out rough edges...",
    "Animation ready ✨",
    "Working on it..."
  ]

  const clearTyping = () => {
    typingIndexRef.current = 0
    latestTargetRef.current = ''
    lastThinkingChunkRef.current = ''
    setTypedText('')

    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current)
      typingTimerRef.current = null
    }
  }

  const ensureTypingLoop = () => {
    if (typingTimerRef.current) return

    typingTimerRef.current = setInterval(() => {
      const target = latestTargetRef.current
      const current = typingIndexRef.current

      if (!target || current >= target.length) return

      const remaining = target.length - current

      let step = 1
      if (remaining > 80) step = 4
      else if (remaining > 40) step = 2

      typingIndexRef.current += step
      setTypedText(target.slice(0, typingIndexRef.current))
    }, 40)
  }

  const enqueueThinking = (chunk: string) => {
    const normalized = chunk.replace(/\s+/g, ' ').trim()
    if (!normalized) return

    const isNonTyped = NON_TYPED_STATES.some(state =>
      normalized.toLowerCase().startsWith(state.toLowerCase())
    )

    const prev = lastThinkingChunkRef.current

    // New thought → reset typing
    if (prev && !normalized.startsWith(prev)) {
      clearTyping()
    }

    lastThinkingChunkRef.current = normalized
    latestTargetRef.current = normalized
    setBusy(true)

    if (isNonTyped) {
      // Stop typing loop
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current)
        typingTimerRef.current = null
      }

      latestTargetRef.current = normalized   // ⭐ REQUIRED
      typingIndexRef.current = normalized.length

      setShowShimmer(true)
      setTypedText(normalized)

      return   // ⭐ prevents typing restart
    } else {
      setShowShimmer(false)
      latestTargetRef.current = normalized
      ensureTypingLoop()
    }
  }

  useEffect(() => {
    if (!enabled || !thinkingChunk) return
    enqueueThinking(thinkingChunk)
  }, [thinkingChunk, enabled])

  useEffect(() => {
    const el = thinkingContainerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [typedText])

  useEffect(() => {
    if (!isSubmitting) {
      setThinkingDots('')
      return
    }

    const frames = ['.', '..', '...']
    let idx = 0

    const timer = setInterval(() => {
      setThinkingDots(frames[idx % frames.length])
      idx++
    }, 320)

    return () => clearInterval(timer)
  }, [isSubmitting])

  useEffect(() => {
    clearTyping()
  }, [resetSignal, enabled])

  useEffect(() => {
    return () => clearTyping()
  }, [])

  const hasThinking = typedText.trim().length > 0 || isThinkingBusy
  if (!enabled || !hasThinking) return null

  return (
    <div className='flex items-center gap-2.5 px-4 py-2.5 rounded-xl border bg-background/95 backdrop-blur-sm text-sm text-muted-foreground shadow-sm'>
      <CircleDashed className='w-3.5 h-3.5 animate-spin flex-shrink-0' />

      <div
        ref={thinkingContainerRef}
        className='flex-1 whitespace-pre-wrap break-words pr-1 leading-snug'
        style={{
          maxHeight: '4.0rem',       // 3 lines
          overflowY: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        <style>
          {`
      div::-webkit-scrollbar {
        display: none;
      }

      @keyframes thinkingShimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}
        </style>

        <span
          style={
            false
              ? {
                opacity: 0.75,
                background:
                  'linear-gradient(110deg, rgba(255,255,255,0.25) 20%, rgba(255,255,255,0.9) 40%, rgba(255,255,255,0.25) 60%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'rgba(255,255,255,0.35)',   // 👈 key fix
                animation: 'thinkingShimmer 2s linear infinite'
              }
              : {
                opacity: 0.65,
                color: 'inherit'
              }
          }
        >
          {typedText}
        </span>
      </div>

      {isSubmitting && (
        <span className='text-xs opacity-50 tabular-nums'>{thinkingDots}</span>
      )}
    </div>
  )
}

export default ThinkingViewComponent