export { backgroundStyleToCSS } from './backgroundUtils';
export { transformAnimation } from './ast-transform';
export type { TransformResult, RegistryEntry, AnimatedPropInfo, EditablePropInfo } from './types/ast';
export { Slideshow, SlideComponent, SingleSlidePreview } from './RemotionSlideshow';
export { assignPrimitiveIds } from './primitive-ast-pass';
export { probeRender } from './probeRender';
export type { PrimitiveIdRegistry, PrimitiveElement } from './primitive-ast-pass';
// Re-export patch types from animation for portal consumers
export type { PatchOverlay, ElementPatchEntry } from '@coasterai/animation';
export { compileRemoteComponent, stripImports } from './compiler';
export type { CompilationResult, CompileRemoteComponentOptions } from './compiler';
export {
  TRANSITION_OPTIONS,
  TRANSITION_DIRECTION_OPTIONS,
  isDirectionSupportedTransition,
  getSlideTransitionDirectionValue,
  remotionDirectionToProto,
  protoDirectionToRemotion
} from './transitions/config';
