import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { CardAsset, IconAsset, IconAssetProps, MediaAsset, MediaAssetProps, Text, TextProps } from '../../../core/assets';
import { ArrayItem } from '../../../core/assets/ArrayItem';
import { useArrayPatch, useElement } from '../../../patches';
import type { ComponentRegistration } from '../../../registry/registry';
import { useAspectPreset } from '../../../styles';
import { DEFAULT_MEDIA_FRAME_STYLE } from './TextWithMediaScene';

const IMAGE_REVEAL_START_FRAME = 0;
const IMAGE_SCALE_IN_END_FRAME = 20;
const IMAGE_OPACITY_IN_END_FRAME = 30;
const FEATURE_REVEAL_START_FRAME = 20;

const FEATURE_STAGGER_FRAMES = 15;
const FEATURE_REVEAL_DURATION = 20;
const BASE_SCENE_FRAMES = Math.max(IMAGE_SCALE_IN_END_FRAME, IMAGE_OPACITY_IN_END_FRAME);

export function MediaWithFeatures(): React.ReactElement {
    const frame = useCurrentFrame();
    const preset = useAspectPreset();
    const mediaElement = useElement<MediaAssetProps>('mediaasset');
    const { props: mediaProps } = mediaElement;
    const featureItems = useArrayPatch('features');

    const mockupScale = interpolate(frame, [IMAGE_REVEAL_START_FRAME, IMAGE_SCALE_IN_END_FRAME], [0.7, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.back(1.1)),
    });
    const mockupOpacity = interpolate(frame, [IMAGE_REVEAL_START_FRAME, IMAGE_OPACITY_IN_END_FRAME], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    const mediaWidth = mediaProps.width ?? Math.round(preset.width * 0.7);
    const mediaHeight = mediaProps.height ?? Math.round(preset.height * 0.7);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <div
                    style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 52,
                    }}
                >
                    <div
                        style={{
                            position: 'relative',
                            transform: `scale(${mockupScale})`,
                            opacity: mockupOpacity,
                        }}
                    >
                        <div
                            style={{
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                flexShrink: 0,
                            }}
                        >
                            <MediaAsset
                                id="mediaasset"
                                src={mediaProps.src}
                                width={mediaWidth}
                                height={mediaHeight}
                                style={DEFAULT_MEDIA_FRAME_STYLE}
                            />
                        </div>

                        <div
                            style={{
                                position: 'absolute',
                                top: 100,
                                right: -132,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 40,
                            }}
                        >
                            {featureItems.map((item, index) => {
                                const { props: iconProps } = useElement<IconAssetProps>(`iconasset-features-${index}`);
                                const { props: textProps } = useElement<TextProps>(`text-features-${index}`);

                                const featureStartFrame = FEATURE_REVEAL_START_FRAME + index * FEATURE_STAGGER_FRAMES;
                                const featureEndFrame = featureStartFrame + FEATURE_REVEAL_DURATION;

                                const featureOpacity = interpolate(frame, [featureStartFrame, featureEndFrame], [0, 1], {
                                    extrapolateLeft: 'clamp',
                                    extrapolateRight: 'clamp',
                                });
                                const featureY = interpolate(frame, [featureStartFrame, featureEndFrame], [24, 0], {
                                    extrapolateLeft: 'clamp',
                                    extrapolateRight: 'clamp',
                                    easing: Easing.out(Easing.back(1.5)),
                                });

                                return (
                                    <ArrayItem
                                        key={`features-${index}`}
                                        index={index}
                                        source="features"
                                        removeControl="mid-left"
                                        addControl="mid-right"
                                        max={5}
                                        min={1}
                                        style={{
                                            opacity: featureOpacity,
                                            transform: `translateY(${featureY}px)`,
                                        }}
                                    >
                                        <CardAsset
                                            id={`container-features-${index}`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                minWidth: 360,
                                                backdropFilter: 'blur(30px)',
                                                WebkitBackdropFilter: 'blur(30px)',
                                            }}
                                        >
                                            <div style={{ background: 'rgba(0,102,204,0.1)', padding: 8, borderRadius: 16 }}>
                                                <IconAsset
                                                    id={`iconasset-features-${index}`}
                                                    icon={iconProps.icon}
                                                    style={{ color: '#000000' }}
                                                    size={64} />
                                            </div>
                                            <Text
                                                id={`text-features-${index}`}
                                                text={textProps.text}
                                                variant="subheading"
                                                style={{ color: '#000000' }} // as the card background is white
                                            />

                                        </CardAsset>
                                    </ArrayItem>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export const MediaWithFeaturesSchema = [
    {
        type: 'component',
        name: 'mediaasset',
        fields: [
            {
                name: 'src',
                type: 'string',
                datatype: 'media',
                map: 'props.src',
            }
        ],
    },
    {
        type: 'repeat',
        source: 'features',
        map: 'props.features',
        components: [
            {
                name: 'iconasset',
                fields: [
                    {
                        name: 'icon',
                        type: 'string',
                        datatype: 'icon',
                        map: 'item.icon',
                    },
                ],
            },
            {
                name: 'text',
                fields: [
                    {
                        name: 'text',
                        type: 'string',
                        datatype: 'text',
                        map: 'item.text',
                    },
                    {
                        "name": "variant",
                        "type": "enum",
                        "default": "subheading"
                    },
                ],
            },
            {
                name: 'container',
                fields: [],
            },
        ],
    },
];

export const MediaWithFeaturesDescriptor: ComponentRegistration = {
    name: 'MediaWithFeatures',
    type: 'scene',
    tags: ['Solution', 'Product Info', 'Features'],
    schema: MediaWithFeaturesSchema,
    llmSchema: [
        {
            name: 'src',
            type: 'string',
        },
        {
            name: 'features',
            type: 'array',
            items: {
                type: 'object',
                fields: [
                    {
                        name: 'icon',
                        type: 'string',
                    },
                    {
                        name: 'text',
                        type: 'string',
                    },
                ],
            },
        },
    ],
    description: 'Shows a large product image or video with stacked feature cards on the top-right. Each feature card contains an icon and a short label revealed in staggered animation',
    celExpression: `max(${BASE_SCENE_FRAMES}, ${FEATURE_REVEAL_START_FRAME} + max(0, size(props.features) - 1) * ${FEATURE_STAGGER_FRAMES} + ${FEATURE_REVEAL_DURATION})`,
};
