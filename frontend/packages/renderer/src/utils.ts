import { BrandAsset, BrandTheme, DEFAULT_BRAND_THEME } from "@coasterai/animation";
import { BrandAssetPriority, BrandMedia } from "@coasterai/pb/coasterai/core/v1/brandkit_pb";
import { MediaAsset } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { GeneratedVideoBranding } from "@coasterai/pb/coasterai/core/v1/video_pb";

export function brandingToTheme(
    branding?: GeneratedVideoBranding
): BrandTheme {

    if (!branding || !branding.colors?.length) {
        return DEFAULT_BRAND_THEME;
    }

    const theme: BrandTheme = { ...DEFAULT_BRAND_THEME };

    for (const c of branding.colors) {
        const color = c.colorHexCode;

        switch (c.priority) {

            case BrandAssetPriority.PRIMARY:
                theme.primary = color;
                break;

            case BrandAssetPriority.SECONDARY:
                theme.secondary = color;
                break;

            case BrandAssetPriority.BACKGROUND:
                theme.bg = color;
                break;

            case BrandAssetPriority.TEXT_PRIMARY:
                theme.text = color;
                break;

            case BrandAssetPriority.TEXT_SECONDARY:
                if (!theme.text) theme.text = color;
                break;

             case BrandAssetPriority.ACCENT:
                if (theme.accent) theme.accent = color;
                break;    
        }
    }

    for (const c of branding.brandIdentity?.logos || []) {
        if (!c.asset) continue;
        if (c.priority === BrandAssetPriority.PRIMARY) {
            theme.logo = toBrandAsset(c.asset);
            break
        }

        if (c.priority === BrandAssetPriority.SECONDARY) {
            if (!theme.logo) theme.logo = toBrandAsset(c.asset);
            break
        }
    }

    return theme;
}

export function toBrandAsset(asset: MediaAsset): BrandAsset {
    return {
        url: asset.url || "",
        width: asset.width || 0,
        height: asset.height || 0
    }
}