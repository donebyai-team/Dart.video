import { usePatchedProp, useStyleOverride } from "../../patches/PatchContext";
import { useAspectPreset } from "../../styles/AspectPresetContext";

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
    const preset = useAspectPreset();
    const styleOverride = useStyleOverride(id);
    const { objectFit, ...wrapperStyleOverride } = styleOverride;
    const patchedSrc = usePatchedProp<string | undefined>(id, 'src', src ?? DEFAULT_IMAGE_SVG);
    const patchedWidth = usePatchedProp<number | undefined>(id, 'width', width);
    const patchedHeight = usePatchedProp<number | undefined>(id, 'height', height);
    // Content images usually want a more substantial default footprint than logos.
    const defaultBoxWidth = Math.min(Math.max(preset.width * 0.42, 280), 720);
    const defaultBoxHeight = Math.min(Math.max(preset.height * 0.32, 180), 420);
    const resolvedBoxWidth = patchedWidth ?? defaultBoxWidth;
    const resolvedBoxHeight = patchedHeight ?? defaultBoxHeight;
    const resolvedObjectFit: React.CSSProperties['objectFit'] =
        typeof objectFit === 'string' ? objectFit as React.CSSProperties['objectFit'] : 'cover';

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
                ...wrapperStyleOverride,
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
