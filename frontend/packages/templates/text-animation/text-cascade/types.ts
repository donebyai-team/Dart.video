import { z } from 'zod'
import { FONT_FAMILIES, FONT_WEIGHTS, TEXT_ALIGNMENTS } from './constants'

const TextStylesSchema = z.object({
  fontSize: z.number(),
  color: z.string(),
  lineHeight: z.number(),

  // optional with defaults
  letterSpacing: z.number().optional(),
  fontFamily: z.enum(FONT_FAMILIES).optional(),
  fontWeight: z.enum(FONT_WEIGHTS).optional(),
  textAlign: z.enum(TEXT_ALIGNMENTS).optional()
})

const TextBlockSchema = z.object({
  text: z.string(),
  style: TextStylesSchema
})

export const TextCascadeTemplateConfigSchema = z
  .object({
    centerText: TextBlockSchema,
    topLeftText: TextBlockSchema
  })
  .strict()

export type TextCascadeTemplateBlock = z.infer<typeof TextBlockSchema>
export type TextCascadeTemplateProps = z.infer<typeof TextCascadeTemplateConfigSchema>
