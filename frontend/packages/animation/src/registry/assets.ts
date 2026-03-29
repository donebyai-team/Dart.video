import z from "zod";
import { ComponentRegistration } from "./registry";


export const LogoAssetSchema = z.object({
  src: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const ImageAssetSchema = z.object({
  src: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const VideoAssetSchema = z.object({
  src: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
});

export const IconAssetSchema = z.object({
  name: z.string(),
  size: z.number().optional(),
  borderRadius: z.number().optional(),
  style: z.any().optional(),
  className: z.string().optional(),
  id: z.string().optional(),
});

// ── Registry ───────────────────────────────────────────────────────────────

export const BRAND_COMPONENTS: ComponentRegistration[] = [
  {
    name: 'LogoAsset',
    type: 'brand',
    fullSchema: LogoAssetSchema,
    description: 'renders the brand logo from the active theme — use for brand presence in title and outro scenes',
  },
  {
    name: 'ImageAsset',
    type: 'brand',
    fullSchema: ImageAssetSchema,
    description: 'renders a static image from a URL — use for product screens, photos, and illustrations',
  },
  {
    name: 'VideoAsset',
    type: 'brand',
    fullSchema: VideoAssetSchema,
    description: 'renders a static video file from a url — use for product tutorials, and explainer content',
  },
  {
    name: 'IconAsset',
    type: 'brand',
    fullSchema: IconAssetSchema,
    description: 'renders a single icon by name from the icon library — use for decorative or supportive visual cues',
  },
];