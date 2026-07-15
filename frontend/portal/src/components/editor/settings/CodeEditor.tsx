'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, FileCode2 } from 'lucide-react'
import { loadPreparedTemplateSource } from '@coasterai/renderer'
import { useClientsContext } from '@coasterai/ui-core/context/ClientContext'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { useVideoStore } from '@/stores/video'
import { ActiveToolType } from '@/types/tools'
import { getConnectError } from '@/utils/error'

interface CodeEditorProps {
  onClose: () => void
}

export const CodeEditor = ({ onClose }: CodeEditorProps) => {
  const { portalClient } = useClientsContext()
  const selectedSlide = useVideoStore(s => s.selectedSlide)
  const activeTool = useVideoStore(s => s.activeTool)
  const handleCloseTool = useVideoStore(s => s.handleCloseTool)
  const updateSlideContent = useVideoStore(s => s.updateSlideContent)

  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const animationContent = useMemo(() => {
    return selectedSlide?.content
  }, [selectedSlide])

  const inlineCode = animationContent?.codeRegistry?.code ?? ''
  const hasInlineCode = inlineCode.trim().length > 0
  const templateUrl = animationContent?.codeRegistry?.mUrl?.trim() ?? ''
  const defaults = animationContent?.codeRegistry?.defaults
  const slideId = selectedSlide?.id ?? ''
  const defaultsKey = JSON.stringify(defaults) ?? 'null'

  const handleCodeChange = (nextCode: string) => {
    setCode(nextCode)

    updateSlideContent({
      codeRegistry: {
        ...animationContent?.codeRegistry,
        code: nextCode,
      },
    })
  }

  const handleSave = async () => {
    if (!slideId || !code.trim()) {
      return
    }

    try {
      setIsSaving(true)

      const codeRegistry = await portalClient.updateCode({
        slideId,
        code,
      })

      updateSlideContent({
        codeRegistry: {
          ...animationContent?.codeRegistry,
          mUrl: codeRegistry.mUrl,
          code: '',
          defaults: codeRegistry.defaults,
        },
      })

      toast.success('Code saved')
    } catch (saveError) {
      console.error('Failed to save code', saveError)
      toast.error(getConnectError(saveError))
    } finally {
      setIsSaving(false)
    }
  }

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

    if (!hasInlineCode && !templateUrl) {
      setCode('')
      setError(null)
      setIsLoading(false)
      return
    }

    if (hasInlineCode) {
      setCode(inlineCode)
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
    defaultsKey
  ])

  return (
    <div className='h-full flex flex-col bg-card'>
      <div className='flex items-center justify-between px-5 py-4 border-b border-border'>
        <div className='min-w-0'>
          <h3 className='font-semibold text-sm tracking-tight'>
            Code Editor
          </h3>      
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='secondary'
            size='sm'
            onClick={handleSave}
            disabled={isSaving || isLoading || !slideId || !code.trim()}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>

          <Button variant='ghost' size='icon' onClick={onClose}>
            <X className='w-4 h-4' />
          </Button>
        </div>
      </div>

      <div className='flex-1 min-h-0 overflow-hidden p-4'>
        <div className='h-full rounded-lg border border-border bg-slate-950 text-slate-100 overflow-hidden flex flex-col'>
          <div className='flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900/80'>
            <FileCode2 className='w-4 h-4 text-slate-400' />

            <span className='text-xs font-medium text-slate-300'>
              Generated animation.tsx
            </span>

            <span className='ml-auto text-[11px] uppercase tracking-wide text-slate-500'>
              Live preview
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
            ) : !hasInlineCode && !templateUrl ? (
              <div className='h-full flex items-center justify-center px-6 text-sm text-slate-400 text-center'>
                This animation slide does not have generated code yet.
              </div>
            ) : (
              <textarea
                value={code}
                onChange={event => handleCodeChange(event.target.value)}
                spellCheck={false}
                className='min-h-full h-full w-full resize-none border-0 bg-transparent p-4 text-[12px] leading-6 font-mono text-slate-100 outline-none'
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
