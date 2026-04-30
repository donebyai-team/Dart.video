import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import z from 'zod';
import { IconAsset } from '../../../core/assets/IconAsset';
import { TextStagger, TextStaggerDefaults, TextStaggerProps, TextStaggerSchemaFields } from '../text/TextStagger';
import { useArrayPatch, usePatchedProps } from '../../../patches';
import type { ComponentRegistration } from '../../../registry/registry';
import { ENTRANCE_ANIMATIONS, SPLIT_BY_MODES } from '../types';
import { interpolateWithEasing } from '../../../styles';
import { ArrayItem } from '../../../core/assets/ArrayItem';

// Default constants
const DEFAULT_ENTRANCE_DURATION = 10;
const DEFAULT_ICON_STAGGER = 5;
const DEFAULT_ICON_ANIMATION_DURATION = 10;
const DEFAULT_TEXT_DELAY = 5;
const DEFAULT_VARIANT = 'heading' as const;
const DEFAULT_ICON_SIZE = 90;
const DEFAULT_ICON_GAP = 64;

export const IconShowcase: React.FC = () => {
    const textProps = usePatchedProps("textstagger", TextStaggerDefaults);
    const arrayProps = useArrayPatch("icons");


    const frame = useCurrentFrame();

    // Animation timing
    const localFrame = frame;
    const entranceDuration = DEFAULT_ENTRANCE_DURATION;
    const iconStagger = DEFAULT_ICON_STAGGER;
    const iconAnimDuration = DEFAULT_ICON_ANIMATION_DURATION;

    // Calculate when all icons are visible
    const allIconsVisibleFrame = entranceDuration + (arrayProps.length - 1) * iconStagger + iconAnimDuration;
    const textStartFrame = allIconsVisibleFrame + DEFAULT_TEXT_DELAY;

    // Container entrance animation (fade in)
    const containerOpacity = interpolateWithEasing(
        localFrame,
        [0, entranceDuration],
        [0, 1],
    );

    // Vertical shift when text appears (move icons up to center everything)
    const hasText = textProps.text && textProps.text.trim().length > 0;
    const verticalShift = hasText
        ? interpolate(
            localFrame,
            [textStartFrame, textStartFrame + 15],
            [0, -40],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        )
        : 0;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                opacity: containerOpacity,
            }}
        >
            {/* Icons container */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: DEFAULT_ICON_GAP,
                    flexWrap: 'wrap',
                    maxWidth: '80%',
                    transform: `translateY(${verticalShift}px)`,
                }}
            >
                {arrayProps.map((item, index) => {
                    const [eid, patch] = Object.entries(item)[0]
                    const iconStartFrame = entranceDuration + index * iconStagger;
                    const iconLocalFrame = localFrame - iconStartFrame;

                    // Icon entrance: scale + rotate
                    const iconProgress = interpolate(
                        iconLocalFrame,
                        [0, iconAnimDuration],
                        [0, 1],
                        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                    );

                    const scale = interpolate(iconProgress, [0, 1], [0, 1]);
                    const rotation = interpolate(iconProgress, [0, 1], [0, 360]);
                    const opacity = interpolate(iconProgress, [0, 0.3], [0, 1], {
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp',
                    });

                    return (
                        <ArrayItem
                            key={`icons-${index}`} // any unique id works
                            index={index}
                            source="icons"
                            removeControl="mid-top"
                            addControl="mid-bottom"
                        >
                            <div
                                style={{
                                    transform: `scale(${scale}) rotate(${rotation}deg)`,
                                    opacity,
                                }}
                            >
                                <IconAsset id={eid} icon={patch.icon} size={patch.size} />
                            </div>
                        </ArrayItem>
                    );
                })}
            </div>

            {/* Text below icons */}
            {hasText && localFrame >= textStartFrame && (
                <div
                    style={{
                        marginTop: 60,
                    }}
                >
                    <TextStagger
                        id={`textstagger`}
                        text={textProps.text}
                        variant={DEFAULT_VARIANT}
                        splitBy={SPLIT_BY_MODES[1]}
                        entranceAnimation={ENTRANCE_ANIMATIONS[3]}
                        startAt={textStartFrame}
                    />
                </div>
            )}
        </div>
    );
};


// ============================================================================
// Registry Descriptor
// ============================================================================

export const IconShowcaseSchema = [
    {
        type: "component",
        name: 'textstagger',
        fields: TextStaggerSchemaFields
    },
    {
        type: "repeat",
        source: "icons",
        map: "props.icons",
        components: [
            {
                name: "iconasset",
                fields: [
                    {
                        name: "icon",
                        type: "string",
                        datatype: "icon",
                        map: "item"
                    },
                    {
                        name: "size",
                        type: "number",
                        default: DEFAULT_ICON_SIZE
                    }
                ]
            }
        ]
    }
]

export const IconShowcaseDescriptor: ComponentRegistration = {
    name: 'IconShowcase',
    type: 'scene',
    tags: ['Solution', 'Product Info', 'Social proof'],
    schema: IconShowcaseSchema,
    llmSchema: [
        {
            name: 'text',
            type: 'string',
        },
        {
            name: 'icons',
            type: 'array',
            items: {
                type: 'string'
            }
        },
        {
            name: 'entranceAnimation',
            type: 'enum',
            required: false,
            default: TextStaggerDefaults.entranceAnimation,
        }
    ],
    description: 'Row of icons + caption. Use for integrations, tech stack, partners, brands. eg. icons={["shopify", "midjourney", "openai"]}, text="caption text".',
    celExpression: '55 + max(0, size(props.icons) - 1) * 5 + max(0, segmentCount(props.textstagger.text, "word") - 1) * 5',
};


