

// Calculate total duration in frames for Remotion rendering
import { Slide, TransitionType } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { TimelineSlide } from "./timeline/types";
import { getActualSlideDuration, TRANSITION_DURATION_SECONDS } from "@coasterai/renderer/src/frameUtils";

// Formula: Sum of slide durations +/- Sum of transition durations (based on TRANSITIONS_ADD_DURATION)
export const calculateRealTotalFrames = (allSlides: TimelineSlide[], fps: number): number => {
  if (allSlides.length === 0) return 0;

  let totalFrames = 0;

  for (const slide of allSlides) {
    const actualDuration = getActualSlideDuration(slide.slide);
    totalFrames += Math.round(actualDuration * fps);
    
    // Add or subtract transition duration based on configuration
    if (slide.transition !== TransitionType.TRANSITION_NONE) {
      const transitionFrames = Math.round(TRANSITION_DURATION_SECONDS * fps);
      totalFrames += TRANSITIONS_ADD_DURATION ? transitionFrames : -transitionFrames;
    }
  }

  return totalFrames;
};

// Calculate total duration in frames for UI timeline (sequential display)
// UI Timeline shows slides sequentially without overlaps for clean UX
export const calculateTotalFrames = (allSlides: TimelineSlide[], fps: number): number => {
  if (allSlides.length === 0) return 0;

  let totalFrames = 0;

  for (const slide of allSlides) {
    // Add slide duration only (no transitions in UI timeline)
    const actualDuration = getActualSlideDuration(slide.slide);
    totalFrames += Math.round(actualDuration * fps);
  }

  return totalFrames;
};

// Get slide start frame in Remotion rendering
// Formula: Previous slide start + Previous slide duration +/- Previous slide transition duration
export const getRealSlideStartFrame = (allSlides: TimelineSlide[], slideId: string, fps: number): number => {
  let frame = 0;

  for (const slide of allSlides) {
    if (slide.id === slideId) {
      return frame;
    }

    // Add this slide's duration
    const actualDuration = getActualSlideDuration(slide.slide);
    frame += Math.round(actualDuration * fps);

    // Add or subtract transition duration based on configuration
    if (slide.transition !== TransitionType.TRANSITION_NONE) {
      const transitionFrames = Math.round(TRANSITION_DURATION_SECONDS * fps);
      frame += TRANSITIONS_ADD_DURATION ? transitionFrames : -transitionFrames;
    }
  }

  return 0;
};

// Get slide start frame for UI timeline (sequential positioning)
export const getSlideStartFrame = (allSlides: TimelineSlide[], slideId: string, fps: number): number => {
  let frame = 0;

  for (const slide of allSlides) {
    if (slide.id === slideId) {
      return frame;
    }

    // Add this slide's duration only (no transitions in UI timeline)
    const actualDuration = getActualSlideDuration(slide.slide);
    frame += Math.round(actualDuration * fps);
  }

  return 0;
};

// Get the visual end frame for previews (last frame before transition starts)
// Formula depends on TRANSITIONS_ADD_DURATION:
// - If true (sequential): Slide Start + Slide Duration - 1
// - If false (overlapping): Slide Start + Slide Duration - Transition Duration - 1
export const getSlideVisualEndFrame = (allSlides: TimelineSlide[], slideId: string, fps: number): number => {
  const slide = allSlides.find(s => s.id === slideId);
  if (!slide) return 0;

  const startFrame = getRealSlideStartFrame(allSlides, slideId, fps);
  const actualDuration = getActualSlideDuration(slide.slide);
  const slideDurationFrames = Math.round(actualDuration * fps);

  // For slides with transitions
  if (slide.transition !== TransitionType.TRANSITION_NONE) {
    if (TRANSITIONS_ADD_DURATION) {
      // Sequential: visual end is at the end of slide content
      return startFrame + slideDurationFrames - 1;
    } else {
      // Overlapping: visual end is before transition starts
      const transitionFrames = Math.round(TRANSITION_DURATION_SECONDS * fps);
      return startFrame + slideDurationFrames - transitionFrames - 1;
    }
  }

  // For slides without transitions, visual end is the actual end
  return startFrame + slideDurationFrames - 1;
};

// Get the absolute end frame (very last frame slide exists in video)
// Formula: Slide Start + Slide Duration - 1
export const getSlideAbsoluteEndFrame = (allSlides: TimelineSlide[], slideId: string, fps: number): number => {
  const startFrame = getRealSlideStartFrame(allSlides, slideId, fps);
  const slide = allSlides.find(s => s.id === slideId);

  if (!slide) return startFrame;

  const actualDuration = getActualSlideDuration(slide.slide);
  const slideDurationFrames = Math.round(actualDuration * fps);

  return startFrame + slideDurationFrames - 1;
};

// Alias for preview behavior - use visual end frame for clean previews
export const getSlidePreviewEndFrame = getSlideVisualEndFrame;

// Alias for frame detection - use absolute end frame for accurate detection
export const getSlideEndFrame = getSlideAbsoluteEndFrame;

// Get the end frame for UI timeline (sequential display)
export const getSlideContentEndFrame = (allSlides: TimelineSlide[], slideId: string, fps: number): number => {
  const startFrame = getSlideStartFrame(allSlides, slideId, fps);
  const slide = allSlides.find(s => s.id === slideId);

  if (!slide) return startFrame;

  const actualDuration = getActualSlideDuration(slide.slide);
  const slideDurationFrames = Math.round(actualDuration * fps);

  return startFrame + slideDurationFrames - 1;
};

// Control whether transitions add to total duration (true) or overlap with slides (false)
// true: Transitions extend the video duration (sequential)
// false: Transitions overlap with slides (concurrent, reduces total duration)
export const TRANSITIONS_ADD_DURATION = false;
