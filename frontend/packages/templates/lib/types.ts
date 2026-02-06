import { z } from "zod"
import { FONT_FAMILIES } from "./constants"

export const EditableTextStyleSchema = z.object({
  fontSize: z.number(),
  color: z.string(),
  fontFamily: z.enum(FONT_FAMILIES)
})

export const EditableTextDataSchema = z.object({
  text: z.string(),
  style: EditableTextStyleSchema
})

export type EditableTextData = z.infer<typeof EditableTextDataSchema>
export type EditableTextStyle = z.infer<typeof EditableTextStyleSchema>
