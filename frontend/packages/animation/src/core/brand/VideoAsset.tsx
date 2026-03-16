import { preloadVideo } from "@remotion/preload";
import { useEffect } from "react";
import { Html5Video, OffthreadVideo, useRemotionEnvironment } from "remotion";
import { usePatchedProp, useStyleOverride } from "../../patches/PatchContext";
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
    const patchedSrc = usePatchedProp<string | undefined>(id, 'src', src);
    const patchedWidth = usePatchedProp<number | undefined>(id, 'width', width);
    const patchedHeight = usePatchedProp<number | undefined>(id, 'height', height);
    const defaultBoxWidth = Math.min(Math.max(preset.width * 0.42, 280), 720);
    const defaultBoxHeight = Math.min(Math.max(preset.height * 0.32, 180), 420);
    const resolvedBoxWidth = patchedWidth ?? defaultBoxWidth;
    const resolvedBoxHeight = patchedHeight ?? defaultBoxHeight;
    const videoStyle: React.CSSProperties = {
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    };

    useEffect(() => {
        if (!patchedSrc || !isRendering) return;
        const unpreload = preloadVideo(patchedSrc);
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
                overflow: 'hidden',
                ...style,
                ...styleOverride,
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
