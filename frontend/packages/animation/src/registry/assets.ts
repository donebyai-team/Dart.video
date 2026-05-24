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
    name: 'LogoAsset',
    type: 'content',
    description: '',
  },
  {
    name: 'ImageAsset',
    type: 'content',
    description: 'renders a static image from a URL — use for product screens, photos, and illustrations',
  },
  {
    name: 'ClippedText',
    type: 'content',
    description: 'renders text that can be animated with clipping and movement — use for headlines, captions, and body text',
  },
  {
    name: 'MediaAsset',
    type: 'content',
    description: 'renders a static image or video from a URL — use for product screens, photos, videos, and illustrations',
  },
  {
    name: 'IconAsset',
    type: 'content',
    description: 'renders a single icon by name from the icon library — use for decorative or supportive visual cues',
  },
  {
    name: 'IconTextPill',
    type: 'content',
    description: 'renders a rounded pill with a logo/icon and short text label — use inside feature rows and carousels',
  },
  {
    name: 'Text',
    type: 'content',
    description: 'renders a single icon by name from the icon library — use for decorative or supportive visual cues',
  },
];
