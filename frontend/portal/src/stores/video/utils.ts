import { Section, Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { Video, VideoMetadata } from '@coasterai/pb/coasterai/core/v1/video_pb'
import { SelectedSection } from './types'

export const getSections = (videoConfig: Video) => videoConfig?.config?.sections || []

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

  const totalDuration = videoConfig.config.sections.reduce((total, section) => {
    const slides = section.slides || []

    if (slides.length === 0) return total

    const slidesDuration = slides.reduce(
      (sum, slide) => sum + (slide.duration || 0),
      0
    )

    const transitionsDuration = slides
      .slice(0, -1) // exclude last slide (no transition after it)
      .reduce((sum, slide) => sum + (slide.transitionDuration || 0), 0)

    const sectionDuration = slidesDuration - transitionsDuration

    return total + sectionDuration
  }, 0)

  return {
    ...videoConfig,
    metadata: {
      ...videoConfig.metadata,
      duration: totalDuration
    } as VideoMetadata
  }
}
