import { preloadImage } from "@remotion/preload";
import { useEffect, useState } from "react";
import { useCurrentFrame, useRemotionEnvironment } from "remotion";
import { usePatchedDragStyle, usePatchedProps, useStyleOverride } from "../../../patches";
import { useAspectPreset } from "../../../styles/AspectPresetContext";
import { interpolateWithEasing } from "../../../styles/easingResolver";
import { useTheme } from "../../../theme";
import { LOGO_ANIMATIONS, LogoAnimation } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';

// Default constants
const DEFAULT_ANIMATION_DURATION = 30;
const DEFAULT_ANIMATION = 'zoomIn' as const;
const DEFAULT_SRC = ""

const DEFAULT_LOGO_SVG = `data:image/svg+xml,${encodeURIComponent(`
<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="8" fill="#e2e8f0"/>
  <rect x="10" y="14" width="28" height="4" rx="2" fill="#94a3b8"/>
  <rect x="10" y="22" width="20" height="4" rx="2" fill="#94a3b8"/>
  <rect x="10" y="30" width="24" height="4" rx="2" fill="#94a3b8"/>
</svg>
`)}`;


// ============================================================================
// Schema & Duration Calculation
// ============================================================================

export const LogoAssetDefaults = {
    id: 'logoasset',
    src: DEFAULT_SRC,
    logoAnimation: LOGO_ANIMATIONS[0],
    width: undefined as number | undefined,
    height: undefined as number | undefined,
    className: undefined as string | undefined,
    style: undefined as React.CSSProperties | undefined,
};

export type LogoAssetProps = Partial<typeof LogoAssetDefaults>

const FALLBACK_LOGO_WIDTH = 48;
const FALLBACK_LOGO_HEIGHT = 48;

function getLogoAnimationStyle(animation: LogoAnimation, progress: number): React.CSSProperties {
    const inv = 1 - progress;
    switch (animation) {
        case 'fadeIn':
            return { opacity: progress };
        case 'zoomIn':
            return { opacity: progress, transform: `scale(${0.3 + progress * 0.7})` };
        case 'bounceIn': {
            // Overshoot then settle: scales past 1.0 then back
            const overshoot = progress < 1 ? 0.3 + progress * 0.9 + Math.sin(progress * Math.PI) * 0.15 : 1;
            return { opacity: Math.min(progress * 2, 1), transform: `scale(${overshoot})` };
        }
        case 'spinIn':
            return { opacity: progress, transform: `scale(${0.3 + progress * 0.7}) rotate(${inv * 360}deg)` };
        case 'dropIn':
            return { opacity: progress, transform: `translateY(${inv * -60}px) scale(${0.8 + progress * 0.2})` };
        case 'none':
        default:
            return {};
    }
}

