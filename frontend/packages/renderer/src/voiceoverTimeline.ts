import { Slide, TransitionType } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { TRANSITION_DURATION_FRAMES } from './frameUtils'

export interface SlideStartFrameEntry {
  slide: Slide
  startFrame: number
}

export interface SerializedVoiceoverSegment {
  slideId: string
  from: number
  durationInFrames: number
  src: string
}

export interface SerializedVoiceoverTimeline {
  slideStartFrames: SlideStartFrameEntry[]
  segments: SerializedVoiceoverSegment[]
  requiredLastSlideDurationInFrames: number
  trailingAudioEndFrame: number
}

const roundFrame = (frame: number) => Math.max(0, Math.round(frame))

/**
 * Builds the visual slide timeline using the same transition overlap rules as the slideshow.
 */
export const getSlideStartFrames = (slides: Slide[]): SlideStartFrameEntry[] => {
  let currentFrame = 0

  return slides.map((slide, index) => {
    const startFrame = currentFrame
    const hasTransition =
      index < slides.length - 1 &&
      slide.transition !== TransitionType.TRANSITION_NONE

    currentFrame += Math.round(slide.durationInFrames)

    if (hasTransition) {
      currentFrame -= Math.round(TRANSITION_DURATION_FRAMES)
    }

    return {
      slide,
      startFrame,
    }
  })
}

/**
 * Serializes narration so each slide's voiceover starts no earlier than its visual entrance and
 * no earlier than the end of the previous narrated slide. This avoids overlapping voiceovers
 * when slide visuals are shorter than their generated speech.
 */
export const buildSerializedVoiceoverTimeline = (slides: Slide[]): SerializedVoiceoverTimeline => {
  const slideStartFrames = getSlideStartFrames(slides)
  const segments: SerializedVoiceoverSegment[] = []
  let trailingAudioEndFrame = 0

  slideStartFrames.forEach(({ slide, startFrame }) => {
    const slideSegments = slide.voiceover?.segments?.filter(segment => Boolean(segment.asset?.url)) ?? []

    if (slideSegments.length === 0) {
      return
    }

    const voiceoverStartFrame = Math.max(startFrame, trailingAudioEndFrame)
    let slideVoiceoverEndFrame = voiceoverStartFrame

    slideSegments.forEach(segment => {
      const segmentStartFrame = roundFrame(segment.startFrame)
      const segmentEndFrame = Math.max(segmentStartFrame + 1, roundFrame(segment.endFrame))
      const durationInFrames = Math.max(1, segmentEndFrame - segmentStartFrame)

      segments.push({
        slideId: slide.id,
        from: voiceoverStartFrame + segmentStartFrame,
        durationInFrames,
        src: segment.asset!.url,
      })

      slideVoiceoverEndFrame = Math.max(slideVoiceoverEndFrame, voiceoverStartFrame + segmentEndFrame)
    })

    trailingAudioEndFrame = Math.max(trailingAudioEndFrame, slideVoiceoverEndFrame)
  })

  const lastSlideEntry = slideStartFrames[slideStartFrames.length - 1]
  const requiredLastSlideDurationInFrames = lastSlideEntry
    ? Math.max(
        Math.round(lastSlideEntry.slide.durationInFrames),
        Math.max(0, trailingAudioEndFrame - lastSlideEntry.startFrame)
      )
    : 0

  return {
    slideStartFrames,
    segments,
    requiredLastSlideDurationInFrames,
    trailingAudioEndFrame,
  }
}
