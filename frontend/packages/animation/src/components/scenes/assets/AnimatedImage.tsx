import React from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { useStyleContext } from '../../../styles/StyleContext';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { Text } from '../../../core/text/Text';
import { ImageAsset } from '../../../core/assets/ImageAsset';
import { TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens/semantic';
import { usePatchedProps, useStyleOverride } from '../../../patches';
import { resolveTypography } from '../../../tokens';
import { useTheme } from '../../../theme';
import { getEntranceTransform, ENTRANCE_ANIMATIONS } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../../../registry/registry';

// Default constants
const DEFAULT_TEXT_DURATION = 30;
const DEFAULT_DELAY = 10;
const DEFAULT_IMAGE_DURATION = 50;
const DEFAULT_VARIANT = 'subheading' as const;
const DEFAULT_ANIMATION = 'slideUp' as const;
const DEFAULT_BORDER_RADIUS = 16;
const DEFAULT_WIDTH = 1920 * 0.7;
const DEFAULT_HEIGHT = 1080 * 0.7;

// ============================================================================
// Schema & Duration Calculation
// ============================================================================

export const AnimatedImageSchema = z.object({
    id: z.string().optional(),
    text: z.string().min(1, "text is required"),
    src: z.string().url("src must be a valid URL"),
    variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).default(DEFAULT_VARIANT).optional(),
    entranceAnimation: z.enum(ENTRANCE_ANIMATIONS).default(DEFAULT_ANIMATION).optional(),
    borderRadius: z.number().min(0, "borderRadius cannot be negative").default(DEFAULT_BORDER_RADIUS).optional(),
    width: z.number().min(1, "width must be positive").default(DEFAULT_WIDTH).optional(),
    height: z.number().min(1, "height must be positive").default(DEFAULT_HEIGHT).optional(),
    style: z.any().optional(),
});

export type AnimatedImageProps = z.input<typeof AnimatedImageSchema>;

/**
 * Scene showing a text label above a full image that slides up into view.
 * Text fades in first, then the image slides up with a border radius.
 */

export function AnimatedImage(propsInit: AnimatedImageProps): React.ReactElement {
    const patchedProps = usePatchedProps(propsInit.id, propsInit);
    const props = { ...AnimatedImageSchema.parse(patchedProps), id: propsInit.id };

    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();

    // Apply defaults
    const actualVariant = props.variant ?? DEFAULT_VARIANT;
    const actualAnimation = props.entranceAnimation ?? DEFAULT_ANIMATION;
    const actualBorderRadius = props.borderRadius ?? DEFAULT_BORDER_RADIUS;
    const imageWidth = props.width ?? DEFAULT_WIDTH;
    const imageHeight = props.height ?? DEFAULT_HEIGHT;

    const styleOverride = useStyleOverride(props.id);

    const textDuration = 30;
    const imageDuration = 40;
    const imageStart = 10;

    const textProgress = interpolateWithEasing(
        frame,
        [0, textDuration],
        [0, 1],
        'ease-out',
    );

    const imageProgress = interpolateWithEasing(
        frame,
        [imageStart, imageStart + imageDuration],
        [0, 1],
        'ease-out',
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
                <Text text={props.text} id={`text-${props.id}`} style={
                    {
                        ...resolveTypography(actualVariant, styleConfig, theme, preset),
                        ...props.style,
                        ...styleOverride
                    }} />
            </div>
            <div
                style={{
                    opacity: imageProgress,
                    transform: getEntranceTransform(actualAnimation, imageProgress),
                    borderRadius: actualBorderRadius,
                    overflow: 'hidden',
                    boxShadow: "0 20px 40px rgba(0,0,0,0.25), 0 12px 24px rgba(0,0,0,0.15)",
                    ...styleOverride
                }}
            >
                <ImageAsset id={`imageasset-${props.id}`} src={props.src} width={imageWidth} height={imageHeight} />
            </div>
        </div>
    );
}

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
    description: 'Displays a text label above an image with entrance animation. Use for product showcases, feature highlights, or visual content. Required props: text="New Product Launch", src="attachment url". The text animates in first, then the image follows.',
    calculateDuration: calculateAnimatedImageDuration,
};
