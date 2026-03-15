import { z } from 'zod';

/** Component taxonomy types. */
export type ComponentType = 'layout' | 'animation' | 'content' | 'scene' | 'headless';

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
}

// ── Schemas ────────────────────────────────────────────────────────────────

const frameTimingSchema = {
  delay: z.number().optional().describe('Frames before animation starts'),
  duration: z.number().optional().describe('Animation duration in frames'),
};

export const FadeInSchema = z.object({
  ...frameTimingSchema,
  children: z.any().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const FadeOutSchema = z.object({
  ...frameTimingSchema,
  children: z.any().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const SlideInSchema = z.object({
  ...frameTimingSchema,
  direction: z.enum(['up', 'down', 'left', 'right']).optional(),
  distance: z.number().optional(),
  children: z.any().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const SlideOutSchema = z.object({
  ...frameTimingSchema,
  direction: z.enum(['up', 'down', 'left', 'right']).optional(),
  distance: z.number().optional(),
  children: z.any().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const ScaleInSchema = z.object({
  ...frameTimingSchema,
  origin: z.enum(['center', 'top', 'bottom', 'left', 'right']).optional(),
  children: z.any().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const ScaleOutSchema = z.object({
  ...frameTimingSchema,
  origin: z.enum(['center', 'top', 'bottom', 'left', 'right']).optional(),
  children: z.any().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const StaggerSchema = z.object({
  startAt: z.number().optional(),
  delayBetween: z.number().optional(),
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
  ...frameTimingSchema,
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
  ...frameTimingSchema,
  text: z.string(),
  mode: z.enum(['char', 'word', 'line']).optional(),
  variant: z.enum(['caption', 'label', 'body', 'subheading', 'heading', 'display']).optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const WordCycleSchema = z.object({
  delay: z.number().optional(),
  words: z.array(z.string()),
  holdDuration: z.number().optional(),
  transitionDuration: z.number().optional(),
  transition: z.enum(['flipY', 'fadeSwap', 'slideUp']).optional(),
  variant: z.enum(['caption', 'label', 'body', 'subheading', 'heading', 'display']).optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const TitleCardSchema = z.object({
  heading: z.string(),
  subheading: z.string().optional(),
  eyebrow: z.string().optional(),
  delay: z.number().optional(),
});

// ── Registry ───────────────────────────────────────────────────────────────

const ALL_TYPES: AnimationTypeName[] = ['text', 'data', 'presentation', 'social', 'custom'];
const LAYOUT_TYPES: AnimationTypeName[] = ['text', 'data', 'presentation', 'social', 'custom'];

export const COMPONENT_REGISTRY: ComponentRegistration[] = [
  // Layout
  {
    name: 'SafeArea',
    type: 'layout',
    fullSchema: SafeAreaSchema,
    editorProps: [],
    animationTypes: LAYOUT_TYPES,
    description: 'Outermost content wrapper — applies safe area insets from the active aspect preset',
  },
  {
    name: 'Stack',
    type: 'layout',
    fullSchema: StackSchema,
    editorProps: ['gap', 'align', 'justify'],
    animationTypes: LAYOUT_TYPES,
    description: 'Vertical flex layout — gap must use spacing token values (4|8|12|16|24|32|48|64|96)',
  },
  {
    name: 'Row',
    type: 'layout',
    fullSchema: RowSchema,
    editorProps: ['gap', 'align', 'justify'],
    animationTypes: LAYOUT_TYPES,
    description: 'Horizontal flex layout — gap must use spacing token values',
  },
  {
    name: 'AbsoluteCenter',
    type: 'layout',
    fullSchema: AbsoluteCenterSchema,
    editorProps: ['axis'],
    animationTypes: LAYOUT_TYPES,
    description: 'Centers child absolutely within nearest positioned parent — axis: x|y|both',
  },
  // Animation primitives
  {
    name: 'FadeIn',
    type: 'animation',
    fullSchema: FadeInSchema,
    editorProps: ['delay', 'duration'],
    animationTypes: ALL_TYPES,
    description: 'Opacity 0→1 entrance — frame delay? duration?',
  },
  {
    name: 'FadeOut',
    type: 'animation',
    fullSchema: FadeOutSchema,
    editorProps: ['delay', 'duration'],
    animationTypes: ALL_TYPES,
    description: 'Opacity 1→0 exit — frame delay? duration?',
  },
  {
    name: 'SlideIn',
    type: 'animation',
    fullSchema: SlideInSchema,
    editorProps: ['delay', 'duration', 'direction', 'distance'],
    animationTypes: ALL_TYPES,
    description: 'Translate+fade entrance — frame delay? duration? direction?(up|down|left|right) distance?',
  },
  {
    name: 'SlideOut',
    type: 'animation',
    fullSchema: SlideOutSchema,
    editorProps: ['delay', 'duration', 'direction', 'distance'],
    animationTypes: ALL_TYPES,
    description: 'Translate+fade exit — frame delay? duration? direction?(up|down|left|right) distance?',
  },
  {
    name: 'ScaleIn',
    type: 'animation',
    fullSchema: ScaleInSchema,
    editorProps: ['delay', 'duration', 'origin'],
    animationTypes: ALL_TYPES,
    description: 'Scale 0→1 entrance — frame delay? duration? origin?(center|top|bottom|left|right)',
  },
  {
    name: 'ScaleOut',
    type: 'animation',
    fullSchema: ScaleOutSchema,
    editorProps: ['delay', 'duration', 'origin'],
    animationTypes: ALL_TYPES,
    description: 'Scale 1→0 exit — frame delay? duration? origin?(center|top|bottom|left|right)',
  },
  {
    name: 'Stagger',
    type: 'animation',
    fullSchema: StaggerSchema,
    editorProps: ['startAt', 'delayBetween'],
    animationTypes: ALL_TYPES,
    description: 'List timing orchestrator — frame startAt? delayBetween? — clones children with increasing frame offset',
  },
  {
    name: 'TimelineGate',
    type: 'animation',
    fullSchema: TimelineGateSchema,
    editorProps: ['showAfter', 'hideAfter'],
    animationTypes: ALL_TYPES,
    description: 'Mount/unmount children in frame window — frame showAfter hideAfter? — use instead of JSX conditionals',
  },
  // Content
  {
    name: 'Text',
    type: 'content',
    fullSchema: TextSchema,
    editorProps: ['variant'],
    animationTypes: ALL_TYPES,
    description: 'Static text — variant?(caption|label|body|subheading|heading|display) — wrap in FadeIn/SlideIn to animate',
  },
  {
    name: 'Counter',
    type: 'content',
    fullSchema: CounterSchema,
    editorProps: ['from', 'to', 'format', 'prefix', 'suffix', 'delay', 'duration'],
    animationTypes: ['text', 'data', 'presentation', 'custom'],
    description: 'Animated number — frame to delay? duration? from? format? prefix? suffix?',
  },
  {
    name: 'Typewriter',
    type: 'content',
    fullSchema: TypewriterSchema,
    editorProps: ['text', 'mode', 'delay', 'duration'],
    animationTypes: ['text', 'presentation', 'social', 'custom'],
    description: 'Progressive text reveal — frame text delay? duration? mode?(char|word|line)',
  },
  {
    name: 'WordCycle',
    type: 'content',
    fullSchema: WordCycleSchema,
    editorProps: ['words', 'holdDuration', 'transitionDuration', 'transition'],
    animationTypes: ['text', 'social', 'custom'],
    description: 'Cycling word array — frame words holdDuration? transitionDuration? transition?(flipY|fadeSwap|slideUp)',
  },
  // Scenes
  {
    name: 'TitleCard',
    type: 'scene',
    fullSchema: TitleCardSchema,
    editorProps: ['heading', 'subheading', 'eyebrow', 'delay'],
    animationTypes: ['text', 'data', 'presentation', 'custom'],
    description: 'Hero composition — frame heading subheading? eyebrow? delay?',
  },
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
