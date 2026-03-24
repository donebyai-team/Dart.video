import z from "zod";
import { ComponentRegistration } from "./registry";
import { fixedFrameTimingSchema } from "./animation_primitives";
import { TYPOGRAPHY_VARIANT_NAMES } from "../tokens/semantic";

export const TitleCardSchema = z.object({
  heading: z.string(),
  subheading: z.string().optional(),
  eyebrow: z.string().optional(),
  startAt: z.number().default(0).optional(),
});

export const TypewriterSchema = z.object({
  ...fixedFrameTimingSchema(60),
  text: z.string(),
  mode: z.enum(['char', 'word', 'line']).optional(),
  variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const WordStaggerSchema = z.object({
  ...fixedFrameTimingSchema(60),
  words: z.array(z.string()),
  startAt: z.number().default(0).optional(),
  durationInFrames: z.number().default(60).optional(),
});

export const TextHighlightSchema = z.object({
  ...fixedFrameTimingSchema(60),
  text: z.string(),
  startAt: z.number().default(0).optional(),
  durationInFrames: z.number().default(60).optional(),
});

const AnimationEnum = z.enum(['slideUp', 'slideDown', 'slideLeft', 'slideRight', 'fadeIn', 'scaleIn']);
const PeelDirectionEnum = z.enum(['left', 'right', 'up', 'down']);

export const ImagePeelSchema = z.object({
  sources: z.array(z.string()).min(2),
  direction: PeelDirectionEnum.default('right').optional(),
  startAt: z.number().default(0).optional(),
  holdDuration: z.number().default(20).optional(),
  peelDuration: z.number().default(20).optional(),
  stackOffset: z.number().default(20).optional(),
  borderRadius: z.number().default(16).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const AnimatedImageSchema = z.object({
  text: z.string(),
  src: z.string(),
  variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).optional(),
  animation: AnimationEnum.default('slideUp').optional(),
  startAt: z.number().default(0).optional(),
  borderRadius: z.number().default(16).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const AnimatedVideoSchema = z.object({
  text: z.string(),
  src: z.string(),
  variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).optional(),
  animation: AnimationEnum.default('slideUp').optional(),
  startAt: z.number().default(0).optional(),
  borderRadius: z.number().default(16).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const SCENE_COMPONENTS: ComponentRegistration[] = [
  {
    name: 'TitleCard',
    type: 'scene',
    fullSchema: TitleCardSchema,
    editorProps: ['heading', 'subheading', 'eyebrow', 'delay'],
    description: 'pre-built hero title with heading, subheading, and optional eyebrow',
  },
  {
    name: 'Typewriter',
    type: 'content',
    fullSchema: TypewriterSchema,
    editorProps: ['text', 'mode', 'startAt', 'durationInFrames'],
    description: 'reveals text character by character — use for dramatic or progressive text reveals',
    durationContract: { kind: 'fixed' },
  },
  {
    name: 'WordStagger',
    type: 'content',
    fullSchema: WordStaggerSchema,
    editorProps: ['words', 'startAt', 'durationInFrames'],
    description: 'reveals words with staggered delays — use for multi-line or multi-word text',
    durationContract: { kind: 'fixed' },
  },
  {
    name: 'TextHighlight',
    type: 'content',
    fullSchema: TextHighlightSchema,
    editorProps: ['text', 'startAt', 'durationInFrames'],
    description: 'highlights text with a background color — use for emphasis',
    durationContract: { kind: 'fixed' },
  },
  {
    name: 'AnimatedImage',
    type: 'scene',
    fullSchema: AnimatedImageSchema,
    editorProps: ['text', 'src', 'variant', 'animation', 'borderRadius'],
    description: 'text label above an image with entrance animation (slide, fade, scale)',
  },
  {
    name: 'AnimatedVideo',
    type: 'scene',
    fullSchema: AnimatedVideoSchema,
    editorProps: ['text', 'src', 'variant', 'animation', 'borderRadius'],
    description: 'text label above a video with entrance animation (slide, fade, scale)',
  },
  {
    name: 'ImagePeel',
    type: 'scene',
    fullSchema: ImagePeelSchema,
    editorProps: ['sources', 'direction', 'holdDuration', 'peelDuration', 'borderRadius'],
    description: 'stacked images that peel away one by one to reveal the next image',
  },
];