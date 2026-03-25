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
    const actualVariant = variant ?? 'subheading';
    const actualAnimation = animation ?? 'slideUp';
    const actualStartAt = startAt ?? 0;
    const actualBorderRadius = borderRadius ?? 16;

    const adjustedStartAt = applySpeedFactor(actualStartAt, speedFactor);

    const patchedVariant = usePatchedProp<TypographyVariant>(id, 'variant', actualVariant);
    const styleOverride = useStyleOverride(id);
    const patchedSrc = usePatchedProp<string | undefined>(id, 'src', src);
    const patchedWidth = usePatchedProp<number | undefined>(id, 'width', width ?? preset.width * 0.7);
    const patchedHeight = usePatchedProp<number | undefined>(id, 'height', height ?? preset.height * 0.7);

    const easing = styleConfig.motion.entrance;

    const textDuration = 30;
    const videoDuration = 40;
    const videoStart = adjustedStartAt + 10;

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
    variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).optional(),
    animation: z.enum(ENTRANCE_ANIMATIONS).optional(),
    startAt: z.number().min(0, "startAt cannot be negative").default(0).optional(),
    borderRadius: z.number().min(0, "borderRadius cannot be negative").default(16).optional(),
    width: z.number().min(1, "width must be positive").optional(),
    height: z.number().min(1, "height must be positive").optional(),
    style: z.any().optional(),
});

// Note: No duration calculator - video duration depends on video length

export const AnimatedVideoDescriptor: ComponentRegistration = {
    name: 'AnimatedVideo',
    type: 'scene',
    fullSchema: AnimatedVideoSchema,
    editorProps: ['text', 'src', 'variant', 'animation', 'borderRadius'],
    description: 'text label above a video with entrance animation (slide, fade, scale)',
    // No calculateDuration - video duration is determined by video file length
};
