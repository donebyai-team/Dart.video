import React from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { Text, TextProps } from '../../../core/assets/Text';
import { ImageAsset } from '../../../core/assets/ImageAsset';
import { usePatchedProps } from '../../../patches';
import { getEntranceTransform, ENTRANCE_ANIMATIONS } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';

// Default constants
const DEFAULT_VARIANT = 'subheading' as const;
const DEFAULT_ANIMATION = 'slideUp' as const;
const DEFAULT_WIDTH = 1920 * 0.7;
const DEFAULT_HEIGHT = 1080 * 0.7;

// ============================================================================
// Schema & Duration Calculation
// ============================================================================

export const AnimatedImageSchema = z.object({
    id: z.string().optional(),
    text: z.string().default(''),
    src: z.string(),
    entranceAnimation: z.enum(ENTRANCE_ANIMATIONS).default(DEFAULT_ANIMATION).optional(),
});

/**
 * Scene showing a text label above a full image that slides up into view.
 * Text fades in first, then the image slides up with a border radius.
 */

export function AnimatedImage(): React.ReactElement {
    const parentProps = usePatchedProps("scene", {}) as z.infer<typeof AnimatedImageSchema>;
    const textProps = usePatchedProps("text", {}) as TextProps;
    const imageProps = usePatchedProps("imageasset", {}) as any;

    const frame = useCurrentFrame();

    // Apply defaults
    const actualAnimation = parentProps.entranceAnimation ?? DEFAULT_ANIMATION;

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
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 24,
            }}
        >

            <div style={{ opacity: textProgress, transform: `translateY(${(1 - textProgress) * 20}px)` }}>
                <Text text={textProps.text} id='text' variant={textProps.variant} />
            </div>
            <div
                style={{
                    opacity: imageProgress,
                    transform: getEntranceTransform(actualAnimation, imageProgress),
                }}
            >
                <ImageAsset
                    id='imageasset'
                    image={imageProps.image}
                    width={imageProps.width}
                    height={imageProps.height}
                    style={{
                        overflow: 'hidden',
                    }}
                />
            </div>
        </div>
    );
}


// ============================================================================
// Registry Descriptor
// ============================================================================



export const AnimatedImageAssetSchema = [
    {
        type: "component",
        name: 'scene',
        fields: [
            {
                "name": "entranceAnimation",
                "type": "string",
                "subtype": "enum",
                "default": DEFAULT_ANIMATION
            }
        ]
    },
    {
        type: "component",
        name: 'text',
        fields: [
            {
                "name": "text",
                "type": "string",                
                "map": "props.text"
            },
            {
                "name": "variant",
                "type": "string",
                "subtype": "enum",
                "default": DEFAULT_VARIANT
            }
        ]
    },
    {
        type: "component",
        name: 'imageasset',
        fields: [
            {
                "name": "src",
                "type": "string",
                "dataType": "media",               
                "map": "props.src"
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

export const AnimatedImageDescriptor: ComponentRegistration = {
    name: 'AnimatedImage',
    type: 'scene',
    tags: ['Solution', 'Product Info'],
    schema: AnimatedImageAssetSchema,
    llmSchema: [
        {
            name: 'text',
            type: 'string',
        },
        {
            name: 'src',
            type: 'string',
        },
    ],
    description: 'Label + image entrance. Use for product/feature visuals.',
    celExpression: '80'
};

