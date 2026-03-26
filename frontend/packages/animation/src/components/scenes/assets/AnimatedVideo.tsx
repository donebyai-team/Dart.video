import React from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { useSpeedFactor, applySpeedFactor } from '../../../duration/speedFactor';
import { useStyleContext } from '../../../styles/StyleContext';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { Text } from '../../../core/text/Text';
import { VideoAsset } from '../../../core/assets/VideoAsset';
import { TypographyVariant, TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens/semantic';
import { usePatchedProp, useStyleOverride } from '../../../patches';
import { resolveTypography } from '../../../tokens';
import { useTheme } from '../../../theme';
import { EntranceAnimation, getEntranceTransform, ENTRANCE_ANIMATIONS } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../../../registry/registry';

// Default constants
const DEFAULT_TEXT_DURATION = 30;
const DEFAULT_VIDEO_DURATION = 40;
const DEFAULT_VIDEO_START_DELAY = 10;
const DEFAULT_VARIANT = 'subheading' as const;
const DEFAULT_ANIMATION = 'slideUp' as const;
const DEFAULT_BORDER_RADIUS = 16;

export interface AnimatedVideoProps {
    /** The text displayed above the video. */
    text: string;
    /** Video source URL. */
    src: string;
    /** Typography variant for the text. */
    variant?: TypographyVariant;
    /** Video entrance animation. */
    animation?: EntranceAnimation;
    /** Frame at which the animation begins. */
    startAt?: number;
    /** Border radius applied to the video. */
    borderRadius?: number;
    /** Width of the video container. */
    width?: number;
    /** Height of the video container. */
    height?: number;
    style?: React.CSSProperties;
    id?: string;
}


export function AnimatedVideo({
    text,
    src,
    variant,
    animation,
    startAt,
    borderRadius,
    width,
    height,
    style,
    id,
}: AnimatedVideoProps): React.ReactElement {
    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();
    const speedFactor = useSpeedFactor();

    // Apply defaults
    const actualVariant = variant ?? DEFAULT_VARIANT;
    const actualAnimation = animation ?? DEFAULT_ANIMATION;
    const actualStartAt = startAt ?? 0;
    const actualBorderRadius = borderRadius ?? DEFAULT_BORDER_RADIUS;

    const adjustedStartAt = applySpeedFactor(actualStartAt, speedFactor);

    const patchedVariant = usePatchedProp<TypographyVariant>(id, 'variant', actualVariant);
    const styleOverride = useStyleOverride(id);
    const patchedSrc = usePatchedProp<string | undefined>(id, 'src', src);
    const patchedWidth = usePatchedProp<number | undefined>(id, 'width', width ?? preset.width * 0.7);
    const patchedHeight = usePatchedProp<number | undefined>(id, 'height', height ?? preset.height * 0.7);

    const easing = styleConfig.motion.entrance;

    const textDuration = DEFAULT_TEXT_DURATION;
    const videoDuration = DEFAULT_VIDEO_DURATION;
    const videoStart = adjustedStartAt + DEFAULT_VIDEO_START_DELAY;

    const textProgress = interpolateWithEasing(
        frame,
        [adjustedStartAt, adjustedStartAt + textDuration],
        [0, 1],
        easing,
    );

    const videoProgress = interpolateWithEasing(
        frame,
        [videoStart, videoStart + videoDuration],
        [0, 1],
        easing,
    );

    return (
        <div
            id={id}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 24,
            }}
        >
            <div style={{ opacity: textProgress, transform: `translateY(${(1 - textProgress) * 20}px)` }}>
                <Text style={
                    {
                        ...resolveTypography(patchedVariant, styleConfig, theme, preset),
                        ...style,
                        ...styleOverride
                    }}>
                    {text}
                </Text>
            </div>
            <div
                style={{
                    opacity: videoProgress,
                    transform: getEntranceTransform(actualAnimation, videoProgress),
                    borderRadius: actualBorderRadius,
                    overflow: 'hidden',
                    boxShadow: "0 20px 40px rgba(0,0,0,0.25), 0 12px 24px rgba(0,0,0,0.15)",
                }}
            >
                <VideoAsset src={patchedSrc} width={patchedWidth} height={patchedHeight} />
            </div>
        </div>
    );
}

// ============================================================================
// Schema & Registry Descriptor
// ============================================================================

export const AnimatedVideoSchema = z.object({
    text: z.string().min(1, "text is required"),
    src: z.string().url("src must be a valid URL"),
    variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).default(DEFAULT_VARIANT).optional(),
    animation: z.enum(ENTRANCE_ANIMATIONS).default(DEFAULT_ANIMATION).optional(),
    startAt: z.number().min(0, "startAt cannot be negative").default(0).optional(),
    borderRadius: z.number().min(0, "borderRadius cannot be negative").default(DEFAULT_BORDER_RADIUS).optional(),
    width: z.number().min(1, "width must be positive").optional(),
    height: z.number().min(1, "height must be positive").optional(),
    style: z.any().optional(),
});

// Default video duration (hardcoded for now - ideally would be determined by video file length)
const DEFAULT_VIDEO_SCENE_DURATION = 500;

export function calculateAnimatedVideoDuration(props: AnimatedVideoProps): DurationResult {
    // Validate props
    const validation = AnimatedVideoSchema.safeParse(props);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return {
            success: false,
            error: firstError.message,
            field: firstError.path[0] as string,
        };
    }

    // Hardcoded duration for now - video duration ideally depends on video file length
    return {
        success: true,
        duration: DEFAULT_VIDEO_SCENE_DURATION,
    };
}

export const AnimatedVideoDescriptor: ComponentRegistration = {
    name: 'AnimatedVideo',
    type: 'scene',
    fullSchema: AnimatedVideoSchema,
    editorProps: ['text', 'src', 'variant', 'animation', 'borderRadius'],
    description: 'Displays a text label above a video with entrance animation. Use for demo videos, testimonials, or video content. Required props: text="Watch Demo", src="attachment video url". The text animates in first, then the video follows.',
    calculateDuration: calculateAnimatedVideoDuration,
};
