import React from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { ImageAsset } from '../../../core/assets/ImageAsset';
import { useArrayPatch, usePatchedProps } from '../../../patches';
import { DIRECTIONS, Direction } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';
import { ArrayItem } from '../../../core/assets/ArrayItem';

// Default constants
const DEFAULT_ENTRANCE_DURATION = 30;
const DEFAULT_HOLD_DURATION = 20;
const DEFAULT_PEEL_DURATION = 20;
const DEFAULT_DIRECTION = 'right' as const;
const DEFAULT_STACK_OFFSET = 20;
const DEFAULT_WIDTH = 1920 * 0.7;
const DEFAULT_HEIGHT = 1080 * 0.7;

// ============================================================================
// Schema & Type
// ============================================================================

export const ImagePeelDefaults = {
    id: 'imagepeel',
    direction: DEFAULT_DIRECTION as Direction,
    holdDuration: DEFAULT_HOLD_DURATION,
    peelDuration: DEFAULT_PEEL_DURATION,
    stackOffset: DEFAULT_STACK_OFFSET,
};

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

export function ImagePeel(): React.ReactElement {
    const parentProps = usePatchedProps("scene", ImagePeelDefaults);
    const arrayProps = useArrayPatch("images");

    const frame = useCurrentFrame();

    // Apply defaults
    const actualDirection: Direction = parentProps.direction || DEFAULT_DIRECTION;
    const actualHoldDuration = parentProps.holdDuration || DEFAULT_HOLD_DURATION;
    const actualPeelDuration = parentProps.peelDuration || DEFAULT_PEEL_DURATION;
    const actualStackOffset = parentProps.stackOffset || DEFAULT_STACK_OFFSET;

    const count = arrayProps.length;
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
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: entranceProgress,
                transform: `scale(${0.9 + entranceProgress * 0.1})`,
            }}
        >
            <div
                style={{
                    position: 'relative',
                    width: DEFAULT_WIDTH,
                    height: DEFAULT_HEIGHT,
                }}
            >
                {/* Render bottom to top: last image at bottom, first on top */}
                {[...arrayProps].reverse().map((item, reversedIndex) => {
                    const [eid, patch] = Object.entries(item)[0]
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
                        <ArrayItem
                            key={`icons-${index}`} // any unique id works
                            index={index}
                            source="images"
                            removeControl="mid-left"
                            addControl="mid-right"
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    transformOrigin: actualDirection === 'left' ? 'top left'
                                        : actualDirection === 'right' ? 'top right'
                                            : actualDirection === 'up' ? 'top center'
                                                : 'bottom center',
                                    transform: `translate(${stackX}px, ${stackY}px) ${peelTransform}`,
                                    opacity: peelOpacity,
                                }}
                            >
                                <ImageAsset
                                    id={eid}
                                    src={patch.src}
                                    width={patch.width}
                                    height={patch.height}
                                    style={{
                                        overflow: 'hidden',
                                    }}
                                />
                            </div>
                        </ArrayItem>
                    );
                })}
            </div>
        </div>
    );
}

// ============================================================================
// Registry Descriptor
// ============================================================================

export const ImagePeelSchemaFields = [
    {
        type: "repeat",
        source: "images",
        map: "props.images",
        components: [
            {
                name: "imageasset",
                fields: [
                    {
                        "name": "src",
                        "type": "string",
                        "map": "item",
                        "dataType": "media",
                    },
                    {
                        "name": "width",
                        "type": "number",
                        "default": DEFAULT_WIDTH
                    },
                    {
                        "name": "height",
                        "type": "number",
                        "default": DEFAULT_HEIGHT
                    }
                ]
            }
        ]
    },
    {
        type: "component",
        name: 'scene',
        fields: [
            {
                "name": "direction",
                "type": "string",
                "subtype": "enum",
                "default": DEFAULT_DIRECTION
            },
            {
                "name": "holdDuration",
                "type": "number",
                "default": DEFAULT_HOLD_DURATION
            },
            {
                "name": "peelDuration",
                "type": "number",
                "default": DEFAULT_PEEL_DURATION
            },
            {
                "name": "stackOffset",
                "type": "number",
                "default": DEFAULT_STACK_OFFSET
            }
        ]
    }
]

export const ImagePeelDescriptor: ComponentRegistration = {
    name: 'ImagePeel',
    type: 'scene',
    tags: ['Solution', 'Product Info'],
    schema: ImagePeelSchemaFields,
    llmSchema: [
        {
            name: 'images',
            type: 'array',
            "items": {
                "type": "string"
            }
        },
    ],
    description: 'Images peel away one by one. Use for before/after or variations. Min 2 images.',
    celExpression: 'ceil(30 + size(props.images) * (props.scene.holdDuration + props.scene.peelDuration))',
};

