import { preloadImage } from "@remotion/preload";
import { useEffect, useState } from "react";
import { useRemotionEnvironment, delayRender, continueRender } from "remotion";
import { usePatchedDragStyle, usePatchedProps, useStyleOverride } from "../../patches";
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
    image?: string;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    className?: string;
    id?: string;
}

export function ImageAsset({
    image,
    width,
    height,
    style,
    className,
    id,
}: ImageAssetProps): React.ReactElement {
    const patchedProps = usePatchedProps(id, {
        image,
        width,
        height,
        style,
        className,
        id,
    });
    const { isRendering } = useRemotionEnvironment();
    const preset = useAspectPreset();
    const styleOverride = useStyleOverride(id);
    const { objectFit: styleObjectFit, transform: styleTransform, ...restStyle } = patchedProps.style ?? {};
    const { objectFit: overrideObjectFit, transform: overrideTransformValue, ...wrapperStyleOverride } = styleOverride;
    const overrideTransform =
        typeof overrideTransformValue === 'string' ? overrideTransformValue : undefined;
    const dragStyle = usePatchedDragStyle(id, styleTransform, overrideTransform);
    
    const imageSrc = patchedProps.image ?? DEFAULT_IMAGE_SVG;
    const resolvedBoxWidth = patchedProps.width ?? preset.width;
    const resolvedBoxHeight = patchedProps.height ?? preset.height;
    const resolvedObjectFit: React.CSSProperties['objectFit'] =
        typeof (overrideObjectFit ?? styleObjectFit) === 'string'
            ? (overrideObjectFit ?? styleObjectFit) as React.CSSProperties['objectFit']
            : 'cover';

    const [handle] = useState(() => isRendering ? delayRender('Loading image') : null);

    useEffect(() => {
        if (!imageSrc) return;
        
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
        img.src = imageSrc;

        let unpreload: (() => void) | undefined;
        if (isRendering) {
            unpreload = preloadImage(imageSrc);
        }
        return () => {
            unpreload?.();
        };
    }, [imageSrc, isRendering, handle]);

    return (
        <span
            id={id}
            className={patchedProps.className}
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
                src={imageSrc}
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
