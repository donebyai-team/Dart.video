'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, FileCode2 } from 'lucide-react'
import { loadPreparedTemplateSource } from '@coasterai/renderer'

import { Button } from '@/components/ui/button'
import { useVideoStore } from '@/stores/video'
import { ActiveToolType } from '@/types/tools'

interface CodeEditorProps {
  onClose: () => void
}

export const CodeEditor = ({ onClose }: CodeEditorProps) => {
  const selectedSlide = useVideoStore(s => s.selectedSlide)
  const activeTool = useVideoStore(s => s.activeTool)
  const handleCloseTool = useVideoStore(s => s.handleCloseTool)

  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const animationContent = useMemo(() => {
    return selectedSlide?.content
  }, [selectedSlide])

  const inlineCode = animationContent?.codeRegistry?.code?.trim() ?? ''
  const templateUrl = animationContent?.codeRegistry?.mUrl?.trim() ?? ''
  const defaults = animationContent?.codeRegistry?.defaults
  const slideId = selectedSlide?.id ?? ''

  useEffect(() => {
    if (activeTool.type !== ActiveToolType.ANIMATION_CODE) return

    if (!selectedSlide || !animationContent) {
      handleCloseTool()
    }
  }, [activeTool.type, handleCloseTool, selectedSlide, animationContent])

  useEffect(() => {
    let cancelled = false

    if (!selectedSlide || !animationContent) {
      setCode('')
      setError(null)
      setIsLoading(false)
      return
    }

    if (!inlineCode && !templateUrl) {
      setCode('')
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    ;(async () => {
      try {
        const source = await loadPreparedTemplateSource({
          templateUrl,
          defaults,
          inlineCode,
        })

        if (!cancelled) {
          setCode(source)
        }
      } catch (loadError) {
        if (!cancelled) {
          setCode('')

          const message =
            loadError instanceof Error
              ? loadError.message
              : String(loadError)

          setError(
            message.startsWith('Failed to fetch template:')
              ? message
              : `Failed to load template: ${message}`
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    slideId,
    templateUrl,
    inlineCode,
    defaults,
    selectedSlide,
    animationContent
  ])

  return (
    <div className='h-full flex flex-col bg-card'>
      <div className='flex items-center justify-between px-5 py-4 border-b border-border'>
        <div className='min-w-0'>
          <h3 className='font-semibold text-sm tracking-tight'>
            Code Editor
          </h3>

          <p className='text-xs text-muted-foreground truncate'>
            {inlineCode
              ? 'Inline generated animation code'
              : templateUrl || 'No generated animation code available'}
          </p>
        </div>

        <Button variant='ghost' size='icon' onClick={onClose}>
          <X className='w-4 h-4' />
        </Button>
      </div>

      <div className='flex-1 min-h-0 overflow-hidden p-4'>
        <div className='h-full rounded-lg border border-border bg-slate-950 text-slate-100 overflow-hidden flex flex-col'>
          <div className='flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900/80'>
            <FileCode2 className='w-4 h-4 text-slate-400' />

            <span className='text-xs font-medium text-slate-300'>
              Generated animation.tsx
            </span>

            <span className='ml-auto text-[11px] uppercase tracking-wide text-slate-500'>
              Read only
            </span>
          </div>

          <div className='flex-1 min-h-0 overflow-auto'>
            {isLoading ? (
              <div className='h-full flex items-center justify-center px-6 text-sm text-slate-400'>
                Loading generated animation code...
              </div>
            ) : error ? (
              <div className='h-full flex items-center justify-center px-6 text-sm text-red-300 text-center'>
                {error}
              </div>
            ) : !inlineCode && !templateUrl ? (
              <div className='h-full flex items-center justify-center px-6 text-sm text-slate-400 text-center'>
                This animation slide does not have generated code yet.
              </div>
            ) : (
              <pre className='min-h-full p-4 text-[12px] leading-6 overflow-auto font-mono whitespace-pre-wrap break-words'>
                <code>{code}</code>
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
