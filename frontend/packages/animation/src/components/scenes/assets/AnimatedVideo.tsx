import React from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { Text, TextProps } from '../../../core/assets/Text';
import { VideoAsset } from '../../../core/assets/VideoAsset';
import { usePatchedProps } from '../../../patches';
import { getEntranceTransform, ENTRANCE_ANIMATIONS } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';

// Default constants
const DEFAULT_TEXT_DURATION = 30;
const DEFAULT_VIDEO_DURATION = 40;
const DEFAULT_VIDEO_START_DELAY = 10;
const DEFAULT_VARIANT = 'subheading' as const;
const DEFAULT_ANIMATION = 'slideUp' as const;
const DEFAULT_WIDTH = 1920 * 0.7;
const DEFAULT_HEIGHT = 1080 * 0.7;

export const AnimatedVideoSchema = z.object({
    id: z.string().optional(),
    text: z.string().default(''),
    src: z.string(),
    entranceAnimation: z.enum(ENTRANCE_ANIMATIONS).default(DEFAULT_ANIMATION).optional(),
});


export function AnimatedVideo(): React.ReactElement {
    const parentProps = usePatchedProps("scene", {}) as z.infer<typeof AnimatedVideoSchema>;
    const textProps = usePatchedProps("text", {}) as TextProps;
    const videoProps = usePatchedProps("videoasset", {}) as any;

    const frame = useCurrentFrame();

    const actualAnimation = parentProps.entranceAnimation ?? DEFAULT_ANIMATION;
    const textDuration = DEFAULT_TEXT_DURATION;
    const videoDuration = DEFAULT_VIDEO_DURATION;
    const videoStart = DEFAULT_VIDEO_START_DELAY;

    const textProgress = interpolateWithEasing(
        frame,
        [0, textDuration],
        [0, 1],
        'ease-out',
    );

    const videoProgress = interpolateWithEasing(
        frame,
        [videoStart, videoStart + videoDuration],
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
                <Text id='text' text={textProps.text} variant={textProps.variant} />
            </div>
            <div
                style={{
                    opacity: videoProgress,
                    transform: getEntranceTransform(actualAnimation, videoProgress),
                }}
            >
                <VideoAsset
                    id='videoasset'
                    video={videoProps.video}
                    width={videoProps.width}
                    height={videoProps.height}
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


export const VideoAssetSchema = [
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
                "subtype": "content",
                
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
        name: 'videoasset',
        fields: [
            {
                "name": "src",
                "type": "string",
                "datatype": "media",
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

export const AnimatedVideoDescriptor: ComponentRegistration = {
    name: 'AnimatedVideo',
    type: 'scene',
    tags: ['Solution', 'Product Info'],
    schema: VideoAssetSchema,
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
    description: 'Label + video entrance. Duration = video length.',
    celExpression: '500'
};

