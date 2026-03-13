import { Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb';

export const TRANSITION_DURATION_SECONDS = 0.5;

/**
 * Get the actual duration of a slide in seconds.
 * Prefers durationInFrames (new field, frames at 30fps) over duration (old field, seconds).
 */
export function getActualSlideDuration(slide: Slide): number {
  if (slide.durationInFrames > 0) return slide.durationInFrames / 30;
  return slide.duration;
}
