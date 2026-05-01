import { preloadVideo } from "@remotion/preload";
import { useEffect, useState } from "react";
import { Html5Video, OffthreadVideo, useRemotionEnvironment, delayRender, continueRender } from "remotion";
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
    const { objectFit: styleObjectFit, ...restStyle } = style ?? {};
    
    const resolvedBoxWidth = width ?? preset.width;
    const resolvedBoxHeight = height ?? preset.height;
    const resolvedObjectFit: React.CSSProperties['objectFit'] =
        typeof styleObjectFit === 'string'
            ? styleObjectFit as React.CSSProperties['objectFit']
            : 'cover';
    
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
                position: 'relative',
                flexShrink: 0,
                width: resolvedBoxWidth,
                height: resolvedBoxHeight,
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: buildDepthShadow(DEFAULT_MEDIA_DEPTH),
                ...restStyle,
            }}
        >
            {video ? (
                <span
                    style={{
                        position: 'relative',
                        display: 'block',
                        width: '100%',
                        height: '100%',
                    }}
                >
                    {isRendering ? (
                        <OffthreadVideo src={video} style={videoStyle} />
                    ) : (
                        <Html5Video src={video} playsInline muted style={videoStyle} />
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
