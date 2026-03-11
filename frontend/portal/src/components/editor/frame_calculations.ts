// Calculate total duration in frames for Remotion rendering
import { TransitionType } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { TimelineSlide } from "./timeline/types";
import { getActualSlideDuration, TRANSITION_DURATION_SECONDS } from "@coasterai/renderer/src/frameUtils";

// Total frames accounting for transition overlaps (source of truth for Remotion player)
export const calculateRealTotalFrames = (allSlides: TimelineSlide[], fps: number): number => {
  if (allSlides.length === 0) return 0;

  let totalFrames = 0;

  for (const slide of allSlides) {
    const actualDuration = getActualSlideDuration(slide.slide);
    totalFrames += Math.round(actualDuration * fps);

    if (slide.transition !== TransitionType.TRANSITION_NONE) {
      totalFrames -= Math.round(TRANSITION_DURATION_SECONDS * fps);
    }
  }

  return totalFrames;
};

// Absolute start frame of a slide in the Remotion timeline (accounts for transition overlaps)
export const getRealSlideStartFrame = (allSlides: TimelineSlide[], slideId: string, fps: number): number => {
  let frame = 0;

  for (const slide of allSlides) {
    if (slide.id === slideId) return frame;

    const actualDuration = getActualSlideDuration(slide.slide);
    frame += Math.round(actualDuration * fps);

    if (slide.transition !== TransitionType.TRANSITION_NONE) {
      frame -= Math.round(TRANSITION_DURATION_SECONDS * fps);
    }
  }

  return 0;
};

// Last frame before the transition region starts — used for seeking when selecting a slide
// so the user sees clean slide content without being mid-transition
export const getSlideVisualEndFrame = (allSlides: TimelineSlide[], slideId: string, fps: number): number => {
  const slide = allSlides.find(s => s.id === slideId);
  if (!slide) return 0;

  const startFrame = getRealSlideStartFrame(allSlides, slideId, fps);
  const slideDurationFrames = Math.round(getActualSlideDuration(slide.slide) * fps);

  if (slide.transition !== TransitionType.TRANSITION_NONE) {
    return startFrame + slideDurationFrames - Math.round(TRANSITION_DURATION_SECONDS * fps) - 1;
  }

  return startFrame + slideDurationFrames - 1;
};

// Very last frame a slide exists in the video (includes transition region)
export const getSlideAbsoluteEndFrame = (allSlides: TimelineSlide[], slideId: string, fps: number): number => {
  const startFrame = getRealSlideStartFrame(allSlides, slideId, fps);
  const slide = allSlides.find(s => s.id === slideId);
  if (!slide) return startFrame;

  const slideDurationFrames = Math.round(getActualSlideDuration(slide.slide) * fps);
  return startFrame + slideDurationFrames - 1;
};

// Aliases
export const getSlidePreviewEndFrame = getSlideVisualEndFrame;
export const getSlideEndFrame = getSlideAbsoluteEndFrame;
