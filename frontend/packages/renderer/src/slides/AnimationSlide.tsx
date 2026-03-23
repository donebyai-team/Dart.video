import { AnimationSlideContent, Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import React, { useEffect, useState } from 'react'

import { AbsoluteFill, continueRender, delayRender, useRemotionEnvironment } from 'remotion'
import {
  SpeedFactorProvider,
  PatchContextProvider,
  type PatchOverlay,
} from '@coasterai/animation'

import { compileRemoteComponent } from '../compiler'
import { backgroundStyleToCSS } from '../backgroundUtils'

const compiledTemplateCache = new Map<string, React.ComponentType<any>>()
const compiledTemplatePromiseCache = new Map<string, Promise<React.ComponentType<any>>>()

async function loadCompiledTemplate(templateUrl: string): Promise<React.ComponentType<any>> {
  const cached = compiledTemplateCache.get(templateUrl)
  if (cached) return cached

  const inFlight = compiledTemplatePromiseCache.get(templateUrl)
  if (inFlight) return inFlight

  const promise = (async () => {
    const response = await fetch(templateUrl, { cache: 'force-cache' })
    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`)
    }

    const code = await response.text()
    const result = compileRemoteComponent(code)
    if (result.error || !result.Component) {
      throw new Error(`Compilation failed: ${result.error ?? 'Unknown compilation error'}`)
    }

    compiledTemplateCache.set(templateUrl, result.Component)
    compiledTemplatePromiseCache.delete(templateUrl)
    return result.Component
  })().catch((error) => {
    compiledTemplatePromiseCache.delete(templateUrl)
    throw error
  })

  compiledTemplatePromiseCache.set(templateUrl, promise)
  return promise
}

// While testing in local, just replace this with the component to test
// import { RemoteComponent as HardcodedShankTemplate } from '../../../templates/text-animation/Shank'

interface TextAnimationSlideProps {
  slide: Slide
  width: number
  height: number
  isEditing?: boolean
  isSelected?: boolean
  onUpdate?: (updates: Partial<Slide>) => void
  onSelect?: () => void
}

/**
 * AnimationSlide Component
 * Renders animation slides by fetching LLM-generated TSX source from templateUrl,
 * compiling it JIT at runtime, then rendering the RemoteComponent.
 * Falls back to local hard-coded templates when only templateId is present.
 */
export const AnimationSlide: React.FC<TextAnimationSlideProps> = ({
  slide,
  width,
  height,
  isEditing = false,
  isSelected = false,
  onUpdate,
  onSelect
}) => {
  const [CompiledComponent, setCompiledComponent] = React.useState<React.ComponentType<any> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [templateError, setTemplateError] = useState<string | null>(null)

  const { isRendering } = useRemotionEnvironment()
  const content = slide.content.value as AnimationSlideContent

  // template id for hard-coded local templates
  // const localTemplateId = content?.templateId

  // URL to fetch LLM-generated TSX source from
  const templateUrl = content?.codeRegistry?.tUrl

  const background = backgroundStyleToCSS(slide.backgroundStyle)


  const [renderHandle] = useState(() => {
    if (!templateUrl) return null
    return delayRender(`Loading remote template: ${templateUrl}`)
  })

  useEffect(() => {
    if (!templateUrl) {
      setIsLoading(false)
      setCompiledComponent(null)
      setTemplateError(null)
      return
    }

    const cached = compiledTemplateCache.get(templateUrl)
    if (cached) {
      setCompiledComponent(() => cached)
      setIsLoading(false)
      setTemplateError(null)
    }
  }, [templateUrl])

  useEffect(() => {
    if (!templateUrl) return

    let disposed = false
    const cached = compiledTemplateCache.get(templateUrl)
    if (cached) {
      setCompiledComponent(() => cached)
      setIsLoading(false)
      setTemplateError(null)
      if (renderHandle) continueRender(renderHandle)
      return () => {
        disposed = true
      }
    }

    setIsLoading(true)
    setTemplateError(null)

      ; (async () => {
        try {
          const component = await loadCompiledTemplate(templateUrl)
          if (!disposed) {
            setCompiledComponent(() => component)
            setTemplateError(null)
          }
        } catch (error) {
          if (error instanceof TypeError) {
            console.error(`Failed to load template "${templateUrl}" (network/CORS/blocked request)`, {
              error,
              templateUrlJson: JSON.stringify(templateUrl),
              length: templateUrl.length
            })
          } else {
            console.error(`Failed to load template "${templateUrl}"`, error)
          }
          if (!disposed) {
            setCompiledComponent(null)
            const message = error instanceof Error ? error.message : String(error)
            setTemplateError(message.startsWith('Compilation failed:')
              ? message
              : `Failed to load template: ${message}`)
          }
        } finally {
          if (!disposed) {
            setIsLoading(false)
            if (renderHandle) continueRender(renderHandle)
          }
        }
      })()

    return () => {
      disposed = true
    }
  }, [templateUrl])

  // PatchOverlay — read from window (set by useAnimationEdit in editor)
  // or fall back to persisted edits (during Remotion rendering).
  // No useMemo — must re-read on every render to pick up live edits.
  const patchOverlay: PatchOverlay =
    (typeof window !== 'undefined' && (window as any).__PATCH_OVERLAY__)
      ? (window as any).__PATCH_OVERLAY__ as PatchOverlay
      : (content?.edits ?? {}) as unknown as PatchOverlay

  return (
    <AbsoluteFill
      style={{
        background,
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div style={{ width: '100%', height: '100%' }}>
        {isLoading ? (
          <TemplateLoadingPlaceholder />
        ) : CompiledComponent ? (
          <SpeedFactorProvider factor={slide.speed ? slide.speed: 1}>
            <PatchContextProvider overlay={patchOverlay}>
              <CompiledComponent />
            </PatchContextProvider>
          </SpeedFactorProvider>
        ) : templateError ? (
          <TemplateErrorFallback message={templateError} />
        ) : null}
      </div>
    </AbsoluteFill>
  )
}

const TemplateLoadingPlaceholder: React.FC = () => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'rgba(255,255,255,0.4)',
      fontSize: 14,
      fontFamily: 'sans-serif'
    }}
  >
    Loading template…
  </div>
)

const TemplateErrorFallback: React.FC<{ message: string }> = ({ message }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      textAlign: 'center',
      color: '#fecaca',
      background: 'rgba(127, 29, 29, 0.22)',
      border: '1px solid rgba(248, 113, 113, 0.45)',
      borderRadius: 10,
      fontFamily: 'system-ui, sans-serif'
    }}
  >
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
        Template Compilation Failed
      </div>
      <div style={{ fontSize: 12, opacity: 0.95, wordBreak: 'break-word' }}>{message}</div>
    </div>
  </div>
)

export default AnimationSlide
