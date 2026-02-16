import { AnimationSlideContent, Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import React, { useState } from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import {
  FloatingShapes,
  GrowingBars,
  OrbitingDots,
  PulsingCircles,
  RotatingSquares
} from '../animations/VisualAnimationVariants'
import { TemplateContainer } from '../components/TemplateContainer'
import { AnimatedBackground } from '../effects/AnimatedBackground'
import { TemplateConfig } from './InfographicSlide'
import { backgroundStyleToCSS } from '../../settings/BackgroundSettings'

interface VisualAnimationSlideProps {
  slide: Slide
  width: number
  height: number
  isEditing?: boolean
  isSelected?: boolean
  onUpdate?: (updates: Partial<Slide>) => void
  onSelect?: () => void
}

/**
 * VisualAnimationSlide Component
 * Renders simple motion graphics (no text) with various geometric animations
 * Uses slide.content.template_id to determine which animation variant to render
 * Currently uses hash-based selection, but will be replaced with template_id lookup
 */
export const VisualAnimationSlide: React.FC<VisualAnimationSlideProps> = ({
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

  const content = slide.content.value as AnimationSlideContent
  const templateConfig = (content?.templateConfig ?? {}) as TemplateConfig
  const [editing, setEditing] = useState<boolean>(isEditing)

  // TODO: Use templateId to select animation variant
  // For now, use hash-based selection for backward compatibility
  const hash = slide.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const variant = hash % 5

  const background = backgroundStyleToCSS(slide.backgroundStyle);

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
        setEditing={setEditing}
        x={templateConfig.x as number}
        y={templateConfig.y as number}
        width={templateConfig.width as number}
        height={templateConfig.height as number}
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
                  templateConfig: {
                    ...templateConfig,
                    ...updates
                  }
                }
              }
            } as Slide)
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
            overflow: 'hidden'
          }}
        >
          {variant === 0 && <RotatingSquares frame={frame} durationInFrames={durationInFrames} />}
          {variant === 1 && <PulsingCircles frame={frame} fps={fps} />}
          {variant === 2 && <FloatingShapes frame={frame} durationInFrames={durationInFrames} />}
          {variant === 3 && <GrowingBars frame={frame} fps={fps} />}
          {variant === 4 && <OrbitingDots frame={frame} durationInFrames={durationInFrames} />}
        </div>
      </TemplateContainer>
    </AbsoluteFill>
  )
}

export default VisualAnimationSlide
