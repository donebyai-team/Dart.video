import z from "zod";
import { ComponentRegistration } from "./registry";

// export const ImageAssetSchema = z.object({
//   src: z.string().optional(),
//   width: z.number().optional(),
//   height: z.number().optional(),
//   style: z.any().optional(),
//   className: z.string().optional(),
// });

// export const VideoAssetSchema = z.object({
//   src: z.string().optional(),
//   width: z.number().optional(),
//   height: z.number().optional(),
//   style: z.any().optional(),
//   className: z.string().optional(),
// });

// export const IconAssetSchema = z.object({
//   name: z.string(),
//   size: z.number().optional(),
//   borderRadius: z.number().optional(),
//   style: z.any().optional(),
//   className: z.string().optional(),
//   id: z.string().optional(),
// });

// ── Registry ───────────────────────────────────────────────────────────────

export const CONTENT_COMPONENTS: ComponentRegistration[] = [
  {
    name: 'ImageAsset',
    type: 'content',
    description: 'renders a static image from a URL — use for product screens, photos, and illustrations',
  },
  {
    name: 'VideoAsset',
    type: 'content',
    description: 'renders a static video file from a url — use for product tutorials, and explainer content',
  },
  {
    name: 'IconAsset',
    type: 'content',
    description: 'renders a single icon by name from the icon library — use for decorative or supportive visual cues',
  },
  {
    name: 'Text',
    type: 'content',
    description: 'renders a single icon by name from the icon library — use for decorative or supportive visual cues',
  },
];