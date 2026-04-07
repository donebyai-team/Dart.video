import React from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { useStyleContext } from '../../../styles/StyleContext';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { ImageAsset } from '../../../core/assets/ImageAsset';
import { usePatchedProps } from '../../../patches';
import { DIRECTIONS, Direction } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../../../registry/registry';

// Default constants
const DEFAULT_ENTRANCE_DURATION = 30;
const DEFAULT_HOLD_DURATION = 20;
const DEFAULT_PEEL_DURATION = 20;
const DEFAULT_DIRECTION = 'right' as const;
const DEFAULT_STACK_OFFSET = 20;
const DEFAULT_BORDER_RADIUS = 16;
const DEFAULT_WIDTH = 1920 * 0.7;
const DEFAULT_HEIGHT = 1080 * 0.7;

// ============================================================================
// Schema & Type
// ============================================================================

export const ImagePeelSchema = z.object({
    id: z.string().optional(),
    images: z.array(z.string()),
    direction: z.enum(DIRECTIONS).default(DEFAULT_DIRECTION).optional(),
    holdDuration: z.number().default(DEFAULT_HOLD_DURATION).optional(),
    peelDuration: z.number().default(DEFAULT_PEEL_DURATION).optional(),
    stackOffset: z.number().default(DEFAULT_STACK_OFFSET).optional(),
    borderRadius: z.number().default(DEFAULT_BORDER_RADIUS).optional(),
    width: z.number().default(DEFAULT_WIDTH).optional(),
    height: z.number().default(DEFAULT_HEIGHT).optional(),
    style: z.any().optional(),
});

export type ImagePeelProps = z.input<typeof ImagePeelSchema>;

function getPeelTransform(direction: Direction, progress: number): { transform: string; opacity: number } {
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

export function ImagePeel(propsInit: ImagePeelProps): React.ReactElement {
    const patchedProps = usePatchedProps(propsInit.id, propsInit);
    const props = { ...ImagePeelSchema.parse(patchedProps), id: propsInit.id };

    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();

    // Apply defaults
    const actualDirection = props.direction ?? DEFAULT_DIRECTION;
    const actualHoldDuration = props.holdDuration ?? DEFAULT_HOLD_DURATION;
    const actualPeelDuration = props.peelDuration ?? DEFAULT_PEEL_DURATION;
    const actualStackOffset = props.stackOffset ?? DEFAULT_STACK_OFFSET;
    const actualBorderRadius = props.borderRadius ?? DEFAULT_BORDER_RADIUS;

    const resolvedWidth = props.width ?? DEFAULT_WIDTH;
    const resolvedHeight = props.height ?? DEFAULT_HEIGHT;

    const count = props.images.length;
    // Each image: [enter] -> [hold] -> [peel away], staggered

    const cycleDuration = actualHoldDuration + actualPeelDuration;

    // Entrance animation for the whole stack
    const entranceDuration = 30;
    const entranceProgress = interpolateWithEasing(
        frame,
        [0, entranceDuration],
        [0, 1],
        'ease-out',
    );

    return (
        <div
            id={props.id}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: entranceProgress,
                transform: `scale(${0.9 + entranceProgress * 0.1})`,
                ...props.style,
            }}
        >
            <div
                style={{
                    position: 'relative',
                    width: resolvedWidth,
                    height: resolvedHeight,
                }}
            >
                {/* Render bottom to top: last image at bottom, first on top */}
                {[...props.images].reverse().map((src, reversedIndex) => {
                    const index = count - 1 - reversedIndex;
                    const peelStart = entranceDuration + index * cycleDuration;

                    // Progress of this image peeling away (0 = stationary, 1 = fully peeled)
                    const peelProgress = interpolateWithEasing(
                        frame,
                        [peelStart + actualHoldDuration, peelStart + actualHoldDuration + actualPeelDuration],
                        [0, 1],
                        'ease-out',
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
                            <ImageAsset id={`imageasset-${index}-${props.id}`} src={src} width={resolvedWidth} height={resolvedHeight} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ============================================================================
// Duration Calculation
// ============================================================================

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

    if (validated.images.length < 2) {
        return {
            success: false,
            error: "images must contain at least 2 images",
            field: "images",
        };
    }

    // Calculate duration based on number of images
    const entranceDuration = DEFAULT_ENTRANCE_DURATION;
    const holdDuration = validated.holdDuration ?? DEFAULT_HOLD_DURATION;
    const peelDuration = validated.peelDuration ?? DEFAULT_PEEL_DURATION;
    const cycleDuration = holdDuration + peelDuration;

    // Total: entrance + (cycles for all images)
    const totalDuration = entranceDuration + (validated.images.length * cycleDuration);

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
    tags: ['Solution', 'Product Info'],
    fullSchema: ImagePeelSchema,
    description: 'Images peel away one by one. Use for before/after or variations. Min 2 images.',
    calculateDuration: calculateImagePeelDuration,
};
