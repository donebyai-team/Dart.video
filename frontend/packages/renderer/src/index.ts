export { backgroundStyleToCSS } from './backgroundUtils';
export { Slideshow, SlideComponent, SingleSlidePreview } from './RemotionSlideshow';
export { assignPrimitiveIds, transformAssignedPrimitiveIds } from './primitive-ast-pass';
// Re-export types from animation for portal consumers
export type { PatchOverlay, ElementPatchEntry } from '@coasterai/animation';
export {
  resolveComponentFromId,
  getElementTypeFromId,
  type ComponentRegistration,
} from '@coasterai/animation';
export { compileRemoteComponent, stripImports } from './compiler';
export type { CompilationResult, CompileRemoteComponentOptions } from './compiler';
export { SUPPORTED_FONTS, loadAllFonts } from './load_fonts';
export {
  TRANSITION_OPTIONS,
  TRANSITION_DIRECTION_OPTIONS,
  isDirectionSupportedTransition,
  getSlideTransitionDirectionValue,
  remotionDirectionToProto,
  protoDirectionToRemotion
} from './transitions/config';
