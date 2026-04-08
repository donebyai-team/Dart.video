import { preloadImage } from "@remotion/preload";
import { useEffect, useState } from "react";
import { useRemotionEnvironment, delayRender, continueRender } from "remotion";
import { usePatchedDragStyle, usePatchedProp, useStyleOverride } from "../../patches";
import { useAspectPreset } from "../../styles/AspectPresetContext";
import { buildDepthShadow, DEFAULT_MEDIA_DEPTH } from "../../styles/depth";

const DEFAULT_IMAGE_SVG = `data:image/svg+xml,${encodeURIComponent(`
<svg width="96" height="72" viewBox="0 0 96 72" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="72" rx="10" fill="#e2e8f0"/>
  <circle cx="30" cy="24" r="8" fill="#94a3b8"/>
  <path d="M14 56L34 38L46 48L60 30L82 56H14Z" fill="#94a3b8"/>
</svg>
`)}`;

export interface ImageAssetProps {
    src?: string;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    className?: string;
    id?: string;
}

export function ImageAsset({
    src,
    width,
    height,
    style,
    className,
    id,
}: ImageAssetProps): React.ReactElement {
    const { isRendering } = useRemotionEnvironment();
    const preset = useAspectPreset();
    const styleOverride = useStyleOverride(id);
    const { objectFit: styleObjectFit, ...restStyle } = style ?? {};
    const { objectFit: overrideObjectFit, ...wrapperStyleOverride } = styleOverride;
    const overrideTransform = typeof styleOverride.transform === 'string' ? styleOverride.transform : undefined;
    const dragStyle = usePatchedDragStyle(id, style?.transform, overrideTransform);
    const patchedSrc = usePatchedProp<string | undefined>(id, 'src', src ?? DEFAULT_IMAGE_SVG);
    const patchedWidth = usePatchedProp<number | undefined>(id, 'width', width);
    const patchedHeight = usePatchedProp<number | undefined>(id, 'height', height);
    const resolvedBoxWidth = patchedWidth ?? preset.width;
    const resolvedBoxHeight = patchedHeight ?? preset.height;
    const rawObjectFit = overrideObjectFit ?? styleObjectFit;
    const resolvedObjectFit: React.CSSProperties['objectFit'] =
        typeof rawObjectFit === 'string' ? rawObjectFit as React.CSSProperties['objectFit'] : 'cover';

    const [handle] = useState(() => isRendering ? delayRender('Loading image') : null);

    useEffect(() => {
        if (!patchedSrc) return;
        
        const img = new Image();
        img.onload = () => {
            if (handle !== null) {
                continueRender(handle);
            }
        };
        img.onerror = () => {
            if (handle !== null) {
                continueRender(handle);
            }
        };
        img.src = patchedSrc;

        let unpreload: (() => void) | undefined;
        if (isRendering) {
            unpreload = preloadImage(patchedSrc);
        }
        return () => {
            unpreload?.();
        };
    }, [patchedSrc, isRendering, handle]);

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
                borderRadius: 16,
                boxShadow: buildDepthShadow(DEFAULT_MEDIA_DEPTH),
                overflow: 'hidden',
                ...restStyle,
                ...wrapperStyleOverride,
                ...dragStyle,
            }}
        >
            <img
                src={patchedSrc}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: resolvedObjectFit,
                }}
            />
        </span>
    );
}
