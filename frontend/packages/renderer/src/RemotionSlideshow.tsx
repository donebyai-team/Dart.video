import { fromJson, JsonObject } from '@bufbuild/protobuf'
import { Slide, SlideType, TransitionType, UploadedMedia } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { Video, VideoSchema } from '@coasterai/pb/coasterai/core/v1/video_pb'
import { linearTiming, TransitionSeries } from '@remotion/transitions'
import React from 'react'
import { AbsoluteFill, useVideoConfig, Html5Audio } from 'remotion'
import { AnimationSlide, MediaSlide } from './slides'
import { backgroundStyleToCSS } from './backgroundUtils'
import { getTransitionPresentation } from './transitions/presentation'
import { getSlideTransitionDirectionValue } from './transitions/config'
import { getActualSlideDuration, TRANSITION_DURATION_SECONDS } from './frameUtils'



interface SlideshowProps {
  fps: number
  isEditing?: boolean
  onSelectTemplate?: (slideId: string) => void
  video?: JsonObject
  videoConfig?: Video
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

/**
 * REMOTION TRANSITION CALCULATIONS (2026)
 * Based on TransitionSeries overlapping behavior:
 * - Slides overlap during transitions
 * - Total duration = Sum of slides - Sum of transitions
 * - Visual End = Last frame before transition starts
 * - Absolute End = Very last frame slide exists
 */

// Main slideshow composition using Remotion's TransitionSeries
export const Slideshow: React.FC<SlideshowProps> = ({ fps, isEditing = false, onSelectTemplate, video, videoConfig: videoConfigProp, onUpdate = () => { }, uploadMedia }) => {
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
        {allSlides.map((slide, index) => {
          const isSelected = selectedTemplateId === slide.id

          const actualDuration = getActualSlideDuration(slide)
          const durationInFrames = Math.round(actualDuration * fps)

          // Last slide never transitions out because there is no following slide.
          const hasTransition =
            index < allSlides.length - 1 &&
            slide.transition !== TransitionType.TRANSITION_NONE

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
                  onUpdate={onUpdate}
                  uploadMedia={uploadMedia}
                  onSelect={() => {
                    onSelectTemplate?.(slide.id);
                  }}
                />
              </TransitionSeries.Sequence>

              {hasTransition && (
                <TransitionSeries.Transition
                  presentation={getTransitionPresentation(
                    slide.transition,
                    getSlideTransitionDirectionValue(slide),
                    width,
                    height
                  ) as any}
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
