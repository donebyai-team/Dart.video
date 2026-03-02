import { fromJson, JsonObject } from '@bufbuild/protobuf'
import { Slide, SlideType, TransitionType, UploadedMedia } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { Video, VideoSchema } from '@coasterai/pb/coasterai/core/v1/video_pb'
import { linearTiming, TransitionSeries } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import { wipe } from '@remotion/transitions/wipe'
import { flip } from '@remotion/transitions/flip'
import { clockWipe } from '@remotion/transitions/clock-wipe'
import { iris } from '@remotion/transitions/iris'
import { none } from '@remotion/transitions/none'
import React from 'react'
import { AbsoluteFill, useVideoConfig, Html5Audio } from 'remotion'
import { getActualSlideDuration, TRANSITION_DURATION_SECONDS } from './frameUtils'
import { AnimationSlide, MediaSlide } from './slides'
import { backgroundStyleToCSS } from './backgroundUtils'


interface SlideshowProps {
  fps: number
  isEditing?: boolean
  onSelectTemplate?: (slideId: string) => void
  video?: JsonObject
  videoConfig?: Video
  selectedStackItemId?: string | null
  onUpdate?: (updates: Partial<Slide>) => void
  uploadMedia?: (file: File) => Promise<UploadedMedia>
}

// Main slide component router
export const SlideComponent: React.FC<{
  slide: Slide
  width: number
  height: number
  isEditing?: boolean
  isSelected?: boolean
  selectedStackItemId?: string | null
  onSelect?: () => void
  onUpdate?: (updates: Partial<Slide>) => void
  uploadMedia?: (file: File) => Promise<UploadedMedia>
}> = ({ slide, width, height, isEditing = false, isSelected = false, onSelect, onUpdate = () => { }, uploadMedia }) => {

  const slideBackground = backgroundStyleToCSS(slide.backgroundStyle)

  switch (slide.type) {
    case SlideType.ANIMATION:
      // Only render if content case matches or is undefined (for new slides)
      if (!slide.content?.case || slide.content.case === 'animation') {
        return (
          <AnimationSlide
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
    case SlideType.MEDIA:
      if (!slide.content?.case || slide.content.case === 'media') {
        return <MediaSlide slide={slide} width={width} height={height} isEditing={isEditing} onUpdate={onUpdate} uploadMedia={uploadMedia} />
      }
      break

    default:
      if (!slide.content?.case || slide.content.case === 'media') {
        return <MediaSlide slide={slide} width={width} height={height} isEditing={isEditing} onUpdate={onUpdate} uploadMedia={uploadMedia} />
      }
      break
  }

  // Fallback for mismatched content - render a placeholder
  return (
    <AbsoluteFill
      style={{
        backgroundColor: slideBackground,
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

export const SingleSlidePreview: React.FC<{
  slide: Slide
  isEditing?: boolean
}> = ({ slide, isEditing = false }) => {
  const { width, height } = useVideoConfig()

  return (
    <AbsoluteFill style={{ background: backgroundStyleToCSS(slide.backgroundStyle) }}>
      <SlideComponent
        slide={slide}
        width={width}
        height={height}
        isEditing={isEditing}
        isSelected={false}
      />
    </AbsoluteFill>
  )
}

// Get transition presentation based on transition type
const getTransitionPresentation = (transitionType?: TransitionType, width?: number, height?: number): any => {
  switch (transitionType) {
    case TransitionType.TRANSITION_FADE:
      return fade() // Smooth opacity fade between slides
    case TransitionType.TRANSITION_SLIDE_LEFT:
      return slide({ direction: 'from-right' }) // Slide enters from right side
    case TransitionType.TRANSITION_SLIDE_RIGHT:
      return slide({ direction: 'from-left' }) // Slide enters from left side
    case TransitionType.TRANSITION_SLIDE_UP:
      return slide({ direction: 'from-bottom' }) // Slide enters from bottom
    case TransitionType.TRANSITION_SLIDE_DOWN:
      return slide({ direction: 'from-top' }) // Slide enters from top
    case TransitionType.TRANSITION_WIPE_LEFT:
      return wipe({ direction: 'from-right' }) // Wipe reveals content from right to left
    case TransitionType.TRANSITION_WIPE_RIGHT:
      return wipe({ direction: 'from-left' }) // Wipe reveals content from left to right
    case TransitionType.TRANSITION_WIPE_UP:
      return wipe({ direction: 'from-bottom' }) // Wipe reveals content from bottom to top
    case TransitionType.TRANSITION_WIPE_DOWN:
      return wipe({ direction: 'from-top' }) // Wipe reveals content from top to bottom
    case TransitionType.TRANSITION_FLIP_LEFT:
      return flip({ direction: 'from-left' }) // 3D flip effect rotating from left
    case TransitionType.TRANSITION_FLIP_RIGHT:
      return flip({ direction: 'from-right' }) // 3D flip effect rotating from right
    case TransitionType.TRANSITION_FLIP_UP:
      return flip({ direction: 'from-top' }) // 3D flip effect rotating from top
    case TransitionType.TRANSITION_FLIP_DOWN:
      return flip({ direction: 'from-bottom' }) // 3D flip effect rotating from bottom
    case TransitionType.TRANSITION_CLOCK_WIPE:
      return clockWipe({ width: width || 1920, height: height || 1080 }) // Circular wipe that sweeps like a clock hand
    case TransitionType.TRANSITION_IRIS:
      return iris({ width: width || 1920, height: height || 1080 }) // Circular iris expand/contract effect
    case TransitionType.TRANSITION_NONE:
      return none() // Instant cut with no transition effect
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
export const Slideshow: React.FC<SlideshowProps> = ({ fps, isEditing = false, onSelectTemplate, video, videoConfig: videoConfigProp, selectedStackItemId = null, onUpdate = () => { }, uploadMedia }) => {
  const selectedTemplateId = null

  const { width, height } = useVideoConfig()
  const videoProtoObject = video ? fromJson(VideoSchema, video) : undefined
  const videoConfig = videoProtoObject ?? videoConfigProp

  /* ================= GATE ================= */

  if (!videoConfig?.config) {
    return <AbsoluteFill style={{ background: 'black' }} />
  }

  const metadata = videoConfig.metadata
  const sections = videoConfig.config.sections ?? []
  const globalBackground = backgroundStyleToCSS(metadata?.backgroundStyle);

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

      {/* 🎵 Background Audio from URL */}
      {videoConfig.metadata?.backgroundAudioUrl && (
        <Html5Audio
          src={videoConfig.metadata.backgroundAudioUrl}
          volume={0.5}
          loop
          onError={error => {
            console.log('Audio error:', error.message)
            return 'fallback'
          }}
        />
      )}

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
                  onUpdate={onUpdate}
                  uploadMedia={uploadMedia}
                  onSelect={() => {
                    onSelectTemplate?.(slide.id);
                  }}
                />
              </TransitionSeries.Sequence>

              {hasTransition && (
                <TransitionSeries.Transition
                  presentation={getTransitionPresentation(slide.transition, width, height)}
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
