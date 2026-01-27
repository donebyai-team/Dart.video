import React, { useEffect } from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { Slide } from '@/types/slides'
import {
  WordRevealAnimation,
  LetterCascadeAnimation,
  TypewriterAnimation,
  ScaleBounceAnimation,
  BlurInAnimation
} from '../animations/TextAnimations'
import { AnimatedBackground } from '../effects/AnimatedBackground'
import { TemplateContainer } from '../components/TemplateContainer'
import { templateRegistry } from '../../../../../packages/template-registery'

interface TextAnimationSlideProps {
  slide: Slide
  width: number
  height: number
  isEditing?: boolean
  isSelected?: boolean
  onUpdate?: (updates: Partial<Slide>) => void
  onSelect?: () => void
}

type TemplateModule = {
  RemoteComponent: React.ComponentType<any>
}
/**
 * TextAnimationSlide Component
 * Renders text animation slides with various animation styles and templates
 * Uses slide.content.template_id and slide.content.template_config for rendering
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
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const [RemoteComponent, setRemoteComponent] = React.useState<TemplateModule | null>(null)

  const content = slide.content as any
  const templateId = content?.template_id || 'text-reveal'
  const templateMeta = content?.meta || {}
  const templateConfig = content?.template_config || {}

  useEffect(() => {
    ;(async () => {
      const loader = templateRegistry[templateId as keyof typeof templateRegistry]
      console.log(loader, 'loadr')
      if (!loader) return

      const mod = await loader()
      setRemoteComponent(mod as TemplateModule)
    })()
  }, [templateId])

  // Use slide's background color or fall back to default
  const defaultGradients = [
    'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    'linear-gradient(135deg, #0d1b2a 0%, #1b263b 50%, #415a77 100%)',
    'linear-gradient(135deg, #2d1b4e 0%, #1a1a2e 100%)',
    'linear-gradient(135deg, #0c1821 0%, #1b2838 100%)'
  ]
  const bgIndex = slide.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const background = slide.backgroundColor || defaultGradients[bgIndex % defaultGradients.length]

  return (
    <AbsoluteFill
      style={{
        background,
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      {/* Animated background particles */}
      <AnimatedBackground width={width} height={height} />

      {/* Template content in container */}
      <TemplateContainer
        x={templateMeta.x}
        y={templateMeta.y}
        width={templateMeta.width}
        height={templateMeta.height}
        canvasWidth={width}
        canvasHeight={height}
        isEditing={isEditing}
        isSelected={isSelected}
        onUpdate={updates => {
          if (onUpdate && content) {
            onUpdate({
              content: {
                ...content,
                meta: {
                  ...templateMeta,
                  ...updates
                }
              }
            })
          }
        }}
        onSelect={onSelect}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40
          }}
        >
          {RemoteComponent ? (
            <RemoteComponent.RemoteComponent
              onChange={(props: any) => {
                if (onUpdate && props) {
                  onUpdate({
                    content: {
                      ...content,
                      template_config: {
                        ...templateConfig,
                        ...props
                      }
                    }
                  })
                }
              }}
              props={templateConfig}
            />
          ) : (
            <TemplateTextAnimationRenderer
              slide={slide}
              templateId={templateId}
              templateConfig={templateConfig}
              frame={frame}
              fps={fps}
              width={templateMeta.width || width * 0.8}
              durationInFrames={durationInFrames}
            />
          )}
        </div>
      </TemplateContainer>
    </AbsoluteFill>
  )
}

