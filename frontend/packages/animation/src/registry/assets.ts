import { ComponentRegistration } from "./registry";
import { TextFieldSchema } from "../core/assets/Text";
import { IconAssetFieldSchema } from "../core/assets/IconAsset";
import { LogoAssetSchemaFields } from "../components/scenes/assets/LogoAsset";

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
    elementHints: ['logoasset'],
    description: '',
    schema: [{
      type: 'component',
      name: 'logo',
      fields: LogoAssetSchemaFields,
    }],
  },
  {
    name: 'ImageAsset',
    type: 'content',
    elementHints: ['imageasset'],
    description: 'renders a static image from a URL — use for product screens, photos, and illustrations',
  },
  {
    name: 'ClippedText',
    type: 'content',
    elementHints: ['clippedtext'],
    description: 'renders text that can be animated with clipping and movement — use for headlines, captions, and body text',
  },
  {
    name: 'MediaAsset',
    type: 'content',
    elementHints: ['mediaasset', 'video', 'image'],
    schema: {
      type: 'component',
      name: 'mediaasset',
      fields: [
        {
          name: 'src',
          type: 'string',
          datatype: 'media',
          map: 'props.src',
        },
        {
          name: 'motionPreset',
          type: 'enum',
          default: "none",
        },
      ],
    },
    description: 'renders a static image or video from a URL — use for product screens, photos, videos, and illustrations',
  },
  {
    name: 'IconAsset',
    type: 'content',
    elementHints: ['iconasset'],
    schema: [{
      type: 'component',
      name: 'icon',
      fields: IconAssetFieldSchema,
    }],
    description: 'renders a single icon by name from the icon library — use for decorative or supportive visual cues',
  },
  {
    name: 'IconTextPill',
    type: 'content',
    elementHints: ['pill', 'icontextpill'],
    description: 'renders a rounded pill with a logo/icon and short text label — use inside feature rows and carousels',
  },
  {
    name: 'Text',
    type: 'content',
    elementHints: ['textasset'],
    schema: [{
      type: 'component',
      name: 'text',
      fields: TextFieldSchema,
    }],
    description: 'renders static text with semantic typography variants',
  },
];
