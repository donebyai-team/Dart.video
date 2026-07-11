import { Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import React, { useEffect, useState } from 'react'

import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion'
import {
  PatchContextProvider,
  type PatchOverlay,
} from '@coasterai/animation'

import { compileRemoteComponent } from '../compiler'
import { backgroundStyleToCSS } from '../backgroundUtils'
import { loadPreparedTemplateSource } from '../templateSource'
import { CanvasEffectsLayer } from '../effects/CanvasEffectsLayer'

const compiledTemplateCache = new Map<string, React.ComponentType<any>>()
const compiledTemplatePromiseCache = new Map<string, Promise<React.ComponentType<any>>>()

async function loadCompiledTemplate(
  cacheKey: string,
  templateSourceKey: string,
  defaults?: unknown,
  inlineCode?: string
): Promise<React.ComponentType<any>> {
  const cached = compiledTemplateCache.get(cacheKey)
  if (cached) return cached

  const inFlight = compiledTemplatePromiseCache.get(cacheKey)
  if (inFlight) return inFlight

  const promise = (async () => {
    const code = await loadPreparedTemplateSource({
      templateUrl: inlineCode?.trim() ? undefined : templateSourceKey,
      defaults,
      inlineCode,
    })

    const result = compileRemoteComponent(code)

    if (result.error || !result.Component) {
      throw new Error(
        `Compilation failed: ${result.error ?? 'Unknown compilation error'}`
      )
    }

    compiledTemplateCache.set(cacheKey, result.Component)
    compiledTemplatePromiseCache.delete(cacheKey)

    return result.Component
  })().catch((error) => {
    compiledTemplatePromiseCache.delete(cacheKey)
    throw error
  })

  compiledTemplatePromiseCache.set(cacheKey, promise)

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
  isPlaying?: boolean
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
  isPlaying = true,
}) => {
  const [CompiledComponent, setCompiledComponent] = React.useState<React.ComponentType<any> | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [templateError, setTemplateError] = useState<string | null>(null)

  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const content = slide.content
  const defaults = content?.codeRegistry?.defaults

  // URL to fetch LLM-generated TSX source from
  const inlineCode = content?.codeRegistry?.code
  const hasInlineCode = inlineCode?.trim().length
  const templateUrl = content?.codeRegistry?.mUrl
  const defaultsKey = React.useMemo(() => JSON.stringify(defaults) ?? 'null', [defaults])

  // Unique cache key
  const templateKey = React.useMemo(() => {
    if (hasInlineCode) {
      return `inline:${hashString(inlineCode)}`;
    }

    if (templateUrl) {
      return `${templateUrl}::${hashString(defaultsKey)}`
    }

    return templateUrl ?? null;
  }, [defaultsKey, hasInlineCode, inlineCode, templateUrl]);

  const background = backgroundStyleToCSS(slide.backgroundStyle)


  const [renderHandle] = useState(() => {
    if (!templateKey) return null
    return delayRender(`Loading remote template: ${templateKey}`)
  })

  useEffect(() => {
    if (!templateKey) {
      setIsLoading(false)
      setCompiledComponent(null)
      setTemplateError(null)
      return
    }

    const cached = compiledTemplateCache.get(templateKey)

    if (cached) {
      setCompiledComponent(() => cached)
      setIsLoading(false)
      setTemplateError(null)
    }
  }, [templateKey])

  function hashString(str: string): string {
    let hash = 2166136261;

    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(36);
  }

  const handleTemplateRenderError = React.useCallback((error: Error) => {
    setCompiledComponent(null)
    setTemplateError(`Template render failed: ${error.message}`)
    console.log("Template render error:", error)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!templateKey) return

    let disposed = false

    const cached = compiledTemplateCache.get(templateKey)

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
          const component = await loadCompiledTemplate(
            templateKey,
            templateUrl ?? templateKey,
            defaults,
            inlineCode
          )

          if (!disposed) {
            setCompiledComponent(() => component)
            setTemplateError(null)
          }
        } catch (error) {
          if (!hasInlineCode && error instanceof TypeError) {
            console.warn(
              `Failed to load template "${templateUrl}" (network/CORS/blocked request)`,
              {
                message: error.message,
                templateUrlJson: JSON.stringify(templateUrl),
                length: templateUrl?.length
              }
            )
          } else {
            const message =
              error instanceof Error ? error.message : String(error)

            console.warn(
              `Failed to compile template "${templateKey}": ${message}`
            )
          }

          if (!disposed) {
            setCompiledComponent(null)

            const message =
              error instanceof Error ? error.message : String(error)

            setTemplateError(
              message.startsWith('Compilation failed:')
                ? message
                : `Failed to load template: ${message}`
            )
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
  }, [templateKey, hasInlineCode, inlineCode, templateUrl, defaults, renderHandle])

  // PatchOverlay — read from window (set by useAnimationEdit in editor)
  // or fall back to persisted edits (during Remotion rendering).
  // No useMemo — must re-read on every render to pick up live edits.
  // const patchOverlay: PatchOverlay =
  //   content?.edits ?? {}) as unknown as PatchOverlay 

  return (
    <AbsoluteFill
      style={{
        background,
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <CanvasEffectsLayer
        zooms={slide.zooms ?? []}
        spotlights={slide.spotlights ?? []}
        callouts={slide.callouts ?? []}
        frame={frame}
        fps={fps}
        width={width}
        height={height}
        slideDurationInFrames={slide.durationInFrames}
        isPlaying={isPlaying}
      >
        <div style={{ width: '100%', height: '100%' }}>
          {isLoading ? (
            <TemplateLoadingPlaceholder />
          ) : CompiledComponent ? (
            <PatchContextProvider overlay={content?.edits as PatchOverlay}>
              <CompiledComponent {...defaults} __onTemplateRuntimeError={handleTemplateRenderError} />
            </PatchContextProvider>
          ) : templateError ? (
            <TemplateErrorFallback message={templateError} />
          ) : null}
        </div>
      </CanvasEffectsLayer>
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
      <div style={{ fontSize: 64, fontWeight: 700, marginBottom: 8 }}>
        Failed to Render
      </div>
    </div>
  </div>
)

export default AnimationSlide
