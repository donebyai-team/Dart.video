export { backgroundStyleToCSS } from './backgroundUtils';
export { getActualSlideDuration, TRANSITION_DURATION_SECONDS } from './frameUtils';
export { Slideshow, SlideComponent, SingleSlidePreview } from './RemotionSlideshow';
export {
  TRANSITION_OPTIONS,
  TRANSITION_DIRECTION_OPTIONS,
  isDirectionSupportedTransition,
  getSlideTransitionDirectionValue,
  remotionDirectionToProto,
  protoDirectionToRemotion
} from './transitions/config';
