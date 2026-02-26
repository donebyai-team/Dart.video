import { Slide } from "@coasterai/pb/coasterai/core/v1/slide_pb"
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { TypewriterAnimation, WordRevealAnimation, LetterCascadeAnimation, ScaleBounceAnimation, BlurInAnimation } from "../TextAnimations"

// Template-based renderer (driven by slide.content.template_id and template_config)
export const TemplateRendrer: React.FC<{
    slide: Slide
    templateId: string
    templateConfig: any
    width: number
}> = ({ slide, templateId, templateConfig, width }) => {

    const frame = useCurrentFrame()
    const { fps, durationInFrames } = useVideoConfig()

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
        height: '100%',
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