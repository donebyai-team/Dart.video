import { AnimationSlideContent, MetaData, Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import React, { useEffect, useState } from 'react'

import * as ReactDOM from 'react-dom'
import * as ReactJsxRuntime from 'react/jsx-runtime'
import { AbsoluteFill, continueRender, delayRender } from 'remotion'
import * as Remotion from 'remotion'
import { resolveTemplateEntry, TemplateModule } from '../../../../../../packages/template-registery'
import { TemplateContainer } from '../components/TemplateContainer'
import { AnimatedBackground } from '../effects/AnimatedBackground'
import { TemplateConfig } from './InfographicSlide'
import { backgroundStyleToCSS } from '../../settings/BackgroundSettings'
import { TemplateRendrer } from '../animations/suggester/TemplateRenderer'

interface TextAnimationSlideProps {
  slide: Slide
  width: number
  height: number
  isEditing?: boolean
  isSelected?: boolean
  onUpdate?: (updates: Partial<Slide>) => void
  onSelect?: () => void
}

const templateLoadCache = new Map<string, Promise<TemplateModule>>()

const loadScriptTemplate = async (url: string, globalNames: string[]): Promise<TemplateModule> => {
  const cacheKey = `${url}::${globalNames.join(',')}`
  const cached = templateLoadCache.get(cacheKey)
  if (cached) return cached

  const loader = new Promise<TemplateModule>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('CDN template loading is only available in browser runtime'))
      return
    }

    ; (window as any).React = React
      ; (window as any).ReactDOM = ReactDOM
      ; (window as any).ReactJSXRuntime = ReactJsxRuntime
      ; (window as any).Remotion = Remotion

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[data-template-url="${url}"]`
    )

    const resolveFromWindow = () => {
      const moduleFromWindow = globalNames
        .map(globalName => (window as any)[globalName])
        .find(mod => mod?.RemoteComponent)
      if (!moduleFromWindow?.RemoteComponent) {
        reject(
          new Error(
            `Template globals [${globalNames.join(', ')}] are missing RemoteComponent`
          )
        )
        return
      }
      resolve(moduleFromWindow as TemplateModule)
    }

    if (existingScript) {
      if (globalNames.some(globalName => (window as any)[globalName]?.RemoteComponent)) {
        resolveFromWindow()
        return
      }
      existingScript.addEventListener('load', resolveFromWindow, { once: true })
      existingScript.addEventListener('error', () => reject(new Error(`Failed loading ${url}`)), {
        once: true
      })
      return
    }

    const script = document.createElement('script')
    script.src = url
    script.async = true
    script.dataset.templateUrl = url
    script.onload = resolveFromWindow
    script.onerror = () => reject(new Error(`Failed loading ${url}`))
    document.head.appendChild(script)
  })

  templateLoadCache.set(cacheKey, loader)
  return loader
}

/**
 * TextAnimationSlide Component
 * Renders text animation slides using remotely-loaded template components.
 * Uses delayRender/continueRender so Remotion waits for the async script load
 * before capturing any frames.
 */
export const TextAnimationSlide: React.FC<TextAnimationSlideProps> = ({
  slide,
  width,
  height,
  isEditing = false,
  isSelected = false,
  onUpdate,
  onSelect
}) => {
  const [RemoteComponent, setRemoteComponent] = React.useState<TemplateModule | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editing, setEditing] = useState<boolean>(isEditing)

  const content = slide.content.value as AnimationSlideContent
  // template id of the hard coded templates
  const localTemplateId = content?.templateId

  const templatePath = content?.templateUrl
  const templateMeta = (content?.meta as MetaData) || {}
  const templateConfig = (content?.templateConfig ?? {}) as TemplateConfig

  const background = backgroundStyleToCSS(slide.backgroundStyle)


  // 🚀 LOCAL TEMPLATE SHORT-CIRCUIT
  if (!templatePath && localTemplateId) {
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
    if (!templatePath) return null
    return delayRender(`Loading remote template: ${templatePath}`)
  })

  useEffect(() => {
    if (!templatePath) return

    let disposed = false
    setRemoteComponent(null)
    setIsLoading(true)

    const finish = (mod: TemplateModule | null) => {
      if (disposed) return
      setRemoteComponent(mod)
      setIsLoading(false)
      if (renderHandle) continueRender(renderHandle)
    }

      ; (async () => {
        const template = resolveTemplateEntry(templatePath)
        console.debug('[Resolved Template]', templatePath, template.cdn?.url, template)

        try {
          if (template.cdn?.url) {
            const mod = await loadScriptTemplate(template.cdn.url, template.cdn.globalNames)
            finish(mod)
            return
          }

          finish(null)
        } catch (error) {
          console.error(`Failed to load template "${templatePath}"`, error)

          if (template.local?.url) {
            try {
              const mod = await loadScriptTemplate(template.local.url, template.local.globalNames)
              finish(mod)
            } catch (fallbackError) {
              console.error(`Fallback local load failed for template "${templatePath}"`, fallbackError)
              finish(null)
            }
          } else {
            finish(null)
          }
        }
      })()

    return () => {
      disposed = true
    }
  }, [templatePath])

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
          ) : RemoteComponent ? (
            <RemoteComponent.RemoteComponent
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

export default TextAnimationSlide
