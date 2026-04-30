import { Section, Slide, TransitionType } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { Video, VideoMetadata } from '@coasterai/pb/coasterai/core/v1/video_pb'

export const getSections = (videoConfig: Video) => videoConfig?.config?.sections || []

export interface SlideLocation {
  section: Section
  sectionIndex: number
  slide: Slide
  slideIndex: number
}
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

export const findSlideLocation = (
  videoConfig: Video,
  slideId: string
): SlideLocation | null => {
  const sections = getSections(videoConfig)

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex]
    const slideIndex = section.slides.findIndex(slide => slide.id === slideId)

    if (slideIndex !== -1) {
      return {
        section,
        sectionIndex,
        slide: section.slides[slideIndex],
        slideIndex,
      }
    }
  }

  return null
}

export const findSlideById = (videoConfig: Video, slideId: string): Slide | null =>
  findSlideLocation(videoConfig, slideId)?.slide ?? null

export const updateSlideById = (
  videoConfig: Video,
  slideId: string,
  updater: (slide: Slide) => Slide
): Video =>
  updateVideoConfigSections(videoConfig, sections =>
    sections.map(section => ({
      ...section,
      slides: section.slides.map(slide =>
        slide.id === slideId ? updater(slide) : slide
      )
    }))
  )

export const updateSelectedSlide = (
  selectedSlide: Slide,
  updater: (slide: Slide) => Slide
): Slide => updater(selectedSlide)

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
