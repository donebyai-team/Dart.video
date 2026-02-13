import { useVideoStore } from '@/stores/video'
import { fromJson, JsonObject } from '@bufbuild/protobuf'
import { Slide, SlideType, TransitionType } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { VideoSchema } from '@coasterai/pb/coasterai/core/v1/video_pb'
import { linearTiming, TransitionSeries } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import React from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { getActualSlideDuration, TRANSITION_DURATION_SECONDS } from './frame_calculations'
import { ImageSlide, InfographicSlide, TextAnimationSlide, VideoSlide, VisualAnimationSlide } from './remotion/slides'

interface SlideshowProps {
  fps: number
  isEditing?: boolean
  onSelectTemplate?: (slideId: string) => void
  video?: JsonObject
}

// Main slide component router
const SlideComponent: React.FC<{
  slide: Slide
  width: number
  height: number
  isEditing?: boolean
  isSelected?: boolean
  selectedStackItemId?: string | null
  onSelect?: () => void
}> = ({ slide, width, height, isEditing = false, isSelected = false, onSelect }) => {
  const onUpdate = useVideoStore(s => s.updateSlide)
  switch (slide.type) {
    case SlideType.TEXT_ANIMATION:
      // Only render if content case matches or is undefined (for new slides)
      if (!slide.content?.case || slide.content.case === 'animation') {
        return (
          <TextAnimationSlide
            slide={slide}
            width={width}
            height={height}
            isEditing={isEditing}
            isSelected={isSelected}
            onSelect={onSelect}
            onUpdate={onUpdate}
          />
        )
      }
      break
    case SlideType.VISUAL_ANIMATION:
      if (!slide.content?.case || slide.content.case === 'animation') {
        return (
          <VisualAnimationSlide
            slide={slide}
            width={width}
            height={height}
            isEditing={isEditing}
            isSelected={isSelected}
            onSelect={onSelect}
            onUpdate={onUpdate}
          />
        )
      }
      break
    case SlideType.INFOGRAPHIC:
      if (!slide.content?.case || slide.content.case === 'animation') {
        return (
          <InfographicSlide
            slide={slide}
            width={width}
            height={height}
            isEditing={isEditing}
            isSelected={isSelected}
            onSelect={onSelect}
            onUpdate={onUpdate}
          />
        )
      }
      break
    case SlideType.VIDEO:
      if (!slide.content?.case || slide.content.case === 'video') {
        return <VideoSlide slide={slide} width={width} height={height} onUpdate={onUpdate} />
      }
      break
    case SlideType.IMAGE:
    default:
      if (!slide.content?.case || slide.content.case === 'image') {
        return <ImageSlide slide={slide} width={width} height={height} isEditing={isEditing} onUpdate={onUpdate} />
      }
      break
  }

  // Fallback for mismatched content - render a placeholder
  return (
    <AbsoluteFill
      style={{
        backgroundColor: slide.backgroundColor || '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: 18,
        opacity: 0.7
      }}
    >
      Content type mismatch: {slide.type} slide with {slide.content?.case || 'undefined'} content
    </AbsoluteFill>
  )
}

// Get transition presentation based on transition type
const getTransitionPresentation = (transitionType?: TransitionType) => {
  switch (transitionType) {
    case TransitionType.TRANSITION_FADE:
      return fade()
    case TransitionType.TRANSITION_SLIDE_LEFT:
      return slide({ direction: 'from-right' }) // Enter from right
    case TransitionType.TRANSITION_SLIDE_RIGHT:
      return slide({ direction: 'from-left' }) // Enter from left
    case TransitionType.TRANSITION_SLIDE_UP:
      return slide({ direction: 'from-bottom' }) // Enter from bottom
    default:
      return fade()
  }
}

/**
 * REMOTION TRANSITION CALCULATIONS (2026)
 * Based on TransitionSeries overlapping behavior:
 * - Slides overlap during transitions
 * - Total duration = Sum of slides - Sum of transitions
 * - Visual End = Last frame before transition starts
 * - Absolute End = Very last frame slide exists
 */

// Main slideshow composition using Remotion's TransitionSeries
export const Slideshow: React.FC<SlideshowProps> = ({ fps, isEditing = false, onSelectTemplate, video }) => {
  let videoConfig = useVideoStore(s => s.videoConfig)
  const selectedStackItemId = useVideoStore(s => s.selectedStackItemId)

  const selectedTemplateId = null

  const { width, height } = useVideoConfig()
  const videoProtoObject = video ? fromJson(VideoSchema, video) : undefined
  if (videoProtoObject) {
    videoConfig = videoProtoObject
  }

  /* ================= GATE ================= */

  if (!videoConfig?.config) {
    return <AbsoluteFill style={{ background: 'black' }} />
  }

  const metadata = videoConfig.metadata
  const sections = videoConfig.config.sections ?? []
  const globalBackground = metadata?.backgroundColor ?? 'transparent'

  // if external video object exist use it or assign zustand video object
  const allSlides = sections.flatMap(section => section.slides)

  const transitionDurationFrames = Math.round(fps * TRANSITION_DURATION_SECONDS)

  /* ================= EMPTY ================= */

  if (allSlides.length === 0) {
    return (
      <AbsoluteFill
        style={{
          background: globalBackground,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 24,
          opacity: 0.5
        }}
      >
        No slides to display
      </AbsoluteFill>
    )
  }

  /* ================= RENDER ================= */

  return (
    <AbsoluteFill style={{ background: globalBackground }}>
      <TransitionSeries>
        {allSlides.map(slide => {
          const isSelected = selectedTemplateId === slide.id

          const actualDuration = getActualSlideDuration(slide)
          const durationInFrames = Math.round(actualDuration * fps)

          const hasTransition = slide.transition !== TransitionType.TRANSITION_NONE

          // if global background is given , all slides background should be transparent
          // else slide color
          const slideWithBackground =
            globalBackground != 'transparent' ? { ...slide, backgroundColor: 'transparent' } : slide

          return (
            <React.Fragment key={slide.id}>

              <TransitionSeries.Sequence durationInFrames={durationInFrames}>
                <SlideComponent
                  slide={slideWithBackground}
                  width={width}
                  height={height}
                  isEditing={isEditing}
                  isSelected={isSelected}
                  selectedStackItemId={
                    slide.type === SlideType.STACK
                      ? selectedStackItemId
                      : null
                  }
                  onSelect={() => {
                    onSelectTemplate?.(slide.id);
                  }}
                />
              </TransitionSeries.Sequence>

              {hasTransition && (
                <TransitionSeries.Transition
                  presentation={getTransitionPresentation(slide.transition)}
                  timing={linearTiming({
                    durationInFrames: transitionDurationFrames
                  })}
                />
              )}

            </React.Fragment>
          )
        })}
      </TransitionSeries>
    </AbsoluteFill>
  )
}

export default Slideshow
