import { usePatchedProp, useStyleOverride } from "../../patches/PatchContext";
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
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    className?: string;
    id?: string;
}

export function LogoAsset({
    width,
    height,
    style,
    className,
    id,
}: LogoAssetProps): React.ReactElement {
    const { logo } = useTheme();
    const styleOverride = useStyleOverride(id);
    const isDefaultLogo = !logo?.url;
    const patchedWidth = usePatchedProp<number | undefined>(id, 'width', width);
    const patchedHeight = usePatchedProp<number | undefined>(id, 'height', height);
    const patchedSrc = usePatchedProp<string | undefined>(id, 'src', logo?.url ?? DEFAULT_LOGO_SVG);

    const resolvedWidth = patchedWidth ?? (isDefaultLogo ? 220 : undefined);
    const resolvedHeight = patchedHeight ?? (isDefaultLogo ? 220 : undefined);

    return (
        <img
            id={id}
            src={patchedSrc}
            className={className}
            style={{
                width: resolvedWidth ?? 'auto',
                height: resolvedHeight ?? 'auto',
                objectFit: 'contain',
                ...style,
                ...styleOverride,
            }}
        />
    );
}