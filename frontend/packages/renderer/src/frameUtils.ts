import { Slide, SlideType, StackSlideContent } from '@coasterai/pb/coasterai/core/v1/slide_pb';

export const TRANSITION_DURATION_SECONDS = 0.3;

/**
 * Get the actual duration of a slide.
 * For stack slides, calculates duration from nested items.
 * For other slides, returns the slide's duration property.
 */
export function getActualSlideDuration(slide: Slide): number {
  if (slide.type === SlideType.STACK && slide.content) {
    const stackContent = slide.content.value as StackSlideContent;
    if (stackContent?.items && Array.isArray(stackContent.items)) {
      return stackContent.items.reduce((sum: number, item: any) => sum + (item.duration || 0), 0);
    }
  }
  return slide.duration;
}
