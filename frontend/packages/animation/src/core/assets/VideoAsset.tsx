import { preloadVideo } from "@remotion/preload";
import { useEffect, useState } from "react";
import { Html5Video, OffthreadVideo, useRemotionEnvironment, delayRender, continueRender } from "remotion";
import { usePatchedDragStyle } from "../../patches";
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
    const { isRendering } = useRemotionEnvironment();
    const preset = useAspectPreset();
    const { objectFit: styleObjectFit, transform: styleTransform, ...restStyle } = style ?? {};
    const dragStyle = usePatchedDragStyle(id, styleTransform);
    
    const resolvedBoxWidth = width ?? preset.width;
    const resolvedBoxHeight = height ?? preset.height;
    const resolvedObjectFit: React.CSSProperties['objectFit'] =
        typeof styleObjectFit === 'string' ? styleObjectFit as React.CSSProperties['objectFit'] : 'cover';
    
    const videoStyle: React.CSSProperties = {
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: resolvedObjectFit,
    };

    const [handle] = useState(() => isRendering && video ? delayRender('Loading video') : null);

    useEffect(() => {
        if (!video) return;

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
        videoElement.src = video;

        let unpreload: (() => void) | undefined;
        if (isRendering) {
            unpreload = preloadVideo(video);
        }
        return () => {
            unpreload?.();
        };
    }, [video, isRendering, handle]);

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
                overflow: 'hidden',
                boxShadow: buildDepthShadow(DEFAULT_MEDIA_DEPTH),
                ...restStyle,
                ...dragStyle,
            }}
        >
            {video ? (
                isRendering ? (
                    <OffthreadVideo src={video} style={videoStyle} />
                ) : (
                    <Html5Video src={video} playsInline muted style={videoStyle} />
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
