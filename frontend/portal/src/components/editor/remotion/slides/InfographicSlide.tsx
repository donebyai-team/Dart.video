import { AnimationSlideContent, Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import React, { useState } from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { AnimatedBarChart, AnimatedLineGraph, AnimatedPieChart } from '../animations/InfographicCharts'
import { TemplateContainer } from '../components/TemplateContainer'
import { AnimatedBackground } from '../effects/AnimatedBackground'

interface InfographicSlideProps {
  slide: Slide
  width: number
  height: number
  isEditing?: boolean
  isSelected?: boolean
  onUpdate?: (updates: Partial<Slide>) => void
  onSelect?: () => void
}

export type TemplateConfig = Record<string, string | number | boolean | object>

/**
 * InfographicSlide Component
 * Renders data visualization slides with various chart types
 * Uses slide.content.template_id to determine which chart type to render
 * Currently uses hash-based selection, but will be replaced with template_id lookup
 */
export const InfographicSlide: React.FC<InfographicSlideProps> = ({
  slide,
  width,
  height,
  isEditing = false,
  isSelected = false,
  onUpdate,
  onSelect
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const content = slide.content.value as AnimationSlideContent
  const templateConfig = (content?.templateConfig ?? {}) as TemplateConfig
  const [editing, setEditing] = useState<boolean>(isEditing)

  // TODO: Use templateId to select chart type
  // For now, use hash-based selection for backward compatibility
  const hash = slide.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const variant = hash % 3

  // Use slide's background color or fall back to default
  const background = slide.backgroundColor || 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'

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
            padding: 60
          }}
        >
          {variant === 0 && <AnimatedBarChart frame={frame} fps={fps} />}
          {variant === 1 && <AnimatedPieChart frame={frame} fps={fps} />}
          {variant === 2 && <AnimatedLineGraph frame={frame} fps={fps} />}
        </div>
      </TemplateContainer>
    </AbsoluteFill>
  )
}

export default InfographicSlide
