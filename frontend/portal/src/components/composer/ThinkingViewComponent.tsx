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

  const typingIndexRef = useRef(0)
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const setBusy = (busy: boolean) => {
    setIsThinkingBusy(busy)
    onBusyChange?.(busy)
  }

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

    const prev = lastThinkingChunkRef.current

    // New thought detected → reset typing
    if (prev && !normalized.startsWith(prev)) {
      clearTyping()
    }

    lastThinkingChunkRef.current = normalized
    latestTargetRef.current = normalized
    setBusy(true)
    ensureTypingLoop()
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
          maxHeight: '4.2rem',       // 3 lines
          overflowY: 'auto',
          scrollbarWidth: 'none',    // Firefox
          msOverflowStyle: 'none'    // IE/Edge
        }}
      >
        <style>
          {`
      div::-webkit-scrollbar {
        display: none;
      }
    `}
        </style>
        {typedText}
      </div>

      {isSubmitting && (
        <span className='text-xs opacity-50 tabular-nums'>{thinkingDots}</span>
      )}
    </div>
  )
}

export default ThinkingViewComponent