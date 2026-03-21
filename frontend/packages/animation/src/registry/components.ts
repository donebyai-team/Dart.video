import { z } from 'zod';
import { LAYOUT_COMPONENTS } from './layouts';
import { ANIMATION_PRIMITIVE_COMPONENTS } from './animation_primitives';
import { CONTENT_COMPONENTS } from './content';
import { SCENE_COMPONENTS } from './scenes';
import { BRAND_COMPONENTS } from './assets';

/** Component taxonomy types. */
export type ComponentType = 'layout' | 'animation' | 'content' | 'scene' | 'headless' | 'brand';

export interface ComponentRegistration {
  /** Exact JSX component name as LLM writes it. Used for scope injection and AST ID assignment. */
  name: string;
  type: ComponentType;
  /** Zod schema for all props (type safety, patch validation). */
  fullSchema: z.ZodObject<z.ZodRawShape>;
  /** Subset of prop names shown in the editor toolbar. */
  editorProps: string[];
  /** One-line description for prompt generation. */
  description: string;
  /** Optional contract for validator AST duration fallback. */
  durationContract?: {
    kind: 'fixed' | 'formula' | 'manual';
    strategy?: 'wordCycle';
  };
}


export const COMPONENT_REGISTRY: ComponentRegistration[] = [
  ...LAYOUT_COMPONENTS,
  ...ANIMATION_PRIMITIVE_COMPONENTS,
  ...CONTENT_COMPONENTS,
  ...SCENE_COMPONENTS,
  ...BRAND_COMPONENTS,
];

/** Set of all registered component names. Used for AST ID pass and scope injection. */
export const REGISTERED_COMPONENT_NAMES = new Set(COMPONENT_REGISTRY.map((c) => c.name));

/** Layout component names — these get no id and are not selectable. */
export const LAYOUT_COMPONENT_NAMES = new Set(
  COMPONENT_REGISTRY.filter((c) => c.type === 'layout').map((c) => c.name),
);

function extractSchemaDefault(schema: z.ZodTypeAny): unknown {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return extractSchemaDefault(schema._def.innerType);
  }
  if (schema instanceof z.ZodDefault) {
    return schema._def.defaultValue();
  }
  return undefined;
}

export function getComponentTimingDefaults(name: string): { startAt?: number; durationInFrames?: number } | null {
  const registration = getComponentRegistration(name);
  if (!registration) return null;

  const shape = registration.fullSchema.shape;
  const startAtDefault = shape.startAt ? extractSchemaDefault(shape.startAt) : undefined;
  const durationDefault = shape.durationInFrames ? extractSchemaDefault(shape.durationInFrames) : undefined;
  const startAt = typeof startAtDefault === 'number'
    ? startAtDefault
    : undefined;
  const durationInFrames = typeof durationDefault === 'number'
    ? durationDefault
    : undefined;

  if (startAt === undefined && durationInFrames === undefined) return null;
  return { startAt, durationInFrames };
}

/** Lowercase name → registration lookup. Built once. */
const REGISTRY_BY_LOWERCASE = new Map(
  COMPONENT_REGISTRY.map((c) => [c.name.toLowerCase(), c]),
);

/** Look up a registration by component name. */
export function getComponentRegistration(name: string): ComponentRegistration | undefined {
  return COMPONENT_REGISTRY.find((c) => c.name === name);
}

/**
 * Resolve a primitive element ID to its ComponentRegistration.
 * Derives component name from the ID prefix: "fadein-0" → "fadein" → FadeIn.
 * Returns null for raw HTML (el-*) and custom components (custom-*).
 */
export function resolveComponentFromId(id: string): ComponentRegistration | null {
  const dashIdx = id.lastIndexOf('-');
  if (dashIdx <= 0) return null;
  const prefix = id.substring(0, dashIdx);
  return REGISTRY_BY_LOWERCASE.get(prefix) ?? null;
}

/**
 * Determine element type from its ID prefix.
 *   "fadein-0"  → 'primitive'
 *   "el-0"      → 'html'
 *   "custom-0"  → 'custom'
 */
export function getElementTypeFromId(id: string): 'primitive' | 'html' | 'custom' {
  if (id.startsWith('el-')) return 'html';
  if (id.startsWith('custom-')) return 'custom';
  return 'primitive';
}
