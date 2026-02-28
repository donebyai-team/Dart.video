import { AnimationSlideContent, MetaData, Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import React, { useEffect, useState } from 'react'

import { AbsoluteFill, continueRender, delayRender } from 'remotion'
import { compileRemoteComponent } from '../compiler'
import { TemplateContainer } from '../components/TemplateContainer'
import { AnimatedBackground } from '../effects/AnimatedBackground'
import { TemplateRendrer } from '../components/TemplateRenderer'
import { backgroundStyleToCSS } from '../backgroundUtils'

interface TextAnimationSlideProps {
  slide: Slide
  width: number
  height: number
  isEditing?: boolean
  isSelected?: boolean
  onUpdate?: (updates: Partial<Slide>) => void
  onSelect?: () => void
}
export type TemplateConfig = Record<string, string | number | boolean | object>

// Cache fetched + compiled components by URL to avoid re-fetching on re-renders
const compiledComponentCache = new Map<string, React.ComponentType<any> | null>()

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
  const [editing, setEditing] = useState<boolean>(isEditing)

  const content = slide.content.value as AnimationSlideContent
  // template id for hard-coded local templates
  const localTemplateId = content?.templateId

  // URL to fetch LLM-generated TSX source from
  const templateUrl = content?.templateUrl
  const templateMeta = (content?.meta as MetaData) || {}
  const templateConfig = (content?.templateConfig ?? {}) as TemplateConfig

  const background = backgroundStyleToCSS(slide.backgroundStyle)


  // 🚀 LOCAL TEMPLATE SHORT-CIRCUIT
  if (!templateUrl && localTemplateId) {
    return (
      <AbsoluteFill
        onMouseDown={() => setEditing(true)}
        style={{
          background,
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <AnimatedBackground width={width} height={height} />

        <TemplateContainer
          setEditing={setEditing}
          x={templateMeta.x as number}
          y={templateMeta.y as number}
          width={templateMeta.width as number}
          height={templateMeta.height as number}
          canvasWidth={width}
          canvasHeight={height}
          isEditing={editing}
          isSelected={isSelected}
          onSelect={onSelect}
          onUpdate={updates => {
            if (onUpdate && content) {
              onUpdate({
                ...slide,
                content: {
                  case: 'animation',
                  value: {
                    ...content,
                    meta: {
                      ...templateMeta,
                      ...updates
                    }
                  }
                }
              } as Slide)
            }
          }}
        >
          <TemplateRendrer
            slide={slide}
            templateId={localTemplateId}
            templateConfig={templateConfig}
            width={templateMeta.width || width * 0.8}
          />
        </TemplateContainer>
      </AbsoluteFill>
    )
  }

  const [renderHandle] = useState(() => {
    if (!templateUrl) return null
    return delayRender(`Loading remote template: ${templateUrl}`)
  })

  useEffect(() => {
    if (!templateUrl) return

    // Return cached compiled component immediately if available
    if (compiledComponentCache.has(templateUrl)) {
      setCompiledComponent(compiledComponentCache.get(templateUrl) ?? null)
      setIsLoading(false)
      if (renderHandle) continueRender(renderHandle)
      return
    }

    let disposed = false
    setCompiledComponent(null)
    setIsLoading(true)

    ;(async () => {
      try {
        const response = await fetch(templateUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`)
        }
        const code = await response.text()

        const result = compileRemoteComponent(code)
        if (result.error) {
          console.error(`Failed to compile template "${templateUrl}": ${result.error}`)
          compiledComponentCache.set(templateUrl, null)
          if (!disposed) {
            setCompiledComponent(null)
          }
        } else {
          compiledComponentCache.set(templateUrl, result.Component)
          if (!disposed) {
            setCompiledComponent(() => result.Component)
          }
        }
      } catch (error) {
        console.error(`Failed to load template "${templateUrl}"`, error)
        compiledComponentCache.set(templateUrl, null)
        if (!disposed) {
          setCompiledComponent(null)
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

  return (
    <AbsoluteFill
      onMouseDown={() => setEditing(true)}
      style={{
        background,
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <AnimatedBackground width={width} height={height} />

      <TemplateContainer
        setEditing={setEditing}
        x={templateMeta.x as number}
        y={templateMeta.y as number}
        width={templateMeta.width as number}
        height={templateMeta.height as number}
        canvasWidth={width}
        canvasHeight={height}
        isEditing={editing}
        isSelected={isSelected}
        onUpdate={updates => {
          if (onUpdate && content) {
            onUpdate({
              ...slide,
              content: {
                case: 'animation',
                value: {
                  ...content,
                  meta: {
                    ...templateMeta,
                    ...updates
                  }
                }
              }
            } as Slide)
          }
        }}
      >
        <div style={{ width: '100%', height: '100%' }}>
          {isLoading ? (
            <TemplateLoadingPlaceholder />
          ) : CompiledComponent ? (
            <CompiledComponent
              onChange={(props: any) => {
                if (onUpdate && props) {
                  onUpdate({
                    ...slide,
                    content: {
                      case: 'animation',
                      value: {
                        ...content,
                        templateConfig: {
                          ...templateConfig,
                          ...props
                        }
                      }
                    }
                  } as Slide)
                }
              }}
              props={templateConfig}
            />
          ) : null}
        </div>
      </TemplateContainer>
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

export default AnimationSlide
