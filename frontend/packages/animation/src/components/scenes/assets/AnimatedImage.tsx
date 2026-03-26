import React from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { useSpeedFactor, applySpeedFactor } from '../../../duration/speedFactor';
import { useStyleContext } from '../../../styles/StyleContext';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { Text } from '../../../core/text/Text';
import { ImageAsset } from '../../../core/assets/ImageAsset';
import { TypographyVariant, TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens/semantic';
import { usePatchedProp, useStyleOverride } from '../../../patches';
import { resolveTypography } from '../../../tokens';
import { useTheme } from '../../../theme';
import { EntranceAnimation, getEntranceTransform, ENTRANCE_ANIMATIONS } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../../../registry/registry';

// Default constants
const DEFAULT_TEXT_DURATION = 30;
const DEFAULT_DELAY = 10;
const DEFAULT_IMAGE_DURATION = 50;
const DEFAULT_VARIANT = 'subheading' as const;
const DEFAULT_ANIMATION = 'slideUp' as const;
const DEFAULT_BORDER_RADIUS = 16;

export interface AnimatedImageProps {
    /** The text displayed above the image. */
    text: string;
    /** Image source URL. */
    src: string;
    /** Typography variant for the text. */
    variant?: TypographyVariant;
    /** Image entrance animation. */
    animation?: EntranceAnimation;
    /** Frame at which the animation begins. */
    startAt?: number;
    /** Border radius applied to the image. */
    borderRadius?: number;
    /** Width of the image container. */
    width?: number;
    /** Height of the image container. */
    height?: number;
    style?: React.CSSProperties;
    id?: string;
}

/**
 * Scene showing a text label above a full image that slides up into view.
 * Text fades in first, then the image slides up with a border radius.
 */

export function AnimatedImage({
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
}: AnimatedImageProps): React.ReactElement {
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

    const textDuration = 30;
    const imageDuration = 40;
    const imageStart = adjustedStartAt + 10;

    const textProgress = interpolateWithEasing(
        frame,
        [adjustedStartAt, adjustedStartAt + textDuration],
        [0, 1],
        easing,
    );

    const imageProgress = interpolateWithEasing(
        frame,
        [imageStart, imageStart + imageDuration],
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
                    opacity: imageProgress,
                    transform: getEntranceTransform(actualAnimation, imageProgress),
                    borderRadius: actualBorderRadius,
                    overflow: 'hidden',
                    boxShadow: "0 20px 40px rgba(0,0,0,0.25), 0 12px 24px rgba(0,0,0,0.15)",
                }}
            >
                <ImageAsset src={patchedSrc} width={patchedWidth} height={patchedHeight} />
            </div>
        </div>
    );
}

// ============================================================================
// Schema & Duration Calculation
// ============================================================================

export const AnimatedImageSchema = z.object({
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

export function calculateAnimatedImageDuration(props: AnimatedImageProps): DurationResult {
    // Validate props
    const validation = AnimatedImageSchema.safeParse(props);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return {
            success: false,
            error: firstError.message,
            field: firstError.path[0] as string,
        };
    }

    // Fixed duration: text + delay + image = 80 frames total
    // This is a good baseline for showing an image with text
    const textDuration = DEFAULT_TEXT_DURATION;
    const delay = DEFAULT_DELAY;
    const imageDuration = DEFAULT_IMAGE_DURATION;
    
    return {
        success: true,
        duration: textDuration + delay + imageDuration,
    };
}

// ============================================================================
// Registry Descriptor
// ============================================================================

export const AnimatedImageDescriptor: ComponentRegistration = {
    name: 'AnimatedImage',
    type: 'scene',
    fullSchema: AnimatedImageSchema,
    editorProps: ['text', 'src', 'variant', 'animation', 'borderRadius'],
    description: 'Displays a text label above an image with entrance animation. Use for product showcases, feature highlights, or visual content. Required props: text="New Product Launch", src="attachment url". The text animates in first, then the image follows.',
    calculateDuration: calculateAnimatedImageDuration,
};
