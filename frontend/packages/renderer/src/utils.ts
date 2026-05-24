import { BrandAsset, BrandTheme } from "@coasterai/animation";
import { BrandAssetPriority, BrandMediaType } from "@coasterai/pb/coasterai/core/v1/brandkit_pb";
import { MediaAsset } from "@coasterai/pb/coasterai/core/v1/media_asset_pb";
import { GeneratedVideoBranding } from "@coasterai/pb/coasterai/core/v1/video_pb";
import { loadFonts } from "./fonts";

export function brandingToTheme(
    branding?: GeneratedVideoBranding
): BrandTheme {
    const theme: BrandTheme = {
        primary: "",
        secondary: "",
        bg: "",
        accent: "",
        text: "",
    };
    let hasPrimaryTextColor = false;

    for (const c of branding?.colors || []) {
        const color = c.colorHexCode;
        if (!color) continue;

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
                hasPrimaryTextColor = true;
                break;

            case BrandAssetPriority.TEXT_SECONDARY:
                if (!hasPrimaryTextColor) theme.text = color;
                break;

            case BrandAssetPriority.ACCENT:
                theme.accent = color;
                break;
        }
    }

    for (const c of branding?.brandIdentity?.logos || []) {
        if (!c.asset) continue;

        const asset = toBrandAsset(c.asset);

        if (c.type === BrandMediaType.LOGO) {
            theme.logo = asset;
        }

        if (c.type === BrandMediaType.ICON) {
            theme.logoIcon = asset;

            // fallback logo if no real logo exists
            if (!theme.logo) {
                theme.logo = asset;
            }
        }
    }

    // Set fonts
    const brandFonts = branding?.brandIdentity?.fonts || [];

    for (const c of brandFonts) {
        const fontName = c.googleFontsName || c.name;
        if (fontName) {
            theme.font = fontName;
            // Load font in background (non-blocking, like old code)
            loadFonts([fontName]);
            break;
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
