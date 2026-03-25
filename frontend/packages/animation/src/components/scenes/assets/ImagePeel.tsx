import React from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { useSpeedFactor, applySpeedFactor } from '../../../duration/speedFactor';
import { useStyleContext } from '../../../styles/StyleContext';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { ImageAsset } from '../../../core/assets/ImageAsset';
import { usePatchedProp } from '../../../patches';
import { PeelDirection, PEEL_DIRECTIONS } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../../../registry/registry';

// Default duration constants
const DEFAULT_ENTRANCE_DURATION = 30;
const DEFAULT_HOLD_DURATION = 20;
const DEFAULT_PEEL_DURATION = 20;

export interface ImagePeelProps {
    /** Array of image source URLs. */
    sources: string[];
    /** Direction images peel away towards. */
    direction?: PeelDirection;
    /** Frame at which the animation begins. */
    startAt?: number;
    /** Frames each image is visible before peeling. */
    holdDuration?: number;
    /** Frames for the peel transition. */
    peelDuration?: number;
    /** Pixel offset between stacked images. */
    stackOffset?: number;
    /** Border radius applied to each image. */
    borderRadius?: number;
    /** Width of each image. */
    width?: number;
    /** Height of each image. */
    height?: number;
    style?: React.CSSProperties;
    id?: string;
}

function getPeelTransform(direction: PeelDirection, progress: number): { transform: string; opacity: number } {
    const opacity = 1 - progress;
    switch (direction) {
        case 'left':
            return { transform: `translateX(${-progress * 120}px) rotate(${-progress * 15}deg)`, opacity };
        case 'right':
            return { transform: `translateX(${progress * 120}px) rotate(${progress * 15}deg)`, opacity };
        case 'up':
            return { transform: `translateY(${-progress * 120}px) rotate(${-progress * 10}deg)`, opacity };
        case 'down':
            return { transform: `translateY(${progress * 120}px) rotate(${progress * 10}deg)`, opacity };
    }
}

