import { ComponentRegistration } from "./components";
import { z } from "zod";
import { fixedFrameTimingSchema } from "./animation_primitives";


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

export const CONTENT_COMPONENTS: ComponentRegistration[] = [
  {
    name: 'Text',
    type: 'content',
    fullSchema: TextSchema,
    editorProps: ['variant'],
    description: 'Static text element, wrap in FadeIn/SlideIn to animate',
  },
  {
    name: 'Counter',
    type: 'content',
    fullSchema: CounterSchema,
    editorProps: ['from', 'to', 'format', 'prefix', 'suffix', 'startAt', 'durationInFrames'],
    description: 'Animated number counter that tweens between values',
    durationContract: { kind: 'fixed' },
  },
  {
    name: 'Typewriter',
    type: 'content',
    fullSchema: TypewriterSchema,
    editorProps: ['text', 'mode', 'startAt', 'durationInFrames'],
    description: 'Progressively reveals text character by character, word, or line',
    durationContract: { kind: 'fixed' },
  },
  {
    name: 'WordCycle',
    type: 'content',
    fullSchema: WordCycleSchema,
    editorProps: ['startAt', 'words', 'holdDuration', 'transitionDuration', 'transition'],
    description: 'Cycles through an array of words with animated transitions',
    durationContract: { kind: 'formula', strategy: 'wordCycle' },
  },
];