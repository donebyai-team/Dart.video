import { Section, Slide, TransitionType } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { Video, VideoMetadata } from '@coasterai/pb/coasterai/core/v1/video_pb'
import { SelectedSection } from './types'

export const getSections = (videoConfig: Video) => videoConfig?.config?.sections || []
/**
* Returns the nearest previous slide relative to a section.
*
* Priority:
* 1. Last slide of the given section
* 2. If none, last slide of the previous section
* 3. Continue checking earlier sections
* 4. If no slides exist in any previous section, returns undefined
*/
export function getPreviousSlide(
  sections: Section[],
  sectionId: string
): Slide | undefined {
  const sectionIndex = sections.findIndex(s => s.id === sectionId);
  if (sectionIndex === -1) return undefined;

  for (let i = sectionIndex; i >= 0; i--) {
    const slides = sections[i].slides;
    if (slides.length > 0) {
      return slides[slides.length - 1];
    }
  }

  return undefined;
}

export const updateVideoConfigSections = (videoConfig: Video, updater: (sections: Section[]) => Section[]): Video => {
  if (!videoConfig?.config) return videoConfig

  return {
    ...videoConfig,
    config: {
      ...videoConfig.config,
      sections: updater(getSections(videoConfig))
    }
  }
}

export const updateSelectedSlide = (
  selectedSlide: SelectedSection,
  updater: (slide: Slide) => Slide
): SelectedSection => {
  if (!selectedSlide?.slide) return selectedSlide

  return {
    ...selectedSlide,
    slide: updater(selectedSlide.slide)
  }
}

export const updateTotalDuration = (videoConfig: Video): Video => {
  if (!videoConfig?.config?.sections) return videoConfig

  // Flatten all slides across all sections — transitions can cross section boundaries
  // in the Remotion timeline, so we must treat slides as one continuous sequence.
  const allSlides = videoConfig.config.sections.flatMap(s => s.slides || [])

  let totalDuration = 0

  allSlides.forEach((slide, i) => {
    totalDuration += slide.durationInFrames

    if (
      i < allSlides.length - 1 &&
      slide.transitionDurationInFrames &&
      slide.transition !== TransitionType.TRANSITION_NONE
    ) {
      totalDuration -= slide.transitionDurationInFrames
    }
  })

  return {
    ...videoConfig,
    metadata: {
      ...videoConfig.metadata,
      durationInFrames: totalDuration
    } as VideoMetadata
  }
}
