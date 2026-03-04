import { Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb';

export const TRANSITION_DURATION_SECONDS = 0.5;

/**
 * Get the actual duration of a slide.
 * For other slides, returns the slide's duration property.
 */
export function getActualSlideDuration(slide: Slide): number {
  return slide.duration;
}
