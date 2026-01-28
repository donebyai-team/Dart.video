import { z } from 'zod'
import { FONT_FAMILIES, FONT_WEIGHTS, TEXT_ALIGNMENTS } from '../../utils/constants'

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
  keyName: z.string(),
  text: z.string(),
  styles: TextStylesSchema
})

export const TextCascadeTemplateConfigSchema = z
  .object({
    centerText: TextBlockSchema,
    topLeftText: TextBlockSchema
  })
  .strict()
export type TextCascadeFontFamily = z.infer<typeof TextStylesSchema>['fontFamily']
export type TextCascadeFontWeight = z.infer<typeof TextStylesSchema>['fontWeight']
export type TextCascadeTextAlignments = z.infer<typeof TextStylesSchema>['textAlign']

export type TextCascadeTemplateStyles = z.infer<typeof TextStylesSchema>
export type TextCascadeTemplateBlock = z.infer<typeof TextBlockSchema>
export type TextCascadeTemplateProps = z.infer<typeof TextCascadeTemplateConfigSchema>
