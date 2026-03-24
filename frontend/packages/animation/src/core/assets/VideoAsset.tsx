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
                ...restStyle,
                ...wrapperStyleOverride,
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
