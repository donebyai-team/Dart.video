import { preloadVideo } from "@remotion/preload";
import { useEffect, useState } from "react";
import { Html5Video, OffthreadVideo, useRemotionEnvironment, delayRender, continueRender } from "remotion";
import { usePatchedDragStyle, usePatchedProps, useStyleOverride } from "../../patches";
import { useAspectPreset } from "../../styles/AspectPresetContext";
import { buildDepthShadow, DEFAULT_MEDIA_DEPTH } from "../../styles/depth";

export interface VideoAssetProps {
    video?: string;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    className?: string;
    id?: string;
}

export function VideoAsset({
    video,
    width,
    height,
    style,
    className,
    id,
}: VideoAssetProps): React.ReactElement {
    const patchedProps = usePatchedProps(id, {
        video,
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
    
    const resolvedBoxWidth = patchedProps.width ?? preset.width;
    const resolvedBoxHeight = patchedProps.height ?? preset.height;
    const resolvedObjectFit: React.CSSProperties['objectFit'] =
        typeof (overrideObjectFit ?? styleObjectFit) === 'string'
            ? (overrideObjectFit ?? styleObjectFit) as React.CSSProperties['objectFit']
            : 'cover';
    
    const videoStyle: React.CSSProperties = {
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: resolvedObjectFit,
    };

    const [handle] = useState(() => isRendering && patchedProps.video ? delayRender('Loading video') : null);

    useEffect(() => {
        if (!patchedProps.video) return;

        const videoElement = document.createElement('video');
        videoElement.onloadeddata = () => {
            if (handle !== null) {
                continueRender(handle);
            }
        };
        videoElement.onerror = () => {
            if (handle !== null) {
                continueRender(handle);
            }
        };
        videoElement.src = patchedProps.video;

        let unpreload: (() => void) | undefined;
        if (isRendering) {
            unpreload = preloadVideo(patchedProps.video);
        }
        return () => {
            unpreload?.();
        };
    }, [patchedProps.video, isRendering, handle]);

    return (
        <span
            id={id}
            className={patchedProps.className}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                flexShrink: 0,
                width: resolvedBoxWidth,
                height: resolvedBoxHeight,
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: buildDepthShadow(DEFAULT_MEDIA_DEPTH),
                ...restStyle,
                ...wrapperStyleOverride,
                ...dragStyle,
            }}
        >
            {patchedProps.video ? (
                <span
                    style={{
                        position: 'relative',
                        display: 'block',
                        width: '100%',
                        height: '100%',
                    }}
                >
                    {isRendering ? (
                        <OffthreadVideo src={patchedProps.video} style={videoStyle} />
                    ) : (
                        <Html5Video src={patchedProps.video} playsInline muted style={videoStyle} />
                    )}
                </span>
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
