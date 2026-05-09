import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useArrayPatch, usePatchedProps } from '../../../patches';
import { LogoAsset } from './LogoAsset';
import type { ComponentRegistration } from '../../../registry/registry';
import { interpolateWithEasing } from '../../../styles';
import { TextStagger, TextStaggerDefaults } from '../text/TextStagger';
import { ArrayItem } from '../../../core/assets/ArrayItem';
import { ANIMATION_PRESET_ENTRANCE_ANIMATIONS } from '../../../core/animation_preset/AnimationPreset';

const DEFAULT_TEXT_ENTRANCE_DURATION = 5;
const DEFAULT_LOGO_STAGGER = 5;
const DEFAULT_LOGO_ANIMATION_DURATION = 12;
const DEFAULT_VARIANT = 'headingLg' as const;
const MAX_LOGOS_PER_ROW = 5;
const DEFAULT_TEXT_STAGGER_SPLIT_BY = 'line' as const;
const DEFAULT_TEXT_STAGGER_ANIMATION = ANIMATION_PRESET_ENTRANCE_ANIMATIONS[1];

const SLOT_LAYOUT_BY_COUNT: Record<number, { width: number; height: number; gap: number; padding: number }> = {
    1: { width: 320, height: 180, gap: 0, padding: 24 },
    2: { width: 280, height: 160, gap: 40, padding: 22 },
    3: { width: 240, height: 140, gap: 32, padding: 20 },
    4: { width: 220, height: 128, gap: 24, padding: 18 },
    5: { width: 196, height: 116, gap: 20, padding: 16 },
};

function getSlotLayout(count: number) {
    return SLOT_LAYOUT_BY_COUNT[Math.min(Math.max(count, 1), MAX_LOGOS_PER_ROW)] ?? SLOT_LAYOUT_BY_COUNT[5];
}

export const LogoShowcase: React.FC = () => {
    const textProps = usePatchedProps("textstagger", TextStaggerDefaults);
    const arrayProps = useArrayPatch("logos");

    const frame = useCurrentFrame();

    const logoCount = arrayProps.length;
    const itemsPerRow = Math.min(Math.max(logoCount, 1), MAX_LOGOS_PER_ROW);
    const slotLayout = getSlotLayout(itemsPerRow);
    const actualLogoGap = slotLayout.gap;

    const textDuration = DEFAULT_TEXT_ENTRANCE_DURATION;
    const logosStartFrame = textDuration;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
            }}
        >
            <TextStagger
                id='textstagger'
                text={textProps.text}
                variant={DEFAULT_VARIANT}
                splitBy={DEFAULT_TEXT_STAGGER_SPLIT_BY}
                entranceAnimation={DEFAULT_TEXT_STAGGER_ANIMATION}
                startAt={0}
                style={{ textAlign: 'center' }}
            />

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: actualLogoGap,
                    width: '100%',
                    maxWidth: slotLayout.width * itemsPerRow + actualLogoGap * Math.max(itemsPerRow - 1, 0),
                    marginTop: 56,
                    // overflow: 'hidden',
                }}
            >
                {arrayProps.map((item, index) => {
                    const [eid, patch] = Object.entries(item)[0]

                    const logoStartFrame = logosStartFrame + index * DEFAULT_LOGO_STAGGER;
                    const logoLocalFrame = frame - logoStartFrame;
                    const logoProgress = interpolateWithEasing(
                        logoLocalFrame,
                        [0, DEFAULT_LOGO_ANIMATION_DURATION],
                        [0, 1]
                    );

                    const opacity = logoProgress;
                    const translateY = interpolateWithEasing(logoProgress, [0, 1], [24, 0]);
                    const scale = interpolateWithEasing(logoProgress, [0, 1], [0.9, 1]);



                    return (
                        <ArrayItem
                            key={`icons-${index}`} // any unique id works
                            index={index}
                            source="logos"
                            removeControl="mid-left"
                            addControl="mid-right"
                        >
                            <div
                                key={`${index}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flex: `0 0 ${slotLayout.width}px`,
                                    width: slotLayout.width,
                                    height: slotLayout.height,
                                    padding: slotLayout.padding,
                                    boxSizing: 'border-box',
                                    opacity,
                                    transform: `translateY(${translateY}px) scale(${scale})`,
                                }}
                            >
                                <LogoAsset
                                    id={eid}
                                    src={patch.src}
                                    width={slotLayout.width - slotLayout.padding * 2}
                                    height={slotLayout.height - slotLayout.padding * 2}
                                    logoAnimation="none"
                                />
                            </div>
                        </ArrayItem>
                    );
                })}
            </div>
        </div>
    );
};

export const LogoShowcaseSchemaFields = [
    {
        type: "component",
        name: 'textstagger',
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
                "default": TextStaggerDefaults.staggerDelay
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
                "default": TextStaggerDefaults.duration
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
        source: "logos",
        map: "props.logos",
        components: [
            {
                name: "logoasset",
                fields: [
                    {
                        name: "src",
                        type: "string",
                        datatype: "media",
                        map: "item"
                    }
                ]
            }
        ]
    }
]

export const LogoShowcaseDescriptor: ComponentRegistration = {
    name: 'LogoShowcase',
    type: 'scene',
    tags: ['Solution', 'Product Info', 'Social proof'],
    schema: LogoShowcaseSchemaFields,
    llmSchema: [
        {
            name: 'text',
            type: 'string',
            "items": {
                "type": "string"
            },
            hint: 'caption to show below the icons'
        },
        {
            name: 'logos',
            type: 'array',

        },
        {
            name: 'entranceAnimation',
            type: 'enum',
            required: false,
            default: DEFAULT_TEXT_STAGGER_ANIMATION,
        }
    ],
    description: 'Row of logos + caption. Use for integrations, tech stack, partners, brands. eg. logos=["url1", "url2"], text="caption text".',
    celExpression: `10 + max(min(1, segmentCount(props.textstagger.text, props.textstagger.splitBy)) * (max(0, segmentCount(props.textstagger.text, props.textstagger.splitBy) - 1) * ${TextStaggerDefaults.staggerDelay} + ${TextStaggerDefaults.duration}), ${DEFAULT_TEXT_ENTRANCE_DURATION} + max(0, size(props.logos) - 1) * ${DEFAULT_LOGO_STAGGER} + ${DEFAULT_LOGO_ANIMATION_DURATION})`,
};
