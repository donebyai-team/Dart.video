import z from "zod";
import { ComponentRegistration } from "./registry";
import { fixedFrameTimingSchema } from "./animation_primitives";
import { TYPOGRAPHY_VARIANT_NAMES } from "../tokens/semantic";
import { ENTRANCE_ANIMATIONS, LOGO_ANIMATIONS, PEEL_DIRECTIONS } from "../components/scenes/types";

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

const AnimationEnum = z.enum(ENTRANCE_ANIMATIONS);
const LogoAnimationEnum = z.enum(LOGO_ANIMATIONS);
const PeelDirectionEnum = z.enum(PEEL_DIRECTIONS);

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
    name: 'TextStagger',
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
  {
    name: 'LogoWithBrandName',
    type: 'scene',
    fullSchema: z.object({
      brandName: z.string(),
      src: z.string().optional(),
      logoSize: z.number().optional(),
      variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).optional(),
      animation: LogoAnimationEnum.default('zoomIn').optional(),
      startAt: z.number().default(0).optional(),
      nameDelay: z.number().default(15).optional(),
      layout: z.enum(['horizontal', 'vertical']).default('horizontal').optional(),
    }),
    editorProps: ['brandName', 'src', 'variant', 'animation', 'layout', 'logoSize'],
    description: 'logo icon with animated brand name reveal — logo appears first, then name slides in',
  },
];