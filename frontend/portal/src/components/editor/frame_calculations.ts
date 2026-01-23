import { Section, Slide, SlideType, TransitionType } from "@/types/slides";

// Calculate total duration in frames for Remotion rendering (with overlapping transitions)
// Formula: Sum of slide durations - Sum of transition durations
export const calculateRealTotalFrames = (sections: Section[], fps: number): number => {
  const allSlides = sections.flatMap(section => section.slides);
  if (allSlides.length === 0) return 0;

  let totalFrames = 0;

  // Add all slide durations
  for (const slide of allSlides) {
    const actualDuration = getActualSlideDuration(slide);
    totalFrames += Math.round(actualDuration * fps);
  }

  // Subtract all transition durations (they overlap with slide content)
  for (const slide of allSlides) {
    if (slide.transition && slide.transition !== TransitionType.NONE) {
      totalFrames -= Math.round(TRANSITION_DURATION_SECONDS * fps);
    }
  }

  return totalFrames;
};

// Calculate total duration in frames for UI timeline (sequential display)
// UI Timeline shows slides sequentially without overlaps for clean UX
export const calculateTotalFrames = (sections: Section[], fps: number): number => {
  const allSlides = sections.flatMap(section => section.slides);
  if (allSlides.length === 0) return 0;

  let totalFrames = 0;

  for (const slide of allSlides) {
    // Add slide duration only (no transitions in UI timeline)
    const actualDuration = getActualSlideDuration(slide);
    totalFrames += Math.round(actualDuration * fps);
  }

  return totalFrames;
};

// Get slide start frame in Remotion rendering (with overlapping transitions)
// Formula: Previous slide start + Previous slide duration - Previous slide transition duration
export const getRealSlideStartFrame = (sections: Section[], slideId: string, fps: number): number => {
  const allSlides = sections.flatMap(section => section.slides);
  let frame = 0;

  for (let i = 0; i < allSlides.length; i++) {
    const slide = allSlides[i];

    if (slide.id === slideId) {
      return frame;
    }

    // Add this slide's duration
    const actualDuration = getActualSlideDuration(slide);
    frame += Math.round(actualDuration * fps);

    // Subtract transition duration if this slide has a transition (overlap)
    if (slide.transition && slide.transition !== TransitionType.NONE) {
      frame -= Math.round(TRANSITION_DURATION_SECONDS * fps);
    }
  }

  return 0;
};

// Get slide start frame for UI timeline (sequential positioning)
export const getSlideStartFrame = (sections: Section[], slideId: string, fps: number): number => {
  const allSlides = sections.flatMap(section => section.slides);
  let frame = 0;

  for (const slide of allSlides) {
    if (slide.id === slideId) {
      return frame;
    }

    // Add this slide's duration only (no transitions in UI timeline)
    const actualDuration = getActualSlideDuration(slide);
    frame += Math.round(actualDuration * fps);
  }

  return 0;
};

// Get the visual end frame for previews (last frame before transition starts)
// Formula: Slide Start + Slide Duration - Transition Duration - 1
export const getSlideVisualEndFrame = (sections: Section[], slideId: string, fps: number): number => {
  const allSlides = sections.flatMap(section => section.slides);
  const slide = allSlides.find(s => s.id === slideId);

  if (!slide) return 0;

  const startFrame = getRealSlideStartFrame(sections, slideId, fps);
  const actualDuration = getActualSlideDuration(slide);
  const slideDurationFrames = Math.round(actualDuration * fps);

  // For slides with transitions, visual end is before transition starts
  if (slide.transition && slide.transition !== TransitionType.NONE) {
    const transitionFrames = Math.round(TRANSITION_DURATION_SECONDS * fps);
    return startFrame + slideDurationFrames - transitionFrames - 1;
  }

  // For slides without transitions, visual end is the actual end
  return startFrame + slideDurationFrames - 1;
};

// Get the absolute end frame (very last frame slide exists in video)
// Formula: Slide Start + Slide Duration - 1
export const getSlideAbsoluteEndFrame = (sections: Section[], slideId: string, fps: number): number => {
  const startFrame = getRealSlideStartFrame(sections, slideId, fps);
  const allSlides = sections.flatMap(section => section.slides);
  const slide = allSlides.find(s => s.id === slideId);

  if (!slide) return startFrame;

  const actualDuration = getActualSlideDuration(slide);
  const slideDurationFrames = Math.round(actualDuration * fps);

  return startFrame + slideDurationFrames - 1;
};

// Alias for preview behavior - use visual end frame for clean previews
export const getSlidePreviewEndFrame = getSlideVisualEndFrame;

// Alias for frame detection - use absolute end frame for accurate detection
export const getSlideEndFrame = getSlideAbsoluteEndFrame;

// Get the end frame for UI timeline (sequential display)
export const getSlideContentEndFrame = (sections: Section[], slideId: string, fps: number): number => {
  const startFrame = getSlideStartFrame(sections, slideId, fps);
  const allSlides = sections.flatMap(section => section.slides);
  const slide = allSlides.find(s => s.id === slideId);

  if (!slide) return startFrame;

  const actualDuration = getActualSlideDuration(slide);
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
    const stackContent = slide.content as any;
    if (stackContent.items && Array.isArray(stackContent.items)) {
      return stackContent.items.reduce((sum: number, item: any) => sum + (item.duration || 0), 0);
    }
  }
  return slide.duration;
};