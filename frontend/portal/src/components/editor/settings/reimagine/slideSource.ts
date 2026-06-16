import type { Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import type { Video } from '@coasterai/pb/coasterai/core/v1/video_pb'
import { findSlideLocation, getSections } from '@/stores/video/utils'

export const isSlideEmptyForSuggestions = (slide?: Slide | null, selectedSlide?: Slide | null) => {
  if (!slide) {
    return true
  }

  const updatedContent = slide.content
  if (!updatedContent) {
    return false
  }

  const existingContent = selectedSlide?.content ? selectedSlide.content : undefined

  return !existingContent?.edits || Object.keys(existingContent.edits).length === 0
}

interface ResolveSuggestionSourceSlideParams {
  videoConfig: Video | null
  selectedSlide: Slide | null
  getSlideWithBackground: (slide: Slide) => Slide['backgroundStyle']
}

export const resolveSuggestionSourceSlide = ({
  videoConfig,
  selectedSlide,
  getSlideWithBackground,
}: ResolveSuggestionSourceSlideParams): Slide | null => {
  if (!selectedSlide) {
    return null
  }

  const sections = videoConfig ? getSections(videoConfig) : []
  const slides = sections.flatMap(section => section.slides)

  const location = videoConfig ? findSlideLocation(videoConfig, selectedSlide.id) : null
  const currentIndex = location
    ? sections.slice(0, location.sectionIndex).reduce((count, section) => count + section.slides.length, 0) + location.slideIndex
    : slides.findIndex(slide => slide.id === selectedSlide.id)

  const currentSlide = currentIndex >= 0 ? slides[currentIndex] : selectedSlide
  const sourceSlide = isSlideEmptyForSuggestions(currentSlide, selectedSlide)
    ? slides[currentIndex - 1] ?? slides[currentIndex + 1] ?? null
    : currentSlide

  if (!sourceSlide) {
    return null
  }

  return {
    ...sourceSlide,
    backgroundStyle: getSlideWithBackground(sourceSlide),
  }
}
