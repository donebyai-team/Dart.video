import z from "zod";
import { ComponentRegistration } from "./components";


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
    editorProps: ['src', 'width', 'height'],
    description: 'Brand logo from ThemeProvider. Falls back to a placeholder if no logo is configured. Wrap in any animation primitive (FadeIn, SlideIn, ScaleIn etc.) to animate. the logo always keeps its aspect ratio.',
  },
  {
    name: 'ImageAsset',
    type: 'brand',
    fullSchema: ImageAssetSchema,
    editorProps: ['src', 'width', 'height'],
    description: 'Generic image primitive for uploaded or remote media.'
  },
  {
    name: 'VideoAsset',
    type: 'brand',
    fullSchema: VideoAssetSchema,
    editorProps: ['src', 'width', 'height'],
    description: 'Generic video primitive for uploaded media. Width and height define the rendered box; the video always preserves aspect ratio and stays fully visible.',
  },
  {
    name: 'IconAsset',
    type: 'brand',
    fullSchema: IconAssetSchema,
    editorProps: ['name', 'size'],
    description: 'Icon asset from the icon library.'
  },
];