export function ImagePeel({
    sources,
    direction,
    startAt,
    holdDuration,
    peelDuration,
    stackOffset,
    borderRadius,
    width,
    height,
    style,
    id,
}: ImagePeelProps): React.ReactElement {
    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const preset = useAspectPreset();
    const speedFactor = useSpeedFactor();

    // Apply defaults
    const actualDirection = direction ?? 'right';
    const actualStartAt = startAt ?? 0;
    const actualHoldDuration = holdDuration ?? DEFAULT_HOLD_DURATION;
    const actualPeelDuration = peelDuration ?? DEFAULT_PEEL_DURATION;
    const actualStackOffset = stackOffset ?? 20;
    const actualBorderRadius = borderRadius ?? 16;

    const adjustedStartAt = applySpeedFactor(actualStartAt, speedFactor);

    const patchedSources = usePatchedProp<string[]>(id, 'sources', sources);
    const patchedWidth = usePatchedProp<number | undefined>(id, 'width', width ?? preset.width * 0.7);
    const patchedHeight = usePatchedProp<number | undefined>(id, 'height', height ?? preset.height * 0.7);

    const easing = styleConfig.motion.entrance;
    const count = patchedSources.length;
    // Each image: [enter] -> [hold] -> [peel away], staggered
    const cycleDuration = actualHoldDuration + actualPeelDuration;

    // Entrance animation for the whole stack
    const entranceDuration = 30;
    const entranceProgress = interpolateWithEasing(
        frame,
        [adjustedStartAt, adjustedStartAt + entranceDuration],
        [0, 1],
        easing,
    );

    return (
        <div
            id={id}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: entranceProgress,
                transform: `scale(${0.9 + entranceProgress * 0.1})`,
                ...style,
            }}
        >
            <div
                style={{
                    position: 'relative',
                    width: patchedWidth,
                    height: patchedHeight,
                }}
            >
                {/* Render bottom to top: last image at bottom, first on top */}
                {[...patchedSources].reverse().map((src, reversedIndex) => {
                    const index = count - 1 - reversedIndex;
                    const peelStart = adjustedStartAt + entranceDuration + index * cycleDuration;

                    // Progress of this image peeling away (0 = stationary, 1 = fully peeled)
                    const peelProgress = interpolateWithEasing(
                        frame,
                        [peelStart + actualHoldDuration, peelStart + actualHoldDuration + actualPeelDuration],
                        [0, 1],
                        easing,
                    );

                    // Once fully peeled, hide
                    const isFullyPeeled = frame >= peelStart + actualHoldDuration + actualPeelDuration;
                    if (isFullyPeeled && index < count - 1) return null;

                    const { transform: peelTransform, opacity: peelOpacity } = index < count - 1
                        ? getPeelTransform(actualDirection, peelProgress)
                        : { transform: 'none', opacity: 1 };

                    // Stack offset: cards offset toward bottom-right like a deck
                    const stackX = reversedIndex * actualStackOffset;
                    const stackY = reversedIndex * actualStackOffset;

                    return (
                        <div
                            key={index}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                borderRadius: actualBorderRadius,
                                overflow: 'hidden',
                                transformOrigin: actualDirection === 'left' ? 'top left'
                                    : actualDirection === 'right' ? 'top right'
                                    : actualDirection === 'up' ? 'top center'
                                    : 'bottom center',
                                transform: `translate(${stackX}px, ${stackY}px) ${peelTransform}`,
                                opacity: peelOpacity,
                                boxShadow: "0 20px 40px rgba(0,0,0,0.25), 0 12px 24px rgba(0,0,0,0.15)",
                            }}
                        >
                            <ImageAsset src={src} width={patchedWidth} height={patchedHeight} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ============================================================================
// Schema & Duration Calculation
// ============================================================================

export const ImagePeelSchema = z.object({
    sources: z.array(z.string().url("each source must be a valid URL")).min(2, "sources must contain at least 2 images"),
    direction: z.enum(PEEL_DIRECTIONS).optional(),
    startAt: z.number().min(0, "startAt cannot be negative").default(0).optional(),
    holdDuration: z.number().min(0, "holdDuration cannot be negative").default(DEFAULT_HOLD_DURATION).optional(),
    peelDuration: z.number().min(0, "peelDuration cannot be negative").default(DEFAULT_PEEL_DURATION).optional(),
    stackOffset: z.number().min(0, "stackOffset cannot be negative").default(20).optional(),
    borderRadius: z.number().min(0, "borderRadius cannot be negative").default(16).optional(),
    width: z.number().min(1, "width must be positive").optional(),
    height: z.number().min(1, "height must be positive").optional(),
    style: z.any().optional(),
});

export function calculateImagePeelDuration(props: ImagePeelProps): DurationResult {
    // Validate props
    const validation = ImagePeelSchema.safeParse(props);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return {
            success: false,
            error: firstError.message,
            field: firstError.path[0] as string,
        };
    }

    const validated = validation.data;
    
    if (validated.sources.length < 2) {
        return {
            success: false,
            error: "sources must contain at least 2 images",
            field: "sources",
        };
    }

    // Calculate duration based on number of images
    const entranceDuration = DEFAULT_ENTRANCE_DURATION;
    const holdDuration = validated.holdDuration ?? DEFAULT_HOLD_DURATION;
    const peelDuration = validated.peelDuration ?? DEFAULT_PEEL_DURATION;
    const cycleDuration = holdDuration + peelDuration;
    
    // Total: entrance + (cycles for all images)
    const totalDuration = entranceDuration + (validated.sources.length * cycleDuration);
    
    return {
        success: true,
        duration: Math.ceil(totalDuration),
    };
}

// ============================================================================
// Registry Descriptor
// ============================================================================

export const ImagePeelDescriptor: ComponentRegistration = {
    name: 'ImagePeel',
    type: 'scene',
    fullSchema: ImagePeelSchema,
    editorProps: ['sources', 'direction', 'holdDuration', 'peelDuration', 'borderRadius'],
    description: 'stacked images that peel away one by one to reveal the next image',
    calculateDuration: calculateImagePeelDuration,
};
