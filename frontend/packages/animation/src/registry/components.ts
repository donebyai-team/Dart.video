import { z } from 'zod';

/** Component taxonomy types. */
export type ComponentType = 'layout' | 'animation' | 'content' | 'scene' | 'headless' | 'brand';

/** Which animation types include this component. */
export type AnimationTypeName = 'text' | 'data' | 'presentation' | 'social' | 'custom';

export interface ComponentRegistration {
  /** Exact JSX component name as LLM writes it. Used for scope injection and AST ID assignment. */
  name: string;
  type: ComponentType;
  /** Zod schema for all props (type safety, patch validation). */
  fullSchema: z.ZodObject<z.ZodRawShape>;
  /** Subset of prop names shown in the editor toolbar. */
  editorProps: string[];
  /** Animation types that include this component. */
  animationTypes: AnimationTypeName[];
  /** One-line description for prompt generation. */
  description: string;
  /** Optional contract for validator AST duration fallback. */
  durationContract?: {
    kind: 'fixed' | 'formula' | 'manual';
    strategy?: 'wordCycle';
  };
}

// ── Schemas For LLM exposed prompt ────────────────────────────────────────────────────────────────

const frameTimingSchema = {
  startAt: z.number().default(0).optional().describe('Absolute frame when animation starts'),
  durationInFrames: z.number().describe('Animation duration in frames'),
};

const fixedFrameTimingSchema = (durationInFrames: number) => ({
  startAt: z.number().default(0).optional().describe('Absolute frame when animation starts'),
  durationInFrames: z.number().default(durationInFrames).optional().describe('Animation duration in frames'),
});

