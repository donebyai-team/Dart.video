import { z } from "zod"
import { FONT_FAMILIES, FONT_SIZE_PRESETS } from "./constants"

export type FontSizePreset = keyof typeof FONT_SIZE_PRESETS

export function getPresetFromFontSize(size: number): FontSizePreset {

  const entry = Object.entries(FONT_SIZE_PRESETS)
    .find(([_, v]) => v === size)

  return (entry?.[0] || "M") as FontSizePreset
}

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
