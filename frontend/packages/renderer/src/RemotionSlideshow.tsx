import { fromJson, JsonObject } from '@bufbuild/protobuf'
import { Slide, TransitionType } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { Video, VideoSchema } from '@coasterai/pb/coasterai/core/v1/video_pb'
import { linearTiming, TransitionSeries } from '@remotion/transitions'
import React, { useMemo } from 'react'
import { AbsoluteFill, useVideoConfig, Html5Audio, Sequence, Series } from 'remotion'
import {
  ThemeProvider,
  AspectPresetProvider,
  StyleContextProvider,
  resolveStyle,
  type AspectPreset,
  ASPECT_PRESETS,
  type BrandTheme,
} from '@coasterai/animation'
import { AnimationSlide } from './slides'
import { BackgroundLayer } from './BackgroundLayer'
import { supportsAnimatedBackgroundEffect } from './backgroundEffectUtils'
import { buildSerializedVoiceoverTimeline } from './voiceoverTimeline'
import { getTransitionPresentation } from './transitions/presentation'
import { getSlideTransitionDirectionValue } from './transitions/config'
import { TRANSITION_DURATION_FRAMES } from './frameUtils'
import { brandingToTheme } from './utils'



interface SlideshowProps {
  fps: number
  fontsReady?: boolean
  isEditing?: boolean
  onSelectTemplate?: (slideId: string) => void
  video?: JsonObject
  videoConfig?: Video
  isPlaying?: boolean
  audioVolume?: number
  onUpdate?: (updates: Partial<Slide>) => void
}

export const SingleSlidePreview: React.FC<{
  slide: Slide
  theme?: BrandTheme
  isEditing?: boolean
}> = ({ slide, theme, isEditing = false }) => {
  const { width, height } = useVideoConfig()
  const styleConfig = useMemo(() => resolveStyle('clean'), [])
  const aspectPreset = useMemo<AspectPreset>(() => ASPECT_PRESETS["web"], [width, height])
  const hasAnimatedBackground = supportsAnimatedBackgroundEffect(slide.backgroundStyle)
  const slideForRender = hasAnimatedBackground ? { ...slide, backgroundStyle: undefined } : slide

  if (!theme) {
    return <AbsoluteFill style={{ background: 'transparent' }} />
  }

  return (
    <ThemeProvider theme={theme}>
      <AspectPresetProvider preset={aspectPreset}>
        <StyleContextProvider style={styleConfig}>
          <BackgroundLayer backgroundStyle={slide.backgroundStyle}>
            <AnimationSlide
              slide={slideForRender}
              width={width}
              height={height}
              isEditing={isEditing}
              isSelected={false}
            />
          </BackgroundLayer>
        </StyleContextProvider>
      </AspectPresetProvider>
    </ThemeProvider>
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
  fontsReady = true,
  isEditing,
  onSelectTemplate,
  video,
  videoConfig: videoConfigProp,
  isPlaying = true,
  audioVolume = 0.5,
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
  const brandTheme = brandingToTheme(videoConfig?.metadata?.generatedBranding);

  /* ================= GATE ================= */

  if (!fontsReady) {
    return <AbsoluteFill style={{ background: 'transparent' }} />
  }

  if (!videoConfig?.config) {
    return <AbsoluteFill style={{ background: 'black' }} />
  }

  const metadata = videoConfig.metadata
  const sections = videoConfig.config.sections ?? []
  const backgroundAudioUrl = metadata?.bgAudio?.url ?? metadata?.backgroundAudioUrl

  // if external video object exist use it or assign zustand video object
  const allSlides = useMemo(() => sections.flatMap(section => section.slides), [sections])
  /**
   * Voiceover playback is serialized across slides so we preserve authored visual pacing while
   * preventing one slide's narration from overlapping the next slide's narration.
   */
  const serializedVoiceoverTimeline = useMemo(
    () => buildSerializedVoiceoverTimeline(allSlides),
    [allSlides]
  )


  /* ================= EMPTY ================= */

  if (allSlides.length === 0) {
    return (
      <BackgroundLayer backgroundStyle={metadata?.backgroundStyle}>
        <AbsoluteFill
          style={{
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
      </BackgroundLayer>
    )
  }

  /* ================= RENDER ================= */

  const renderSlide = (slide: Slide) => {
    const isSelected = selectedTemplateId === slide.id
    const hasAnimatedBackground = supportsAnimatedBackgroundEffect(slide.backgroundStyle)
    const slideWithBackground =
      hasAnimatedBackground
        ? { ...slide, backgroundStyle: undefined }
        : slide

    if (hasAnimatedBackground) {
      return (
        <BackgroundLayer backgroundStyle={slide.backgroundStyle}>
          <AnimationSlide
            slide={slideWithBackground}
            width={width}
            height={height}
            isEditing={isEditing}
            isSelected={isSelected}
            isPlaying={isPlaying}            
          />
        </BackgroundLayer>
      )
    }

    return (
      <AnimationSlide
        slide={slideWithBackground}
        width={width}
        height={height}
        isEditing={isEditing}
        isSelected={isSelected}
        isPlaying={isPlaying}
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
          <BackgroundLayer backgroundStyle={metadata?.backgroundStyle}>

            {/* 🎵 Background Audio from URL */}
            {backgroundAudioUrl && (
              <Html5Audio
                src={backgroundAudioUrl}
                volume={audioVolume}
                loop
                onError={error => {
                  console.log('Audio error:', error.message)
                  return 'fallback'
                }}
              />
            )}

            {serializedVoiceoverTimeline.segments.map((segment, index) => (
              <Sequence
                key={`${segment.slideId}-voiceover-${index}`}
                from={segment.from}
                durationInFrames={segment.durationInFrames}
              >
                <Html5Audio src={segment.src} volume={0.4} />
              </Sequence>
            ))}

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
                    <Series.Sequence key={slide.id} durationInFrames={visibleDuration}>
                      {renderSlide(slide)}
                    </Series.Sequence>
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
          </BackgroundLayer>
        </StyleContextProvider>
      </AspectPresetProvider>
    </ThemeProvider>
  )
}

export default Slideshow
