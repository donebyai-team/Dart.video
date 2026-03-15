import { BrandTheme, DEFAULT_BRAND_THEME } from "@coasterai/animation";
import { BrandAssetPriority } from "@coasterai/pb/coasterai/core/v1/brandkit_pb";
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
    }
  }

  return theme;
}