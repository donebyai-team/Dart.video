import { z } from 'zod';
import { ComponentRegistration } from '..';
import { SCENE_COMPONENTS } from '../scenes';
import {
  frameContractFragment,
  componentListFragment,
} from './fragments';

interface ComponentGroup {
  title: string;
  description: string;
  components: ComponentRegistration[];
}

const COMPONENT_GROUPS: ComponentGroup[] = [
  { title: 'Scenes', description: 'standalone, no siblings', components: SCENE_COMPONENTS },
  // { title: 'Layout Primitives', description: 'structural only, every visible element must live inside one', components: LAYOUT_COMPONENTS },
  // { title: 'Motion Primitives', description: 'wraps exactly one child, never wraps Layout', components: ANIMATION_PRIMITIVE_COMPONENTS },
  // { title: 'Static Primitives', description: 'no built-in animation, wrap in Motion to animate', components: STATIC_PRIMITIVES },
  // { title: 'Dynamic Primitives', description: 'self-animating, never wrap in Motion, use startAt directly', components: DYNAMIC_PRIMITIVES },
  // { title: 'Asset Primitives', description: 'no built-in animation, wrap in Motion to animate', components: BRAND_COMPONENTS },
];

function formatComponentLine(component: ComponentRegistration): string {
  return `${component.name} — ${component.description}`;
}

function formatComponentSection(title: string, description: string, components: ComponentRegistration[]): string | null {
  if (components.length === 0) return null;

  return [
    `### ${title} - ${description}`,
    ...components.map(formatComponentLine),
  ].join('\n');
}

function getOnlyComponentsDescriptionPrompt(): string {
  const sections = [
    '## AVAILABLE COMPONENTS',
    '',
    "Use only these when designing your concept. Do not invent components that don't exist.",
    ...COMPONENT_GROUPS.map((g) => formatComponentSection(g.title, g.description, g.components)),
  ].filter((section): section is string => Boolean(section));

  return sections.join('\n\n');
}

// ── JSON schema helpers ──────────────────────────────────────────────

function unwrapZod(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return unwrapZod(schema._def.innerType);
  }
  if (schema instanceof z.ZodDefault) {
    return unwrapZod(schema._def.innerType);
  }
  return schema;
}

function describeZodType(schema: z.ZodTypeAny): string {
  const inner = unwrapZod(schema);
  if (inner instanceof z.ZodEnum) {
    return `enum(${(inner._def.values as string[]).join('|')})`;
  }
  if (inner instanceof z.ZodNumber) return 'number';
  if (inner instanceof z.ZodString) return 'string';
  if (inner instanceof z.ZodArray) return 'array';
  if (inner instanceof z.ZodBoolean) return 'boolean';
  return 'any';
}

function getZodDefault(schema: z.ZodTypeAny): unknown | undefined {
  if (schema instanceof z.ZodDefault) {
    return schema._def.defaultValue();
  }
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return getZodDefault(schema._def.innerType);
  }
  if (schema instanceof z.ZodEffects) {
    return getZodDefault(schema._def.schema);
  }
  return undefined;
}

interface PropJson {
  name: string;
  type: string;
  required: boolean;
  default?: unknown;
}

interface ComponentJson {
  name: string;
  id: string;
  description: string;
  props: PropJson[];
}

interface ComponentGroupJson {
  title: string;
  description: string;
  components: ComponentJson[];
}

function componentToJson(c: ComponentRegistration): ComponentJson {
  const shape = c.fullSchema.shape;
  const props: PropJson[] = [];

  for (const [key, field] of Object.entries(shape)) {
    if (key === 'children' || key === 'style' || key === 'className' || key === 'id') continue;

    const zodField = field as z.ZodTypeAny;
    const prop: PropJson = {
      name: key,
      type: describeZodType(zodField),
      required: !zodField.isOptional(),
    };

    const defaultVal = getZodDefault(zodField);
    if (defaultVal !== undefined) {
      prop.default = defaultVal;
    }

    props.push(prop);
  }

  return { name: c.name, id: c.name.toLocaleLowerCase(), description: c.description, props };
}

function getComponentGroupsJson(): ComponentGroupJson[] {
  return COMPONENT_GROUPS
    .filter((g) => g.components.length > 0)
    .map((g) => ({
      title: g.title,
      description: g.description,
      components: g.components.map(componentToJson),
    }));
}

// ── Public API ────────────────────────────────────────────────────────

export function getAnimationPrompt(
  opts?: {
    mode?: 'only_components_description';
  }
): string {
  if (opts?.mode === 'only_components_description') {
    return getOnlyComponentsDescriptionPrompt();
  }

  const sections = [
    frameContractFragment(),
    // canvasDimensionsFragment(ASPECT_PRESETS['web']),
    ...COMPONENT_GROUPS.map((g) => componentListFragment(`${g.title} — ${g.description}`, g.components)),
    // spacingFragment(),
    // typographyFragment(),
    // exampleFragment(),
  ];

  return sections.join('\n\n');
}

export function getAnimationPromptJson(): ComponentGroupJson[] {
  return getComponentGroupsJson();
}
