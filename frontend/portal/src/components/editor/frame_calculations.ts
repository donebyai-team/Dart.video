

// Calculate total duration in frames for Remotion rendering (with overlapping transitions)
import { Slide, SlideType, StackSlideContent, TransitionType } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { TimelineSlide } from "./timeline/types";

// Formula: Sum of slide durations - Sum of transition durations
export const calculateRealTotalFrames = (allSlides: TimelineSlide[], fps: number): number => {
  if (allSlides.length === 0) return 0;

  let totalFrames = 0;

  // Add all slide durations
  for (const slide of allSlides) {
    const actualDuration = getActualSlideDuration(slide.slide);
    totalFrames += Math.round(actualDuration * fps);
  }

  // Subtract all transition durations (they overlap with slide content)
  for (const slide of allSlides) {
    if (slide.transition !== TransitionType.TRANSITION_NONE) {
      totalFrames -= Math.round(TRANSITION_DURATION_SECONDS * fps);
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

// Get slide start frame in Remotion rendering (with overlapping transitions)
// Formula: Previous slide start + Previous slide duration - Previous slide transition duration
export const getRealSlideStartFrame = (allSlides: TimelineSlide[], slideId: string, fps: number): number => {
  let frame = 0;

  for (let i = 0; i < allSlides.length; i++) {
    const slide = allSlides[i];

    if (slide.id === slideId) {
      return frame;
    }

    // Add this slide's duration
    const actualDuration = getActualSlideDuration(slide.slide);
    frame += Math.round(actualDuration * fps);

    // Subtract transition duration if this slide has a transition (overlap)
    if (slide.transition !== TransitionType.TRANSITION_NONE) {
      frame -= Math.round(TRANSITION_DURATION_SECONDS * fps);
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
// Formula: Slide Start + Slide Duration - Transition Duration - 1
export const getSlideVisualEndFrame = (allSlides: TimelineSlide[], slideId: string, fps: number): number => {
  const slide = allSlides.find(s => s.id === slideId);
  console.log("erkjjkrebjkew", slide?.slide, slideId)
  if (!slide) return 0;

  const startFrame = getRealSlideStartFrame(allSlides, slideId, fps);
  const actualDuration = getActualSlideDuration(slide.slide);
  const slideDurationFrames = Math.round(actualDuration * fps);

  // For slides with transitions, visual end is before transition starts
  if (slide.transition !== TransitionType.TRANSITION_NONE) {
    const transitionFrames = Math.round(TRANSITION_DURATION_SECONDS * fps);
    return startFrame + slideDurationFrames - transitionFrames - 1;
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

// Transition duration in seconds
export const TRANSITION_DURATION_SECONDS = 0.3;

/**
 * Get the actual duration of a slide
 * For stack slides, calculates duration from nested items
 * For other slides, returns the slide's duration property
 */
export const getActualSlideDuration = (slide: Slide): number => {
  if (slide.type === SlideType.STACK && slide.content) {
    const stackContent = slide.content.value as StackSlideContent;
    if (stackContent.items && Array.isArray(stackContent.items)) {
      return stackContent.items.reduce((sum: number, item: any) => sum + (item.duration || 0), 0);
    }
  }
  return slide.duration;
};