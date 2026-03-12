import { useMemo } from 'react';
import { AssetManifest, AssetEntry } from './types';

let _manifest: AssetManifest | null = null;

/** Register the asset manifest. Call this at app startup before any useAsset calls. */
export function registerAssetManifest(manifest: AssetManifest): void {
  _manifest = manifest;
}

/**
 * Look up an asset by ID from the registered manifest.
 * Returns undefined if no manifest is registered or asset not found.
 */
export function useAsset(assetId: string): AssetEntry | undefined {
  return useMemo(() => {
    if (!_manifest) return undefined;
    return _manifest.assets.find((a) => a.id === assetId);
  }, [assetId]);
}
