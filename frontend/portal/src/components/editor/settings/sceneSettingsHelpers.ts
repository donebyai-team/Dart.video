
import {
  ANIMATION_PRESET_ENTRANCE_ANIMATIONS,
  ANIMATION_PRESET_EXIT_ANIMATIONS,
} from '@coasterai/animation/src/core/animation_preset/AnimationPreset'
import {
  DIRECTIONS,
  getElementSchema,
  HIGHLIGHT_STYLES,
  HIGHLIGHTED_TEXT_ANIMATIONS,
  LOGO_ANIMATIONS,
  SPLIT_BY_MODES,
  STACK_ANIMATIONS,
  TEXT_CYCLE_TRANSITIONS,
  TYPOGRAPHY_VARIANT_NAMES,
  type FieldSchema,
} from '@coasterai/animation/src'
import { MEDIA_MOTION_PRESETS } from '@coasterai/animation/src/core/animation_preset/MediaMotionPreset'

const RESERVED_FIELD_MAP: Record<string, string[]> = {
  variant: [...TYPOGRAPHY_VARIANT_NAMES],
  varient: [...TYPOGRAPHY_VARIANT_NAMES],
  entranceAnimation: [...ANIMATION_PRESET_ENTRANCE_ANIMATIONS],
  direction: [...DIRECTIONS],
  logoAnimation: [...LOGO_ANIMATIONS],
  splitBy: [...SPLIT_BY_MODES],
  transition: [...TEXT_CYCLE_TRANSITIONS],
  highlightStyle: [...HIGHLIGHT_STYLES],
  highlightedTextAnimation: [...HIGHLIGHTED_TEXT_ANIMATIONS],
  textCycleTransition: [...TEXT_CYCLE_TRANSITIONS],
  stackAnimation: [...STACK_ANIMATIONS],
  motionPreset: [...MEDIA_MOTION_PRESETS],
  exitAnimation: [...ANIMATION_PRESET_EXIT_ANIMATIONS],
}

export function toSceneFieldLabel(prop: string): string {
  return prop
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
}

export function getReservedSceneFieldOptions(prop: string): string[] | null {
  return RESERVED_FIELD_MAP[prop] ?? null
}

function isEditableSceneProp(prop: string): boolean {
  return !prop.startsWith('_') && prop !== 'style' && prop !== 'dragX' && prop !== 'dragY'
}

export function resolveScenePatchEntryId(
  elementId: string,
  overlay: Record<string, unknown>,
): string | null {
  if (elementId in overlay) return elementId

  let current = elementId
  while (current.includes('-')) {
    current = current.slice(0, current.lastIndexOf('-'))
    if (current in overlay) return current
  }

  return null
}

export function getEditableSceneFields(
  elementId: string,
  overlay: Record<string, unknown>,
): FieldSchema[] {
  const componentName = overlay.name as string

  return getElementSchema(componentName, elementId).filter(field => isEditableSceneProp(field.name))
}

export function hasEditableSceneFields(
  elementId: string,
  overlay: Record<string, unknown>,
): boolean {
  return getEditableSceneFields(elementId, overlay).length > 0
}
