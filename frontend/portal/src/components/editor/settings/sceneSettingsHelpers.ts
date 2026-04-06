import { DIRECTIONS, ENTRANCE_ANIMATIONS, HIGHLIGHT_STYLES, LOGO_ANIMATIONS, SCENE_COMPONENTS, SPLIT_BY_MODES, TEXT_CYCLE_TRANSITIONS, TYPOGRAPHY_VARIANT_NAMES } from "../../../../../packages/animation/src"
import { resolveComponentFromId } from '@coasterai/renderer'


export type SceneFieldKind = 'string' | 'number' | 'boolean' | 'string[]' | 'enum'
  | 'icon'
  | 'icon[]'
  | 'media'
  | 'media[]'

export type SceneFieldDefinition = {
  kind: SceneFieldKind
  options?: string[]
}

const SCENE_COMPONENT_NAME_SET = new Set(SCENE_COMPONENTS.map(component => component.name))

const RESERVED_FIELD_MAP: Record<string, SceneFieldDefinition> = {
  variant: {
    kind: 'enum',
    options: [...TYPOGRAPHY_VARIANT_NAMES],
  },
  varient: {
    kind: 'enum',
    options: [...TYPOGRAPHY_VARIANT_NAMES],
  },
  entranceAnimation: {
    kind: 'enum',
    options: [...ENTRANCE_ANIMATIONS],
  },
  direction: {
    kind: 'enum',
    options: [...DIRECTIONS],
  },
  logoAnimation: {
    kind: 'enum',
    options: [...LOGO_ANIMATIONS],
  },
  splitBy: {
    kind: 'enum',
    options: [...SPLIT_BY_MODES],
  },
  transition: {
    kind: 'enum',
    options: [...TEXT_CYCLE_TRANSITIONS],
  },
  text: {
    kind: 'string',
  },
  highlightStyle: {
    kind: 'enum',
    options: [...HIGHLIGHT_STYLES],
  }
}

export function toSceneFieldLabel(prop: string): string {
  return prop
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
}

export function getReservedSceneField(prop: string): SceneFieldDefinition | null {
  return RESERVED_FIELD_MAP[prop] ?? null
}

export function inferSceneFieldDefinition(prop: string, value: unknown): SceneFieldDefinition | null {
  const reserved = getReservedSceneField(prop)
  if (reserved) return reserved

  const lowerProp = prop.toLowerCase()

  const isMediaField =
    lowerProp === 'src' ||
    lowerProp === 'image' ||
    lowerProp === 'images' ||
    lowerProp === 'video' ||
    lowerProp === 'videos' ||
    lowerProp.includes('image') ||
    lowerProp.includes('video') ||
    lowerProp.includes('src')

  if (isMediaField && typeof value === 'string') {
    return { kind: 'media' }
  }
  if (isMediaField && Array.isArray(value) && value.every(item => typeof item === 'string')) {
    return { kind: 'media[]' }
  }

  if (lowerProp.includes('icon') && typeof value === 'string') {
    return { kind: 'icon' }
  }
  if (lowerProp.includes('icon') && Array.isArray(value)) {
    return { kind: 'icon[]' }
  }

  if (typeof value === 'string') return { kind: 'string' }
  if (typeof value === 'number') return { kind: 'number' }
  if (typeof value === 'boolean') return { kind: 'boolean' }
  if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
    return { kind: 'string[]' }
  }

  return null
}

function getSceneFieldPriority(prop: string): number {
  const lower = prop.toLowerCase()

  if (lower === 'text' || lower === 'children') return 0
  if (lower.includes('text') || lower === 'variant') return 1
  return 10
}

function getSceneFieldKindPriority(kind: SceneFieldKind): number {
  switch (kind) {
    case 'string':
      return 0
    case 'number':
      return 1
    case 'icon':
      return 2
    case 'icon[]':
      return 2
    case 'media':
      return 3
    case 'media[]':
      return 4
    case 'enum':
      return 5
    case 'boolean':
      return 6
    case 'string[]':
      return 7
    default:
      return 10
  }
}

export function getSceneFieldGroupLabel(kind: SceneFieldKind): string {
  switch (kind) {
    case 'string':
      return 'Text'
    case 'number':
      return 'Numbers'
    case 'icon':
      return 'Icons'
    case 'icon[]':
      return 'Icons'
    case 'media':
      return 'Media'
    case 'media[]':
      return 'Media'
    case 'enum':
      return 'Options'
    case 'boolean':
      return 'Toggles'
    case 'string[]':
      return 'Lists'
    default:
      return 'Fields'
  }
}

export function compareSceneFieldsByPriority(
  a: { prop: string; definition: SceneFieldDefinition },
  b: { prop: string; definition: SceneFieldDefinition },
): number {
  const kindDiff =
    getSceneFieldKindPriority(a.definition.kind) - getSceneFieldKindPriority(b.definition.kind)
  if (kindDiff !== 0) return kindDiff

  const priorityDiff = getSceneFieldPriority(a.prop) - getSceneFieldPriority(b.prop)
  if (priorityDiff !== 0) return priorityDiff
  return a.prop.localeCompare(b.prop)
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

export function resolveOwningSceneElementId(elementId: string): string | null {
  let current = elementId
  let resolvedSceneId: string | null = null

  // Child primitives keep their own ids for toolbar selection, but scene settings
  // should always target the owning scene id that appears as the suffix of a child id.
  // Nested ids follow "<child-local-id>-<parent-id>", and the child-local part may
  // itself contain dashes like "text-right" or "text-0". Because of that, we test
  // each remaining suffix as a full id by removing one leftmost segment at a time.
  // This is intentionally based on the scenes registry rather than registration.type,
  // because some scene-capable components (like text scenes) are typed as "content".
  while (current.length > 0) {
    const registration = resolveComponentFromId(current)
    if (registration && SCENE_COMPONENT_NAME_SET.has(registration.name)) {
      resolvedSceneId = current
    }

    const firstDashIdx = current.indexOf('-')
    if (firstDashIdx <= 0) break
    current = current.slice(firstDashIdx + 1)
  }

  return resolvedSceneId
}

export function getEditableSceneFields(
  elementId: string,
  overlay: Record<string, unknown>,
): Array<{ prop: string; value: unknown; definition: SceneFieldDefinition }> {
  const patchEntryId = resolveScenePatchEntryId(elementId, overlay)
  const patchEntry =
    patchEntryId && typeof overlay[patchEntryId] === 'object' && overlay[patchEntryId] !== null
      ? (overlay[patchEntryId] as Record<string, unknown>)
      : {}

  return Object.entries(patchEntry)
    .filter(([prop]) => prop !== 'style' && prop !== 'dragX' && prop !== 'dragY') // skip these fields to edit
    .map(([prop, value]) => ({
      prop,
      value,
      definition: inferSceneFieldDefinition(prop, value),
    }))
    .filter(
      (
        field,
      ): field is {
        prop: string
        value: unknown
        definition: SceneFieldDefinition
      } => field.definition !== null,
    )
    .sort((left, right) => compareSceneFieldsByPriority(left, right))
}

export function hasEditableSceneFields(
  elementId: string,
  overlay: Record<string, unknown>,
): boolean {
  return getEditableSceneFields(elementId, overlay).length > 0
}
