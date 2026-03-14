import { AnimationSlideContent, Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import React, { useEffect, useMemo, useState } from 'react'

import { AbsoluteFill, continueRender, delayRender, useRemotionEnvironment } from 'remotion'
import {
  ThemeProvider,
  AspectPresetProvider,
  StyleContextProvider,
  SpeedFactorProvider,
  PatchContextProvider,
  defaultTheme,
  resolveStyle,
  type AspectPreset,
  type PatchOverlay,
} from '@coasterai/animation'

import { compileRemoteComponent } from '../compiler'
import { AnimatedBackground } from '../effects/AnimatedBackground'
import { backgroundStyleToCSS } from '../backgroundUtils'

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
export type TemplateConfig = Record<string, unknown>

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

  // Build AspectPreset from slide dimensions
  const aspectPreset = useMemo<AspectPreset>(() => ({
    id: 'slide',
    width,
    height,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  }), [width, height])

  // Style preset — could come from slide data in the future
  const styleConfig = useMemo(() => resolveStyle('clean'), [])
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
    }
  }, [templateUrl])

  useEffect(() => {
    if (!templateUrl) return

    let disposed = false
    setCompiledComponent(null)
    setIsLoading(true)
    setTemplateError(null)

      ; (async () => {
        try {
          const response = await fetch(templateUrl, { cache: 'no-store' })
          if (!response.ok) {
            throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`)
          }
          const code = await response.text()

          const result = compileRemoteComponent(code)
          if (result.error) {
            console.error(`Failed to compile template "${templateUrl}": ${result.error}`)
            if (!disposed) {
              setCompiledComponent(null)
              setTemplateError(`Compilation failed: ${result.error}`)
            }
          } else {
            if (!disposed) {
              setCompiledComponent(() => result.Component)
              setTemplateError(null)
            }
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
            setTemplateError(
              `Failed to load template: ${error instanceof Error ? error.message : String(error)}`
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
      <AnimatedBackground width={width} height={height} />
      <div style={{ width: '100%', height: '100%' }}>
        {isLoading ? (
          <TemplateLoadingPlaceholder />
        ) : CompiledComponent ? (
          <ThemeProvider theme={defaultTheme}>
            <AspectPresetProvider preset={aspectPreset}>
              <StyleContextProvider style={styleConfig}>
                <SpeedFactorProvider factor={slide.settledFrame / slide.durationInFrames}>
                  <PatchContextProvider overlay={patchOverlay}>
                    <CompiledComponent />
                  </PatchContextProvider>
                </SpeedFactorProvider>
              </StyleContextProvider>
            </AspectPresetProvider>
          </ThemeProvider>
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
