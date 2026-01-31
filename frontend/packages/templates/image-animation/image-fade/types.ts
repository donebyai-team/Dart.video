import { z } from 'zod'

const ImgFadeStyle = z.object({
  width: z.union([z.string(), z.number()]).optional(),
  height: z.union([z.string(), z.number()]).optional(),
  borderRadius: z.union([z.string(), z.number()]).optional(),
  objectFit: z.enum(['contain', 'cover', 'fill']).optional()
})

const ImgFadeSchema = z.object({
  src: z.string(),
  style: ImgFadeStyle
})

export type ImgFadeTemplateProps = z.infer<typeof ImgFadeSchema>
