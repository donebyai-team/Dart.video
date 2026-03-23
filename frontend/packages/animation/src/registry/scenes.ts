import z from "zod";
import { ComponentRegistration } from "./components";

export const TitleCardSchema = z.object({
  heading: z.string(),
  subheading: z.string().optional(),
  eyebrow: z.string().optional(),
  startAt: z.number().default(0).optional(),
});

export const SCENE_COMPONENTS: ComponentRegistration[] = [
  {
    name: 'TitleCard',
    type: 'scene',
    fullSchema: TitleCardSchema,
    editorProps: ['heading', 'subheading', 'eyebrow', 'delay'],
    description: 'pre-built hero title with heading, subheading, and optional eyebrow',
  },
];