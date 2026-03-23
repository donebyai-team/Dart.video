import z from "zod";
import { ComponentRegistration } from "./components";

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

export const frameTimingSchema = {
  startAt: z.number().default(0).optional().describe('Absolute frame when animation starts'),
  durationInFrames: z.number().describe('Animation duration in frames'),
};

export const fixedFrameTimingSchema = (durationInFrames: number) => ({
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



export const ANIMATION_PRIMITIVE_COMPONENTS: ComponentRegistration[] = [
  {
    name: 'FadeIn',
    type: 'animation',
    fullSchema: FadeInSchema,
    editorProps: ['startAt', 'durationInFrames'],
    description: 'fades an element in from transparent to fully visible',
    durationContract: { kind: 'fixed' },
  },
  {
    name: 'FadeOut',
    type: 'animation',
    fullSchema: FadeOutSchema,
    editorProps: ['startAt', 'durationInFrames'],
    description: 'fades an element out from visible to transparent',
    durationContract: { kind: 'fixed' },
  },
  {
    name: 'SlideIn',
    type: 'animation',
    fullSchema: SlideInSchema,
    editorProps: ['startAt', 'durationInFrames', 'direction', 'distance'],
    description: 'slides an element in from outside the canvas edge',
    durationContract: { kind: 'fixed' },
  },
  {
    name: 'SlideOut',
    type: 'animation',
    fullSchema: SlideOutSchema,
    editorProps: ['startAt', 'durationInFrames', 'direction', 'distance'],
    description: 'slides an element out toward the canvas edge',
    durationContract: { kind: 'fixed' },
  },
  {
    name: 'ScaleIn',
    type: 'animation',
    fullSchema: ScaleInSchema,
    editorProps: ['startAt', 'durationInFrames', 'origin'],
    description: 'scales an element up from small to full size',
    durationContract: { kind: 'fixed' },
  },
  {
    name: 'ScaleOut',
    type: 'animation',
    fullSchema: ScaleOutSchema,
    editorProps: ['startAt', 'durationInFrames', 'origin'],
    description: 'scales an element down from full size to nothing',
    durationContract: { kind: 'fixed' },
  },
  {
    name: 'Stagger',
    type: 'animation',
    fullSchema: StaggerSchema,
    editorProps: ['startAt', 'staggerDelay'],
    description: 'reveals children one after another with a delay between each — children must be animation primitives',
    durationContract: { kind: 'manual' },
  },
  {
    name: 'TimelineGate',
    type: 'animation',
    fullSchema: TimelineGateSchema,
    editorProps: ['showAfter', 'hideAfter'],
    description: 'shows its child only within a defined time window — use instead of JSX conditionals',
  },
];