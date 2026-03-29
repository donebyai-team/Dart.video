import React from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { useStyleContext } from '../../../styles/StyleContext';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { Text } from '../../../core/text/Text';
import { VideoAsset } from '../../../core/assets/VideoAsset';
import {  TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens/semantic';
import { usePatchedProps, useStyleOverride } from '../../../patches';
import { resolveTypography } from '../../../tokens';
import { useTheme } from '../../../theme';
import { getEntranceTransform, ENTRANCE_ANIMATIONS } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../../../registry/registry';

// Default constants
const DEFAULT_TEXT_DURATION = 30;
const DEFAULT_VIDEO_DURATION = 40;
const DEFAULT_VIDEO_START_DELAY = 10;
const DEFAULT_VARIANT = 'subheading' as const;
const DEFAULT_ANIMATION = 'slideUp' as const;
const DEFAULT_BORDER_RADIUS = 16;
const DEFAULT_WIDTH = 1920 * 0.7;
const DEFAULT_HEIGHT = 1080 * 0.7;

export const AnimatedVideoSchema = z.object({
    id: z.string().optional(),
    text: z.string().min(1, "text is required"),
    src: z.string().url("src must be a valid URL"),
    variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).default(DEFAULT_VARIANT).optional(),
    animation: z.enum(ENTRANCE_ANIMATIONS).default(DEFAULT_ANIMATION).optional(),
    borderRadius: z.number().min(0, "borderRadius cannot be negative").default(DEFAULT_BORDER_RADIUS).optional(),
    width: z.number().min(1, "width must be positive").default(DEFAULT_WIDTH).optional(),
    height: z.number().min(1, "height must be positive").default(DEFAULT_HEIGHT).optional(),
    style: z.any().optional(),
});

export type AnimatedVideoProps = z.input<typeof AnimatedVideoSchema>;

export function AnimatedVideo(propsInit: AnimatedVideoProps): React.ReactElement {
    const patchedProps = usePatchedProps(propsInit.id, propsInit);
    const props = { ...AnimatedVideoSchema.parse(patchedProps), id: propsInit.id };

    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();

    // Apply defaults
    const actualVariant = props.variant ?? DEFAULT_VARIANT;
    const actualAnimation = props.animation ?? DEFAULT_ANIMATION;
    const actualBorderRadius = props.borderRadius ?? DEFAULT_BORDER_RADIUS;
    const imageWidth = props.width ?? DEFAULT_WIDTH;
    const imageHeight = props.height ?? DEFAULT_HEIGHT;

    const styleOverride = useStyleOverride(props.id);

    const easing = styleConfig.motion.entrance;

    const textDuration = DEFAULT_TEXT_DURATION;
    const videoDuration = DEFAULT_VIDEO_DURATION;
    const videoStart = DEFAULT_VIDEO_START_DELAY;

    const textProgress = interpolateWithEasing(
        frame,
        [0, textDuration],
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
            id={props.id}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 24,
            }}
        >
            <div style={{ opacity: textProgress, transform: `translateY(${(1 - textProgress) * 20}px)` }}>
                <Text id={`text-${props.id}`} text={props.text} style={
                    {
                        ...resolveTypography(actualVariant, styleConfig, theme, preset),
                        ...props.style,
                        ...styleOverride
                    }}
                />
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
                <VideoAsset id={`videoasset-${props.id}`} src={props.src} width={imageWidth} height={imageHeight} />
            </div>
        </div>
    );
}

// ============================================================================
// Registry Descriptor
// ============================================================================

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
    description: 'Displays a text label above a video with entrance animation. Use for demo videos, testimonials, or video content. Required props: text="Watch Demo", src="attachment video url". The text animates in first, then the video follows.',
    calculateDuration: calculateAnimatedVideoDuration,
};
