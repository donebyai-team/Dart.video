import { SCENE_COMPONENTS } from './scenes';
import { CONTENT_COMPONENTS } from './assets';
import { LAYOUT_COMPONENTS } from './layouts';
import { FieldSchema } from './types';

/** Component taxonomy types. */
export type ComponentType = 'layout' | 'animation' | 'content' | 'scene' | 'headless' | 'brand';


export interface ComponentRegistration {
  /** Exact JSX component name as LLM writes it. Used for scope injection and AST ID assignment. */
  name: string;
  tags?: string[];
  description: string;
  type: ComponentType;
  schema?: any;
  llmSchema?: any;
  celExpression?: string;
}


export const COMPONENT_REGISTRY: ComponentRegistration[] = [
  ...CONTENT_COMPONENTS,
  ...SCENE_COMPONENTS,
  ...LAYOUT_COMPONENTS,
];

/** Set of all registered component names. Used for AST ID pass and scope injection. */
export const REGISTERED_COMPONENT_NAMES = new Set(COMPONENT_REGISTRY.map((c) => c.name));

/** Layout component names — these get no id and are not selectable. */
export const LAYOUT_COMPONENT_NAMES = new Set(
  COMPONENT_REGISTRY.filter((c) => c.type === 'layout').map((c) => c.name),
);

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
 * Also supports nested IDs like "textstagger-logowithbrandname-0" by walking
 * backward through dashed prefixes until a registered component name is found.
 * Returns null for raw HTML (el-*) and custom components (custom-*).
 */
export function resolveComponentFromId(id: string): ComponentRegistration | null {
  const dashIdx = id.lastIndexOf('-');
  if (dashIdx <= 0) {
    const registration = REGISTRY_BY_LOWERCASE.get(id);
    if (registration) return registration;
  };

  let prefix = id.substring(0, dashIdx);

  while (prefix.length > 0) {
    const registration = REGISTRY_BY_LOWERCASE.get(prefix);
    if (registration) return registration;

    const nextDashIdx = prefix.lastIndexOf('-');
    if (nextDashIdx <= 0) break;
    prefix = prefix.substring(0, nextDashIdx);
  }

  return null;
}


// TODO: We should simply replave this with backend sending the
// FieldSchema
export function getElementSchema(
  componentName: string,
  elementId: string
): FieldSchema[] {
  console.debug("Component:", componentName, "Element:", elementId)

  if (!componentName){
    return []
  }

  let registration = REGISTRY_BY_LOWERCASE.get(componentName.toLowerCase());
  // TODO: Remove later
  if (componentName.includes("TextWithImageScene") || componentName.includes("TextWithVideoScene")) {
    registration = REGISTRY_BY_LOWERCASE.get("textwithmediascene");
  }

  if (!registration) {
    console.error(`Component ${componentName} not found`)
    return [];
  }

  const schema = registration.schema ?? [];

  const normalizedElementId = elementId
    .toLowerCase()
    .replace(/imageasset/g, "mediaasset")
    .replace(/videoasset/g, "mediaasset");

  // Priority:
  // 1. Full elementId
  // 2. Split parts of elementId
  const candidates = [
    normalizedElementId,
    ...normalizedElementId.split("-"),
  ];

  for (const candidate of candidates) {
    for (const item of schema) {
      // Match top-level schema.name
      if (item.name?.toLowerCase() === candidate) {
        return item.fields ?? [];
      }

      // Match nested components[].name
      if (Array.isArray(item.components)) {
        const matchedComponent = item.components.find(
          (c: any) => c.name?.toLowerCase() === candidate
        );

        if (matchedComponent) {
          return matchedComponent.fields ?? [];
        }
      }
    }
  }

  console.error(`Schema fields not found for elementId "${elementId}"`)
  return [];
}

export function isMediaComponent(id: string): boolean {
  const componentName = resolveComponentFromId(id)?.name
  return componentName === 'ImageAsset' ||
    componentName === 'LogoAsset' ||
    componentName === 'VideoAsset' ||
    componentName === 'MediaAsset'
}

export function isPlainTextElement(id: string): boolean {
  return resolveComponentFromId(id)?.name === 'Text'
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
