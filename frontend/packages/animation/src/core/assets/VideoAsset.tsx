import { preloadVideo } from "@remotion/preload";
import { useEffect, useState } from "react";
import { Html5Video, OffthreadVideo, useRemotionEnvironment, delayRender, continueRender } from "remotion";
import { usePatchedDragStyle, usePatchedProp, useStyleOverride } from "../../patches";
import { useAspectPreset } from "../../styles/AspectPresetContext";

export interface VideoAssetProps {
    src?: string;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    className?: string;
    id?: string;
}

export function VideoAsset({
    src,
    width,
    height,
    style,
    className,
    id,
}: VideoAssetProps): React.ReactElement {
    const { isRendering } = useRemotionEnvironment();
    const preset = useAspectPreset();
    const styleOverride = useStyleOverride(id);
    const overrideTransform = typeof styleOverride.transform === 'string' ? styleOverride.transform : undefined;
    const dragStyle = usePatchedDragStyle(id, style?.transform, overrideTransform);
    const patchedSrc = usePatchedProp<string | undefined>(id, 'src', src);
    const patchedWidth = usePatchedProp<number | undefined>(id, 'width', width);
    const patchedHeight = usePatchedProp<number | undefined>(id, 'height', height);
    const { objectFit: styleObjectFit, ...restStyle } = style ?? {};
    const { objectFit: overrideObjectFit, ...wrapperStyleOverride } = styleOverride;
    const resolvedBoxWidth = patchedWidth ?? preset.width;
    const resolvedBoxHeight = patchedHeight ?? preset.height;
    const rawObjectFit = overrideObjectFit ?? styleObjectFit;
    const resolvedObjectFit: React.CSSProperties['objectFit'] =
        typeof rawObjectFit === 'string' ? rawObjectFit as React.CSSProperties['objectFit'] : 'cover';
    const videoStyle: React.CSSProperties = {
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: resolvedObjectFit,
    };

    const [handle] = useState(() => isRendering && patchedSrc ? delayRender('Loading video') : null);

    useEffect(() => {
        if (!patchedSrc) return;

        const video = document.createElement('video');
        video.onloadeddata = () => {
            if (handle !== null) {
                continueRender(handle);
            }
        };
        video.onerror = () => {
            if (handle !== null) {
                continueRender(handle);
            }
        };
        video.src = patchedSrc;

        let unpreload: (() => void) | undefined;
        if (isRendering) {
            unpreload = preloadVideo(patchedSrc);
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
                overflow: 'hidden',
                ...restStyle,
                ...wrapperStyleOverride,
                ...dragStyle,
            }}
        >
            {patchedSrc ? (
                isRendering ? (
                    <OffthreadVideo src={patchedSrc} style={videoStyle} />
                ) : (
                    <Html5Video src={patchedSrc} playsInline muted style={videoStyle} />
                )
            ) : (
                <span
                    style={{
                        display: 'flex',
                        width: '100%',
                        height: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#e2e8f0',
                        color: '#64748b',
                        fontSize: 14,
                        fontWeight: 500,
                    }}
                >
                    Upload video
                </span>
            )}
        </span>
    );
}
