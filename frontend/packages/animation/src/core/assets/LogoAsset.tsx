import { preloadImage } from "@remotion/preload";
import { useEffect } from "react";
import { useRemotionEnvironment } from "remotion";
import { usePatchedProp, useStyleOverride } from "../../patches/PatchContext";
import { useAspectPreset } from "../../styles/AspectPresetContext";
import { useTheme } from "../../theme";

const DEFAULT_LOGO_SVG = `data:image/svg+xml,${encodeURIComponent(`
<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="8" fill="#e2e8f0"/>
  <rect x="10" y="14" width="28" height="4" rx="2" fill="#94a3b8"/>
  <rect x="10" y="22" width="20" height="4" rx="2" fill="#94a3b8"/>
  <rect x="10" y="30" width="24" height="4" rx="2" fill="#94a3b8"/>
</svg>
`)}`;

export interface LogoAssetProps {
    src?: string;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    className?: string;
    id?: string;
}

export function LogoAsset({
    src,
    width,
    height,
    style,
    className,
    id,
}: LogoAssetProps): React.ReactElement {
    const { logo } = useTheme();
    const { isRendering } = useRemotionEnvironment();
    const preset = useAspectPreset();
    const styleOverride = useStyleOverride(id);
    const { objectFit, ...wrapperStyleOverride } = styleOverride;
    const patchedWidth = usePatchedProp<number | undefined>(id, 'width', width);
    const patchedHeight = usePatchedProp<number | undefined>(id, 'height', height);
    const defaultSrc = src ?? logo?.url ?? DEFAULT_LOGO_SVG;
    const patchedSrc = usePatchedProp<string | undefined>(id, 'src', defaultSrc);
    // Use a frame-relative default so logos feel consistent across presets
    // without requiring callers to pass explicit dimensions.
    const defaultBoxSize = Math.min(Math.max(Math.min(preset.width, preset.height) * 0.2, 160), 260);
    // Width/height define the bounding box. If only one is provided, mirror it
    // so the logo still gets a deterministic square box to fit into.
    const resolvedBoxWidth = patchedWidth ?? patchedHeight ?? defaultBoxSize;
    const resolvedBoxHeight = patchedHeight ?? patchedWidth ?? defaultBoxSize;
    // Raster assets can provide a stable intrinsic ratio up front; SVG uploads
    // may come through as 0x0, so ignore invalid metadata and let the browser fit
    // the asset inside the wrapper box instead.
    const canUseThemeLogoMetadata = !!logo?.url && patchedSrc === logo.url;
    const hasIntrinsicSize = canUseThemeLogoMetadata && (logo?.width ?? 0) > 0 && (logo?.height ?? 0) > 0;
    const intrinsicAspectRatio = hasIntrinsicSize ? `${logo!.width} / ${logo!.height}` : undefined;
    const resolvedObjectFit: React.CSSProperties['objectFit'] =
        typeof objectFit === 'string' ? objectFit as React.CSSProperties['objectFit'] : 'contain';

    useEffect(() => {
        if (!patchedSrc || !isRendering) return;
        const unpreload = preloadImage(patchedSrc);
        return () => {
            unpreload();
        };
    }, [patchedSrc, isRendering]);

    return (
        <span
            id={id}
            className={className}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: resolvedBoxWidth,
                height: resolvedBoxHeight,
                ...style,
                ...wrapperStyleOverride,
            }}
        >
            {/* The wrapper owns sizing; the image always scales to fill that box
                while remaining fully visible via object-fit: contain. */}
            <img
                src={patchedSrc}
                width={hasIntrinsicSize ? logo?.width : undefined}
                height={hasIntrinsicSize ? logo?.height : undefined}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: resolvedObjectFit,
                    aspectRatio: intrinsicAspectRatio,
                }}
            />
        </span>
    );
}
