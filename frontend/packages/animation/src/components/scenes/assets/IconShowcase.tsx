import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { IconAsset } from '../../../core/assets/IconAsset';
import { useArrayPatch, usePatchedProps } from '../../../patches';
import type { ComponentRegistration } from '../../../registry/registry';
import { interpolateWithEasing } from '../../../styles';
import { ArrayItem } from '../../../core/assets/ArrayItem';
import { ANIMATION_PRESET_ENTRANCE_ANIMATIONS } from '../../../core/animation_preset/AnimationPreset';
import { AnimatedText, AnimatedTextDefaults } from '../text';

// Default constants
const DEFAULT_ENTRANCE_DURATION = 10;
const DEFAULT_ICON_STAGGER = 5;
const DEFAULT_ICON_ANIMATION_DURATION = 10;
const DEFAULT_TEXT_DELAY = 5;
const DEFAULT_VARIANT = 'headingLg' as const;
const DEFAULT_ICON_SIZE = 90;
const DEFAULT_ICON_GAP = 64;
const DEFAULT_TEXT_STAGGER_SPLIT_BY = 'line' as const;
const DEFAULT_TEXT_STAGGER_ANIMATION = ANIMATION_PRESET_ENTRANCE_ANIMATIONS[1];

export const IconShowcase: React.FC = () => {
    const textProps = usePatchedProps("animatedtext", AnimatedTextDefaults);
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
                    <AnimatedText
                        id={`animatedtext`}
                        text={textProps.text}
                        variant={DEFAULT_VARIANT}
                        splitBy={DEFAULT_TEXT_STAGGER_SPLIT_BY}
                        entranceAnimation={DEFAULT_TEXT_STAGGER_ANIMATION}
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
        name: 'animatedtext',
        fields: [
            {
                "name": "text",
                "type": "string",
                "datatype": "text",
                "map": "props.text"
            },
            {
                "name": "variant",
                "type": "enum",
                "map": "props.variant",
                "default": DEFAULT_VARIANT
            },
            {
                "name": "staggerDelay",
                "type": "number",
                "map": "props.staggerDelay",
                "default": AnimatedTextDefaults.staggerDelay
            },
            {
                "name": "entranceAnimation",
                "type": "enum",
                "map": "props.entranceAnimation",
                "default": DEFAULT_TEXT_STAGGER_ANIMATION
            },
            {
                "name": "duration",
                "type": "number",
                "map": "props.duration",
                "default": AnimatedTextDefaults.duration
            },
            {
                "name": "splitBy",
                "type": "enum",
                "map": "props.splitBy",
                "default": DEFAULT_TEXT_STAGGER_SPLIT_BY
            }
        ]
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
    tags: ['SOLUTIONS', 'SOCIAL_PROOF'],
    schema: IconShowcaseSchema,
    llmSchema: [
        {
            name: 'text',
            type: 'string',
            hint: 'caption to show below the icons'
        },
        {
            name: 'icons',
            type: 'array',
            items: {
                type: 'string'
            },
            range: 'min 4 brand icons',
        },
        {
            name: 'entranceAnimation',
            type: 'enum',
            required: false,
            default: DEFAULT_TEXT_STAGGER_ANIMATION,
        }
    ],
    description: 'Row of rotating brand icons + caption.',
    instructions: 'Use for integrations, tech stack, partners, brands. eg. icons={["shopify", "midjourney", "openai"]}, text="caption text".',
    celExpression: `${DEFAULT_ENTRANCE_DURATION} + max(0, size(props.icons) - 1) * ${DEFAULT_ICON_STAGGER} + ${DEFAULT_ICON_ANIMATION_DURATION} + min(1, segmentCount(props.animatedtext.text, props.animatedtext.splitBy)) * (${DEFAULT_TEXT_DELAY} + max(0, segmentCount(props.animatedtext.text, props.animatedtext.splitBy) - 1) * ${AnimatedTextDefaults.staggerDelay} + ${AnimatedTextDefaults.duration})`,
};
