import { ComponentRegistration } from "./registry";
import { z } from "zod";
import { fixedFrameTimingSchema } from "./animation_primitives";
import { TYPOGRAPHY_VARIANT_NAMES } from "../tokens/semantic";

export const TextSchema = z.object({
  variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).optional(),
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
  variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const WordCycleSchema = z.object({
  startAt: z.number().default(0).optional(),
  words: z.array(z.string()),
  holdDuration: z.number().default(45).optional(),
  transitionDuration: z.number().default(12).optional(),
  transition: z.enum(['flipY', 'fadeSwap', 'slideUp']).optional(),
  variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const CONTENT_COMPONENTS: ComponentRegistration[] = [
  {
    name: 'Text',
    type: 'content',
    fullSchema: TextSchema,
    editorProps: ['variant'],
    description: 'displays a static string — use for headings, labels, and body copy',
  },
  {
    name: 'Counter',
    type: 'content',
    fullSchema: CounterSchema,
    editorProps: ['from', 'to', 'format', 'prefix', 'suffix', 'startAt', 'durationInFrames'],
    description: 'animates a number incrementing or decrementing to a target value — use for metrics and stats',
    durationContract: { kind: 'fixed' },
  },
  {
    name: 'WordCycle',
    type: 'content',
    fullSchema: WordCycleSchema,
    editorProps: ['startAt', 'words', 'holdDuration', 'transitionDuration', 'transition'],
    description: 'cycles through a list of words in place — use when one slot shows multiple values over time',
    durationContract: { kind: 'formula', strategy: 'wordCycle' },
  },
];