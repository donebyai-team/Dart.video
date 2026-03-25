import { preloadImage } from "@remotion/preload";
import { useEffect } from "react";
import { useCurrentFrame, useRemotionEnvironment } from "remotion";
import z from 'zod';
import { usePatchedProp, useStyleOverride } from "../../../patches/PatchContext";
import { useSpeedFactor, applySpeedFactor } from "../../../duration/speedFactor";
import { useStyleContext } from "../../../styles/StyleContext";
import { useAspectPreset } from "../../../styles/AspectPresetContext";
import { interpolateWithEasing } from "../../../styles/easingResolver";
import { useTheme } from "../../../theme";
import { LOGO_ANIMATIONS, LogoAnimation } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../../../registry/registry';

// Default constants
const DEFAULT_ANIMATION_DURATION = 30;
const DEFAULT_ANIMATION = 'zoomIn' as const;

const DEFAULT_LOGO_SVG = `data:image/svg+xml,${encodeURIComponent(`
<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="8" fill="#e2e8f0"/>
  <rect x="10" y="14" width="28" height="4" rx="2" fill="#94a3b8"/>
  <rect x="10" y="22" width="20" height="4" rx="2" fill="#94a3b8"/>
  <rect x="10" y="30" width="24" height="4" rx="2" fill="#94a3b8"/>
</svg>
`)}`;


export interface LogoAssetProps {
    src?: string;
    width?: number;
    height?: number;
    animation?: LogoAnimation;
    startAt?: number;
    style?: React.CSSProperties;
    className?: string;
    id?: string;
}

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

export function LogoAsset({
    src,
    width,
    height,
    animation,
    startAt,
    style,
    className,
    id,
}: LogoAssetProps): React.ReactElement {
    const frame = useCurrentFrame();
    const { logo } = useTheme();
    const { isRendering } = useRemotionEnvironment();
    const styleConfig = useStyleContext();
    const preset = useAspectPreset();
    const speedFactor = useSpeedFactor();
    const styleOverride = useStyleOverride(id);

    // Apply defaults
    const actualAnimation = animation ?? DEFAULT_ANIMATION;
    const actualStartAt = startAt ?? 0;
    const { objectFit: styleObjectFit, ...restStyle } = style ?? {};
    const { objectFit: overrideObjectFit, ...wrapperStyleOverride } = styleOverride;
    const patchedWidth = usePatchedProp<number | undefined>(id, 'width', width);
    const patchedHeight = usePatchedProp<number | undefined>(id, 'height', height);
    const defaultSrc = src ?? logo?.url ?? DEFAULT_LOGO_SVG;
    const patchedSrc = usePatchedProp<string | undefined>(id, 'src', defaultSrc);
    const defaultBoxSize = Math.min(preset.width, preset.height) * 0.35;
    // Width/height define the bounding box. If only one is provided, mirror it
    // so the logo still gets a deterministic square box to fit into.
    const resolvedBoxWidth = patchedWidth ?? patchedHeight ?? defaultBoxSize;
    const resolvedBoxHeight = patchedHeight ?? patchedWidth ?? defaultBoxSize;
    // Raster assets can provide a stable intrinsic ratio up front; SVG uploads
    // may come through as 0x0, so ignore invalid metadata and let the browser fit
    // the asset inside the wrapper box instead.
    const canUseThemeLogoMetadata = !!logo?.url && patchedSrc === logo.url;
    const hasIntrinsicSize = canUseThemeLogoMetadata && (logo?.width ?? 0) > 0 && (logo?.height ?? 0) > 0;
    const intrinsicAspectRatio = hasIntrinsicSize ? `${logo!.width} / ${logo!.height}` : undefined;
    const rawObjectFit = overrideObjectFit ?? styleObjectFit;
    const resolvedObjectFit: React.CSSProperties['objectFit'] =
        typeof rawObjectFit === 'string' ? rawObjectFit as React.CSSProperties['objectFit'] : 'contain';

    const patchedAnimation = usePatchedProp<LogoAnimation>(id, 'animation', actualAnimation);
    const adjustedStartAt = applySpeedFactor(actualStartAt, speedFactor);
    const animDuration = DEFAULT_ANIMATION_DURATION;
    const animProgress = patchedAnimation !== 'none'
        ? interpolateWithEasing(frame, [adjustedStartAt, adjustedStartAt + animDuration], [0, 1], styleConfig.motion.entrance)
        : 1;
    const animStyle = getLogoAnimationStyle(patchedAnimation, animProgress);

    useEffect(() => {
        if (!patchedSrc || !isRendering) return;
        const unpreload = preloadImage(patchedSrc);
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
                ...animStyle,
                ...restStyle,
                ...wrapperStyleOverride,
            }}
        >
            {/* The wrapper owns sizing; the image always scales to fill that box
                while remaining fully visible via object-fit: contain. */}
            <img
                src={patchedSrc}
                width={hasIntrinsicSize ? logo?.width : undefined}
                height={hasIntrinsicSize ? logo?.height : undefined}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: resolvedObjectFit,
                    aspectRatio: intrinsicAspectRatio,
                }}
            />
        </span>
    );
}

// ============================================================================
// Schema & Duration Calculation
// ============================================================================

export const LogoAssetSchema = z.object({
    src: z.string().url("src must be a valid URL").optional(),
    width: z.number().min(1, "width must be positive").optional(),
    height: z.number().min(1, "height must be positive").optional(),
    animation: z.enum(LOGO_ANIMATIONS).default(DEFAULT_ANIMATION).optional(),
    startAt: z.number().min(0, "startAt cannot be negative").default(0).optional(),
    style: z.any().optional(),
    className: z.string().optional(),
});

export function calculateLogoAssetDuration(props: LogoAssetProps): DurationResult {
    // Validate props
    const validation = LogoAssetSchema.safeParse(props);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return {
            success: false,
            error: firstError.message,
            field: firstError.path[0] as string,
        };
    }

    const validated = validation.data;
    
    // Fixed duration based on animation
    const animationType = validated.animation ?? 'zoomIn';
    
    if (animationType === 'none') {
        return {
            success: true,
            duration: 0, // No animation, instant display
        };
    }
    
    return {
        success: true,
        duration: DEFAULT_ANIMATION_DURATION,
    };
}

// ============================================================================
// Registry Descriptor
// ============================================================================

export const LogoAssetDescriptor: ComponentRegistration = {
    name: 'LogoAsset',
    type: 'brand',
    fullSchema: LogoAssetSchema,
    editorProps: ['src', 'animation', 'width', 'height'],
    description: 'Displays a logo with entrance animation. Use for brand intros or logo reveals. Optional props: src="attachment url" (uses theme logo if omitted), animation="zoomIn" (options: fadeIn, zoomIn, bounceIn, spinIn, dropIn, none). Set animation="none" for instant display.',
    calculateDuration: calculateLogoAssetDuration,
};
