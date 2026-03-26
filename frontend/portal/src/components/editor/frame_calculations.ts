// Calculate total duration in frames for Remotion rendering
import { TransitionType } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { TimelineSlide } from "./timeline/types";
import { TRANSITION_DURATION_FRAMES } from "@coasterai/renderer/src/frameUtils";

// Total frames accounting for transition overlaps (source of truth for Remotion player)
export const calculateRealTotalFrames = (allSlides: TimelineSlide[], fps: number): number => {
  if (allSlides.length === 0) return 0;

  let totalFrames = 0;

  allSlides.forEach((slide, index) => {
    const hasTransition =
      index < allSlides.length - 1 &&
      slide.transition !== TransitionType.TRANSITION_NONE

    totalFrames += slide.slide.durationInFrames;

    if (hasTransition) {
      totalFrames -= TRANSITION_DURATION_FRAMES;
    }
  })

  return totalFrames;
};

// Absolute start frame of a slide in the Remotion timeline (accounts for transition overlaps)
export const getRealSlideStartFrame = (allSlides: TimelineSlide[], slideId: string, fps: number): number => {
  let frame = 0;

  for (let index = 0; index < allSlides.length; index++) {
    const slide = allSlides[index]
    const hasTransition =
      index < allSlides.length - 1 &&
      slide.transition !== TransitionType.TRANSITION_NONE

    if (slide.id === slideId) return frame;
    frame += slide.slide.durationInFrames;

    if (hasTransition) {
      frame -= TRANSITION_DURATION_FRAMES;
    }
  }

  return 0;
};

// Last frame before the transition region starts — used for seeking when selecting a slide
// so the user sees clean slide content without being mid-transition
export const getSlideVisualEndFrame = (allSlides: TimelineSlide[], slideId: string, fps: number): number => {
  const slideIndex = allSlides.findIndex(s => s.id === slideId);
  if (slideIndex === -1) return 0;

  const startFrame = getRealSlideStartFrame(allSlides, slideId, fps);
  const slide = allSlides[slideIndex]
  const slideDurationFrames = slide.slide.durationInFrames
  const hasTransition =
    slideIndex < allSlides.length - 1 &&
    slide.transition !== TransitionType.TRANSITION_NONE

  if (hasTransition) {
    return startFrame + slideDurationFrames - TRANSITION_DURATION_FRAMES - 1;
  }

  return startFrame + slideDurationFrames - 1;
};

// Last frame of the visible slide content in paused edit mode, where transitions
// are replaced by non-overlapping spacer frames to keep total duration aligned.
export const getSlideEditPreviewFrame = (allSlides: TimelineSlide[], slideId: string, fps: number): number => {
  let frame = 0;
  const transitionFrames = TRANSITION_DURATION_FRAMES;

  for (let index = 0; index < allSlides.length; index++) {
    const slide = allSlides[index]
    const hasTransition =
      index < allSlides.length - 1 &&
      slide.transition !== TransitionType.TRANSITION_NONE
    const visibleDuration = hasTransition
      ? Math.max(1, slide.slide.durationInFrames - transitionFrames)
      : slide.slide.durationInFrames

    if (slide.id === slideId) {
      return frame + visibleDuration - 1
    }

    frame += visibleDuration
  }

  return 0;
};

// Very last frame a slide exists in the video (includes transition region)
export const getSlideAbsoluteEndFrame = (allSlides: TimelineSlide[], slideId: string, fps: number): number => {
  const startFrame = getRealSlideStartFrame(allSlides, slideId, fps);
  const slide = allSlides.find(s => s.id === slideId);
  if (!slide) return startFrame;

  const slideDurationFrames = slide.slide.durationInFrames
  return startFrame + slideDurationFrames - 1;
};

// Aliases
export const getSlidePreviewEndFrame = getSlideVisualEndFrame;
export const getSlideEndFrame = getSlideAbsoluteEndFrame;
