export { backgroundStyleToCSS } from './backgroundUtils';
export { transformAnimation } from './ast-transform';
export type { TransformResult, RegistryEntry, AnimatedPropInfo, EditablePropInfo } from './types/ast';
export { Slideshow, SlideComponent, SingleSlidePreview } from './RemotionSlideshow';
export {
  TRANSITION_OPTIONS,
  TRANSITION_DIRECTION_OPTIONS,
  isDirectionSupportedTransition,
  getSlideTransitionDirectionValue,
  remotionDirectionToProto,
  protoDirectionToRemotion
} from './transitions/config';