export const FadeInSchema = z.object({
  ...fixedFrameTimingSchema(30),
  children: z.any().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const FadeOutSchema = z.object({
  ...fixedFrameTimingSchema(30),
  children: z.any().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const SlideInSchema = z.object({
  ...fixedFrameTimingSchema(30),
  direction: z.enum(['up', 'down', 'left', 'right']).optional(),
  distance: z.number().optional(),
  children: z.any().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const SlideOutSchema = z.object({
  ...fixedFrameTimingSchema(30),
  direction: z.enum(['up', 'down', 'left', 'right']).optional(),
  distance: z.number().optional(),
  children: z.any().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const ScaleInSchema = z.object({
  ...fixedFrameTimingSchema(30),
  origin: z.enum(['center', 'top', 'bottom', 'left', 'right']).optional(),
  children: z.any().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const ScaleOutSchema = z.object({
  ...fixedFrameTimingSchema(30),
  origin: z.enum(['center', 'top', 'bottom', 'left', 'right']).optional(),
  children: z.any().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const StaggerSchema = z.object({
  startAt: z.number().default(0).optional(),
  staggerDelay: z.number().optional(),
  children: z.any().optional(),
});

export const TimelineGateSchema = z.object({
  showAfter: z.number(),
  hideAfter: z.number().optional(),
  children: z.any().optional(),
});

export const SafeAreaSchema = z.object({
  children: z.any().optional(),
});

export const StackSchema = z.object({
  gap: z.number().optional(),
  align: z.string().optional(),
  justify: z.string().optional(),
  style: z.any().optional(),
  children: z.any().optional(),
});

export const RowSchema = z.object({
  gap: z.number().optional(),
  align: z.string().optional(),
  justify: z.string().optional(),
  style: z.any().optional(),
  children: z.any().optional(),
});

export const AbsoluteCenterSchema = z.object({
  axis: z.enum(['x', 'y', 'both']).optional(),
  children: z.any().optional(),
});

export const TextSchema = z.object({
  variant: z.enum(['caption', 'label', 'body', 'subheading', 'heading', 'display']).optional(),
  style: z.any().optional(),
  className: z.string().optional(),
  children: z.any().optional(),
});

export const CounterSchema = z.object({
  ...fixedFrameTimingSchema(45),
  from: z.number().optional(),
  to: z.number(),
  format: z.string().optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  variant: z.enum(['caption', 'label', 'body', 'subheading', 'heading', 'display']).optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const TypewriterSchema = z.object({
  ...fixedFrameTimingSchema(60),
  text: z.string(),
  mode: z.enum(['char', 'word', 'line']).optional(),
  variant: z.enum(['caption', 'label', 'body', 'subheading', 'heading', 'display']).optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const WordCycleSchema = z.object({
  startAt: z.number().default(0).optional(),
  words: z.array(z.string()),
  holdDuration: z.number().default(45).optional(),
  transitionDuration: z.number().default(12).optional(),
  transition: z.enum(['flipY', 'fadeSwap', 'slideUp']).optional(),
  variant: z.enum(['caption', 'label', 'body', 'subheading', 'heading', 'display']).optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const TitleCardSchema = z.object({
  heading: z.string(),
  subheading: z.string().optional(),
  eyebrow: z.string().optional(),
  startAt: z.number().default(0).optional(),
});

export const LogoAssetSchema = z.object({
  src: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const ImageAssetSchema = z.object({
  src: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const VideoAssetSchema = z.object({
  src: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const IconAssetSchema = z.object({
  name: z.string(),
  size: z.number().optional(),
  borderRadius: z.number().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
  id: z.string().optional(),
});

// ── Registry ───────────────────────────────────────────────────────────────

const ALL_TYPES: AnimationTypeName[] = ['text', 'data', 'presentation', 'social', 'custom'];
const LAYOUT_TYPES: AnimationTypeName[] = ['text', 'data', 'presentation', 'social', 'custom'];

export const LAYOUT_COMPONENTS: ComponentRegistration[] = [
  {
    name: 'SafeArea',
    type: 'layout',
    fullSchema: SafeAreaSchema,
    editorProps: [],
    animationTypes: LAYOUT_TYPES,
    description: 'Outermost content wrapper that applies safe area insets from the active aspect preset',
  },
  {
    name: 'Stack',
    type: 'layout',
    fullSchema: StackSchema,
    editorProps: ['gap', 'align', 'justify'],
    animationTypes: LAYOUT_TYPES,
    description: 'Vertical flex layout with spacing token values for gap',
  },
  {
    name: 'Row',
    type: 'layout',
    fullSchema: RowSchema,
    editorProps: ['gap', 'align', 'justify'],
    animationTypes: LAYOUT_TYPES,
    description: 'Horizontal flex layout with spacing token values for gap',
  },
  {
    name: 'AbsoluteCenter',
    type: 'layout',
    fullSchema: AbsoluteCenterSchema,
    editorProps: ['axis'],
    animationTypes: LAYOUT_TYPES,
    description: 'Centers child absolutely within nearest positioned parent',
  },
];

export const ANIMATION_PRIMITIVE_COMPONENTS: ComponentRegistration[] = [
  {
    name: 'FadeIn',
    type: 'animation',
    fullSchema: FadeInSchema,
    editorProps: ['startAt', 'durationInFrames'],
    animationTypes: ALL_TYPES,
    description: 'Fade-in entrance animation (opacity 0 to 1)',
    durationContract: { kind: 'fixed' },
  },
  {
    name: 'FadeOut',
    type: 'animation',
    fullSchema: FadeOutSchema,
    editorProps: ['startAt', 'durationInFrames'],
    animationTypes: ALL_TYPES,
    description: 'Fade-out exit animation (opacity 1 to 0)',
    durationContract: { kind: 'fixed' },
  },
  {
    name: 'SlideIn',
    type: 'animation',
    fullSchema: SlideInSchema,
    editorProps: ['startAt', 'durationInFrames', 'direction', 'distance'],
    animationTypes: ALL_TYPES,
    description: 'Slide-in entrance with translation and fade',
    durationContract: { kind: 'fixed' },
  },
  {
    name: 'SlideOut',
    type: 'animation',
    fullSchema: SlideOutSchema,
    editorProps: ['startAt', 'durationInFrames', 'direction', 'distance'],
    animationTypes: ALL_TYPES,
    description: 'Slide-out exit with translation and fade',
    durationContract: { kind: 'fixed' },
  },
  {
    name: 'ScaleIn',
    type: 'animation',
    fullSchema: ScaleInSchema,
    editorProps: ['startAt', 'durationInFrames', 'origin'],
    animationTypes: ALL_TYPES,
    description: 'Scale-in entrance animation (scale 0 to 1)',
    durationContract: { kind: 'fixed' },
  },
  {
    name: 'ScaleOut',
    type: 'animation',
    fullSchema: ScaleOutSchema,
    editorProps: ['startAt', 'durationInFrames', 'origin'],
    animationTypes: ALL_TYPES,
    description: 'Scale-out exit animation (scale 1 to 0)',
    durationContract: { kind: 'fixed' },
  },
  {
    name: 'Stagger',
    type: 'animation',
    fullSchema: StaggerSchema,
    editorProps: ['startAt', 'staggerDelay'],
    animationTypes: ALL_TYPES,
    description: 'Staggers children animations with increasing delay offsets',
    durationContract: { kind: 'manual' },
  },
  {
    name: 'TimelineGate',
    type: 'animation',
    fullSchema: TimelineGateSchema,
    editorProps: ['showAfter', 'hideAfter'],
    animationTypes: ALL_TYPES,
    description: 'Mounts/unmounts children within a frame window, use instead of JSX conditionals',
  },
];

export const CONTENT_COMPONENTS: ComponentRegistration[] = [
  {
    name: 'Text',
    type: 'content',
    fullSchema: TextSchema,
    editorProps: ['variant'],
    animationTypes: ALL_TYPES,
    description: 'Static text element, wrap in FadeIn/SlideIn to animate',
  },
  {
    name: 'Counter',
    type: 'content',
    fullSchema: CounterSchema,
    editorProps: ['from', 'to', 'format', 'prefix', 'suffix', 'startAt', 'durationInFrames'],
    animationTypes: ['text', 'data', 'presentation', 'custom'],
    description: 'Animated number counter that tweens between values',
    durationContract: { kind: 'fixed' },
  },
  {
    name: 'Typewriter',
    type: 'content',
    fullSchema: TypewriterSchema,
    editorProps: ['text', 'mode', 'startAt', 'durationInFrames'],
    animationTypes: ['text', 'presentation', 'social', 'custom'],
    description: 'Progressively reveals text character by character, word, or line',
    durationContract: { kind: 'fixed' },
  },
  {
    name: 'WordCycle',
    type: 'content',
    fullSchema: WordCycleSchema,
    editorProps: ['startAt', 'words', 'holdDuration', 'transitionDuration', 'transition'],
    animationTypes: ['text', 'social', 'custom'],
    description: 'Cycles through an array of words with animated transitions',
    durationContract: { kind: 'formula', strategy: 'wordCycle' },
  },
];

/**
 * Static validator duration source of truth.
 *
 * When adding a new primitive that contributes to total animation duration:
 * - add its JSX name here
 * - update the renderer JSX duration analyzer if it needs custom timing semantics
 *
 * Custom scenes only work automatically when they are composed from these
 * existing primitives. If a custom scene has its own internal timing logic,
 * it must store or expose its duration in frames separately.
 */
export const ANIMATION_PRIMIIVES = [
  'FadeIn',
  'FadeOut',
  'SlideIn',
  'SlideOut',
  'ScaleIn',
  'ScaleOut',
  'Counter',
  'Typewriter',
] as const;

export const SCENE_COMPONENTS: ComponentRegistration[] = [
  {
    name: 'TitleCard',
    type: 'scene',
    fullSchema: TitleCardSchema,
    editorProps: ['heading', 'subheading', 'eyebrow', 'delay'],
    animationTypes: ['text', 'data', 'presentation', 'custom'],
    description: 'Pre-built hero title card composition with heading, subheading, and eyebrow',
  },
];

export const BRAND_COMPONENTS: ComponentRegistration[] = [
  {
    name: 'LogoAsset',
    type: 'brand',
    fullSchema: LogoAssetSchema,
    editorProps: ['src', 'width', 'height'],
    animationTypes: ALL_TYPES,
    description: 'Brand logo from ThemeProvider. Falls back to a placeholder if no logo is configured. Wrap in any animation primitive (FadeIn, SlideIn, ScaleIn etc.) to animate. the logo always keeps its aspect ratio.',
  },
  {
    name: 'ImageAsset',
    type: 'brand',
    fullSchema: ImageAssetSchema,
    editorProps: ['src', 'width', 'height'],
    animationTypes: ALL_TYPES,
    description: 'Generic image primitive for uploaded or remote media.'
  },
  {
    name: 'VideoAsset',
    type: 'brand',
    fullSchema: VideoAssetSchema,
    editorProps: ['src', 'width', 'height'],
    animationTypes: ALL_TYPES,
    description: 'Generic video primitive for uploaded media. Width and height define the rendered box; the video always preserves aspect ratio and stays fully visible.',
  },
  {
    name: 'IconAsset',
    type: 'brand',
    fullSchema: IconAssetSchema,
    editorProps: ['name', 'size'],
    animationTypes: ALL_TYPES,
    description: 'Icon asset from the icon library.'
  },
];

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
