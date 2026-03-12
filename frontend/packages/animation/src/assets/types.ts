import { z } from 'zod';

export const AssetEntrySchema = z.object({
  /** Unique asset ID, e.g. "icons/arrow-right" */
  id: z.string(),
  /** Asset pack name, e.g. "icons" */
  pack: z.string(),
  /** Asset version, e.g. "v1" */
  version: z.string(),
  /** Public URL or path for the asset. */
  src: z.string(),
  /** Asset type. */
  type: z.enum(['svg', 'png', 'jpg', 'lottie', 'font']),
  /** Optional tags for prompt description. */
  tags: z.array(z.string()).optional(),
});

export type AssetEntry = z.infer<typeof AssetEntrySchema>;

export const AssetManifestSchema = z.object({
  version: z.string(),
  assets: z.array(AssetEntrySchema),
});

export type AssetManifest = z.infer<typeof AssetManifestSchema>;
