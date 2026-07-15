export { backgroundStyleToCSS, patternToCSS, PATTERN_OPTIONS } from './backgroundUtils';
export { BackgroundLayer } from './BackgroundLayer';
export { getBackgroundEffectType, getBackgroundEffectKey, getSolidBackgroundColor, supportsAnimatedBackgroundEffect } from './backgroundEffectUtils';
export { Slideshow, SingleSlidePreview } from './RemotionSlideshow';
// Re-export types from animation for portal consumers
export type { PatchOverlay, ElementPatchEntry } from '@coasterai/animation';
export {
  resolveComponentFromId,
  getElementTypeFromId,
  type ComponentRegistration,
  buildDepthShadow,
  buildDepthTextShadow,
  parseDepthFromShadow,
  DEPTH_STYLE_PROPERTY,
  DEFAULT_MEDIA_DEPTH,
  MAX_ELEMENT_DEPTH,
} from '@coasterai/animation';
export { compileRemoteComponent, stripImports } from './compiler';
export type { CompilationResult, CompileRemoteComponentOptions } from './compiler';
export {
  loadTemplateSource,
  getCachedTemplateSource,
  sanitizeTemplateCode,
  loadPreparedTemplateSource,
} from './templateSource';
export { SUPPORTED_FONTS, loadFonts, loadAllFonts, loadRemotionFont } from './fonts';
export { brandingToTheme } from './utils';
export {
  TRANSITION_OPTIONS,
  TRANSITION_DIRECTION_OPTIONS,
  isDirectionSupportedTransition,
  getSlideTransitionDirectionValue,
  remotionDirectionToProto,
  protoDirectionToRemotion
} from './transitions/config';