// Template-based renderer (driven by slide.content.template_id and template_config)
const TemplateTextAnimationRenderer: React.FC<{
  slide: Slide
  templateId: string
  templateConfig: any
  frame: number
  fps: number
  width: number
  durationInFrames: number
}> = ({ slide, templateId, templateConfig, frame, fps, width, durationInFrames }) => {
  const readNumber = (key: string, fallback: number) => {
    const v = templateConfig[key]
    if (typeof v === 'number') return v
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v)
    return fallback
  }

  const readString = (key: string, fallback: string) => {
    const v = templateConfig[key]
    return typeof v === 'string' ? v : fallback
  }

  const readBoolFromString = (key: string, fallback: boolean) => {
    const v = templateConfig[key]
    if (typeof v === 'boolean') return v
    if (typeof v === 'string') return v === 'true'
    return fallback
  }

  const centerStyle: Record<string | number, string | number> = {
    width: '100%',
    zIndex: 1,
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  switch (templateId) {
    case 'number-counter': {
      const startNumber = readNumber('startNumber', 0)
      const endNumber = readNumber('endNumber', 100)
      const prefix = readString('prefix', '')
      const suffix = readString('suffix', '')
      const fontSize = readNumber('fontSize', 120)
      const color = readString('color', '#ffffff')

      const t = interpolate(frame, [0, durationInFrames * 0.7], [startNumber, endNumber], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp'
      })

      return (
        <div style={centerStyle}>
          <span
            style={{
              fontSize: Math.min(fontSize, width * 0.3),
              fontWeight: 800,
              color,
              textShadow: '0 6px 40px rgba(0,0,0,0.35)'
            }}
          >
            {prefix}
            {Math.round(t)}
            {suffix}
          </span>
        </div>
      )
    }

    case 'countdown': {
      const startNumber = readNumber('startNumber', 10)
      const fontSize = readNumber('fontSize', 150)
      const color = readString('color', '#ffffff')

      const t = interpolate(frame, [0, durationInFrames * 0.9], [startNumber, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp'
      })

      return (
        <div style={centerStyle}>
          <span
            style={{
              fontSize: Math.min(fontSize, width * 0.35),
              fontWeight: 900,
              color,
              textShadow: '0 6px 40px rgba(0,0,0,0.35)'
            }}
          >
            {Math.max(0, Math.ceil(t))}
          </span>
        </div>
      )
    }

    case 'text-reveal': {
      const text = readString('text', slide.transcript || '')
      const direction = readString('direction', 'up')
      const fontSize = readNumber('fontSize', 72)
      const color = readString('color', '#ffffff')

      const anim = spring({ frame, fps, config: { damping: 16, stiffness: 120 } })
      const opacity = interpolate(anim, [0, 1], [0, 1])

      const distance = 60
      const offset = (axis: 'x' | 'y') => {
        if (axis === 'y') {
          if (direction === 'up') return interpolate(anim, [0, 1], [distance, 0])
          if (direction === 'down') return interpolate(anim, [0, 1], [-distance, 0])
          return 0
        }
        if (direction === 'left') return interpolate(anim, [0, 1], [distance, 0])
        if (direction === 'right') return interpolate(anim, [0, 1], [-distance, 0])
        return 0
      }

      return (
        <div style={centerStyle}>
          <span
            style={{
              display: 'inline-block',
              fontSize: Math.min(fontSize, width * 0.22),
              fontWeight: 800,
              color,
              opacity,
              transform: `translate(${offset('x')}px, ${offset('y')}px)`,
              textShadow: '0 6px 40px rgba(0,0,0,0.35)'
            }}
          >
            {text}
          </span>
        </div>
      )
    }

    case 'typewriter': {
      const text = readString('text', slide.transcript || '')
      const showCursor = readBoolFromString('showCursor', true)
      const fontSize = readNumber('fontSize', 56)
      const color = readString('color', '#22c55e')

      return (
        <TypewriterAnimation
          text={text}
          frame={frame}
          fps={fps}
          width={width}
          durationInFrames={durationInFrames}
          fontSize={fontSize}
          color={color}
          showCursor={showCursor}
        />
      )
    }

    case 'word-by-word': {
      const text = readString('text', slide.transcript || '')
      const fontSize = readNumber('fontSize', 64)
      const color = readString('color', '#ffffff')
      return <WordRevealAnimation text={text} frame={frame} fps={fps} width={width} fontSize={fontSize} color={color} />
    }

    case 'letter-cascade': {
      const text = readString('text', slide.transcript || '')
      const fontSize = readNumber('fontSize', 80)
      const color = readString('color', '#ffffff')
      return (
        <LetterCascadeAnimation text={text} frame={frame} fps={fps} width={width} fontSize={fontSize} color={color} />
      )
    }

    case 'scale-bounce': {
      const text = readString('text', slide.transcript || '')
      const fontSize = readNumber('fontSize', 96)
      const color = readString('color', '#ffffff')
      return (
        <ScaleBounceAnimation text={text} frame={frame} fps={fps} width={width} fontSize={fontSize} color={color} />
      )
    }

    case 'blur-in': {
      const text = readString('text', slide.transcript || '')
      const fontSize = readNumber('fontSize', 64)
      const color = readString('color', '#ffffff')
      return <BlurInAnimation text={text} frame={frame} fps={fps} width={width} fontSize={fontSize} color={color} />
    }

    case 'gradient-text': {
      const text = readString('text', slide.transcript || '')
      const colorStart = readString('colorStart', '#8b5cf6')
      const colorEnd = readString('colorEnd', '#ec4899')
      const fontSize = readNumber('fontSize', 96)

      const shift = interpolate(frame, [0, durationInFrames], [0, 100])

      return (
        <div style={centerStyle}>
          <span
            style={{
              display: 'inline-block',
              fontSize: Math.min(fontSize, width * 0.28),
              fontWeight: 900,
              backgroundImage: `linear-gradient(90deg, ${colorStart}, ${colorEnd}, ${colorStart})`,
              backgroundSize: '200% 200%',
              backgroundPosition: `${shift}% 50%`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 6px 40px rgba(0,0,0,0.25)'
            }}
          >
            {text}
          </span>
        </div>
      )
    }

    case 'split-text': {
      const text = readString('text', slide.transcript || '')
      const fontSize = readNumber('fontSize', 100)
      const color = readString('color', '#ffffff')

      const mid = Math.max(1, Math.floor(text.length / 2))
      const left = text.slice(0, mid)
      const right = text.slice(mid)

      const anim = spring({ frame, fps, config: { damping: 14, stiffness: 120 } })
      const spread = interpolate(anim, [0, 1], [80, 0])
      const opacity = interpolate(anim, [0, 1], [0, 1])

      return (
        <div style={{ ...centerStyle, display: 'flex', justifyContent: 'center', gap: 0, alignItems: 'center' }}>
          <span
            style={{
              fontSize: Math.min(fontSize, width * 0.3),
              fontWeight: 900,
              color,
              opacity,
              transform: `translateX(${-spread}px)`,
              textShadow: '0 6px 40px rgba(0,0,0,0.35)'
            }}
          >
            {left}
          </span>
          <span
            style={{
              fontSize: Math.min(fontSize, width * 0.3),
              fontWeight: 900,
              color,
              opacity,
              transform: `translateX(${spread}px)`,
              textShadow: '0 6px 40px rgba(0,0,0,0.35)'
            }}
          >
            {right}
          </span>
        </div>
      )
    }

    default:
      // Fallback to text-reveal if template not found
      const text = readString('text', slide.transcript || '')
      const fontSize = readNumber('fontSize', 72)
      const color = readString('color', '#ffffff')

      return (
        <div style={centerStyle}>
          <span
            style={{
              fontSize: Math.min(fontSize, width * 0.22),
              fontWeight: 800,
              color,
              textShadow: '0 6px 40px rgba(0,0,0,0.35)'
            }}
          >
            {text}
          </span>
        </div>
      )
  }
}

export default TextAnimationSlide
