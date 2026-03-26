import { fromJson, JsonObject } from '@bufbuild/protobuf'
import { Slide, TransitionType } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { Video, VideoSchema } from '@coasterai/pb/coasterai/core/v1/video_pb'
import { linearTiming, TransitionSeries } from '@remotion/transitions'
import React, { useMemo } from 'react'
import { AbsoluteFill, useVideoConfig, Html5Audio, Series } from 'remotion'
import {
  ThemeProvider,
  AspectPresetProvider,
  StyleContextProvider,
  resolveStyle,
  type AspectPreset,
  ASPECT_PRESETS,
  defaultTheme,
} from '@coasterai/animation'
import { AnimationSlide } from './slides'
import { backgroundStyleToCSS } from './backgroundUtils'
import { getTransitionPresentation } from './transitions/presentation'
import { getSlideTransitionDirectionValue } from './transitions/config'
import { TRANSITION_DURATION_FRAMES } from './frameUtils'
import { brandingToTheme } from './utils'



interface SlideshowProps {
  fps: number
  isEditing?: boolean
  onSelectTemplate?: (slideId: string) => void
  video?: JsonObject
  videoConfig?: Video
  isPlaying?: boolean
  onUpdate?: (updates: Partial<Slide>) => void
}

export const SingleSlidePreview: React.FC<{
  slide: Slide
  isEditing?: boolean
}> = ({ slide, isEditing = false }) => {
  const { width, height } = useVideoConfig()

  return (
    <AbsoluteFill style={{ background: backgroundStyleToCSS(slide.backgroundStyle) }}>
      <AnimationSlide
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
export const Slideshow: React.FC<SlideshowProps> = ({
  fps,
  isEditing,
  onSelectTemplate,
  video,
  videoConfig: videoConfigProp,
  onUpdate = () => { },
}) => {
  const selectedTemplateId = null

  const { width, height } = useVideoConfig()
  const videoProtoObject = video ? fromJson(VideoSchema, video) : undefined
  const videoConfig = videoProtoObject ?? videoConfigProp

  const styleConfig = useMemo(() => resolveStyle('clean'), [])
  // TODO: Make this dynamic based on the video resolution
  const aspectPreset = useMemo<AspectPreset>(() => (ASPECT_PRESETS["web"]), [width, height])

  // Use the one that is generated from backend or default
  const brandTheme = useMemo(
    () =>
      videoConfig?.metadata?.generatedBranding
        ? brandingToTheme(videoConfig.metadata.generatedBranding)
        : defaultTheme,
    [videoConfig?.metadata?.generatedBranding]
  );

  /* ================= GATE ================= */

  if (!videoConfig?.config) {
    return <AbsoluteFill style={{ background: 'black' }} />
  }

  const metadata = videoConfig.metadata
  const sections = videoConfig.config.sections ?? []
  const globalBackground = backgroundStyleToCSS(metadata?.backgroundStyle);

  // if external video object exist use it or assign zustand video object
  const allSlides = sections.flatMap(section => section.slides)


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

  const renderSlide = (slide: Slide) => {
    const isSelected = selectedTemplateId === slide.id
    const slideWithBackground =
      globalBackground != 'transparent' ? { ...slide, backgroundColor: 'transparent' } : slide

    return (
      <AnimationSlide
        slide={slideWithBackground}
        width={width}
        height={height}
        isEditing={isEditing}
        isSelected={isSelected}
        onUpdate={onUpdate}
        onSelect={() => {
          onSelectTemplate?.(slide.id);
        }}
      />
    )
  }

  return (
    <ThemeProvider theme={brandTheme}>
      <AspectPresetProvider preset={aspectPreset}>
        <StyleContextProvider style={styleConfig}>
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

            {isEditing ? (
              // In paused editor mode, avoid TransitionSeries overlap so only one slide's
              // DOM is mounted for hit-testing. We keep timeline sync by shortening each
              // transitioning slide by the overlap duration instead of rendering the overlap.
              <Series>
                {allSlides.map((slide, index) => {
                  const hasTransition =
                    index < allSlides.length - 1 &&
                    slide.transition !== TransitionType.TRANSITION_NONE
                  const visibleDuration = hasTransition
                    ? Math.max(1, slide.durationInFrames - TRANSITION_DURATION_FRAMES)
                    : slide.durationInFrames

                  return (
                    <React.Fragment key={slide.id}>
                      <Series.Sequence durationInFrames={visibleDuration}>
                        {renderSlide(slide)}
                      </Series.Sequence>
                    </React.Fragment>
                  )
                })}
              </Series>
            ) : (
              <TransitionSeries>
                {allSlides.map((slide, index) => {
                  const durationInFrames = slide.durationInFrames;
                  const hasTransition =
                    index < allSlides.length - 1 &&
                    slide.transition !== TransitionType.TRANSITION_NONE

                  return (
                    <React.Fragment key={slide.id}>

                      <TransitionSeries.Sequence durationInFrames={Math.round(durationInFrames)}>
                        {renderSlide(slide)}
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
                            durationInFrames: Math.round(TRANSITION_DURATION_FRAMES)
                          })}
                        />
                      )}

                    </React.Fragment>
                  )
                })}
              </TransitionSeries>
            )}
          </AbsoluteFill>
        </StyleContextProvider>
      </AspectPresetProvider>
    </ThemeProvider>
  )
}

export default Slideshow
