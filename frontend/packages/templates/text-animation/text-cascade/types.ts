import { z } from 'zod'
import { EditableTextDataSchema } from "../../lib/types"

export const TextCascadeTemplateConfigSchema = z
  .object({
    centerText: EditableTextDataSchema
  })
  .strict()

export type TextCascadeTemplateProps =
  z.infer<typeof TextCascadeTemplateConfigSchema>