export function LogoAsset(initProps: LogoAssetProps): React.ReactElement {
    const defaultProps = { ...LogoAssetDefaults, ...initProps };
    const id = defaultProps.id;
    
    const props = usePatchedProps(id, defaultProps);

    const frame = useCurrentFrame();
    const { logo } = useTheme();
    const { isRendering } = useRemotionEnvironment();
    const preset = useAspectPreset();
    const styleOverride = useStyleOverride(props.id);
    const overrideTransform = typeof styleOverride.transform === 'string' ? styleOverride.transform : undefined;
    const dragStyle = usePatchedDragStyle(props.id, props.style?.transform, overrideTransform);
    const [intrinsicSize, setIntrinsicSize] = useState(() => ({
        width: logo?.width || FALLBACK_LOGO_WIDTH,
        height: logo?.height || FALLBACK_LOGO_HEIGHT,
    }));

    // Apply defaults
    const actualAnimation = props.logoAnimation ?? DEFAULT_ANIMATION;

    const { objectFit: styleObjectFit, ...restStyle } = props.style ?? {};
    const { objectFit: overrideObjectFit, ...wrapperStyleOverride } = styleOverride;
    const defaultSrc = props.src || logo?.url || DEFAULT_LOGO_SVG;

    const defaultBoxSize = Math.min(preset.width, preset.height) * 0.35;
    const canUseThemeLogoMetadata = !!logo?.url && defaultSrc === logo.url;
    const hasThemeLogoMetadata = canUseThemeLogoMetadata && (logo?.width ?? 0) > 0 && (logo?.height ?? 0) > 0;
    const resolvedIntrinsicWidth = hasThemeLogoMetadata ? logo!.width : intrinsicSize.width;
    const resolvedIntrinsicHeight = hasThemeLogoMetadata ? logo!.height : intrinsicSize.height;
    const intrinsicAspectRatioValue = resolvedIntrinsicWidth > 0 && resolvedIntrinsicHeight > 0
        ? resolvedIntrinsicWidth / resolvedIntrinsicHeight
        : 1;
    const intrinsicAspectRatio = `${resolvedIntrinsicWidth} / ${resolvedIntrinsicHeight}`;
    const autoBoxWidth = intrinsicAspectRatioValue >= 1
        ? defaultBoxSize
        : defaultBoxSize * intrinsicAspectRatioValue;
    const autoBoxHeight = intrinsicAspectRatioValue >= 1
        ? defaultBoxSize / intrinsicAspectRatioValue
        : defaultBoxSize;
    const resolvedBoxWidth = props.width
        ?? (props.height ? props.height * intrinsicAspectRatioValue : autoBoxWidth);
    const resolvedBoxHeight = props.height
        ?? (props.width ? props.width / intrinsicAspectRatioValue : autoBoxHeight);
    const rawObjectFit = overrideObjectFit ?? styleObjectFit;
    const resolvedObjectFit: React.CSSProperties['objectFit'] =
        typeof rawObjectFit === 'string' ? rawObjectFit as React.CSSProperties['objectFit'] : 'contain';

    const animDuration = DEFAULT_ANIMATION_DURATION;
    const animProgress = actualAnimation !== 'none'
        ? interpolateWithEasing(frame, [0, animDuration], [0, 1], 'ease-out')
        : 1;
    const animStyle = getLogoAnimationStyle(actualAnimation, animProgress);

    useEffect(() => {
        if (!defaultSrc || !isRendering) return;
        const unpreload = preloadImage(defaultSrc);
        return () => {
            unpreload();
        };
    }, [defaultSrc, isRendering]);

    useEffect(() => {
        if (!defaultSrc || hasThemeLogoMetadata) return;

        let cancelled = false;
        const image = new Image();

        image.onload = () => {
            if (cancelled) return;

            setIntrinsicSize({
                width: image.naturalWidth || FALLBACK_LOGO_WIDTH,
                height: image.naturalHeight || FALLBACK_LOGO_HEIGHT,
            });
        };

        image.src = defaultSrc;

        return () => {
            cancelled = true;
        };
    }, [defaultSrc, hasThemeLogoMetadata]);

    return (
        <span
            id={props.id}
            className={props.className}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: resolvedBoxWidth,
                height: resolvedBoxHeight,
                ...restStyle,
                ...wrapperStyleOverride,
                ...dragStyle,
            }}
        >
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    ...animStyle,
                }}
            >
                {/* The wrapper owns sizing; the image always scales to fill that box
                    while remaining fully visible via object-fit: contain. */}
                <img
                    src={defaultSrc}
                    width={resolvedIntrinsicWidth}
                    height={resolvedIntrinsicHeight}
                    style={{
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        objectFit: resolvedObjectFit,
                        aspectRatio: intrinsicAspectRatio,
                    }}
                />
            </span>
        </span>
    );
}
// ============================================================================
// Registry Descriptor
// ============================================================================

export const LogoAssetSchemaFields = [
    {
        "name": "src",
        "type": "string",
        "datatype": "media",
        "map": "props.src"
    },
    {
        "name": "width",
        "type": "number",
        "map": "props.width"
    },
    {
        "name": "height",
        "type": "number",
        "map": "props.height"
    },
    {
        "name": "logoAnimation",
        "type": "string",
        "default": DEFAULT_ANIMATION,
        "sub_type": "enum",
        "enum": LOGO_ANIMATIONS
    }
]

export const LogoAssetDescriptor: ComponentRegistration = {
    name: 'LogoAsset',
    type: 'content',
    tags: ['CTA'],
    schema: [{
        type: "component",
        name: 'logoasset',
        fields: LogoAssetSchemaFields
    }],
    llmSchema: [],
    description: 'Logo reveal. Default is brand logo, no props.',
    instructions: 'Use as the final scene.',
    celExpression: '30',
};
