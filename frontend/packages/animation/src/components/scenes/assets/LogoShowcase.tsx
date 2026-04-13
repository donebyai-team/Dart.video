import React from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { useArrayPatch, usePatchedProps, useStyleOverride } from '../../../patches';
import { TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens/semantic';
import { LogoAsset } from './LogoAsset';
import type { ComponentRegistration } from '../../../registry/registry';
import { interpolateWithEasing } from '../../../styles';
import { TextStagger, TextStaggerProps, TextStaggerSchemaFields } from '../text/TextStagger';
import { ENTRANCE_ANIMATIONS } from '../types';
import { ArrayItem } from '../../../core/assets/ArrayItem';

const DEFAULT_TEXT_ENTRANCE_DURATION = 5;
const DEFAULT_LOGO_STAGGER = 5;
const DEFAULT_LOGO_ANIMATION_DURATION = 12;
const DEFAULT_VARIANT = 'heading' as const;
const DEFAULT_LOGO_GAP = 48;
const MAX_LOGOS_PER_ROW = 5;
const DEFAULT_TEXT_STAGGER_SPLIT_BY = 'line' as const;
const DEFAULT_TEXT_STAGGER_ANIMATION = ENTRANCE_ANIMATIONS[1];

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

export const LogoShowcaseSchema = z.object({
    id: z.string().optional(),
    images: z.array(z.string()).default([]),
    text: z.string().default(''),
});

export type LogoShowcaseProps = z.input<typeof LogoShowcaseSchema>;

export const LogoShowcase: React.FC = () => {
    const parentProps = usePatchedProps("scene", {});
    const textProps = usePatchedProps("textstagger", {}) as TextStaggerProps;
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
                            key={eid}
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
        fields: TextStaggerSchemaFields
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
            }
        },
        {
            name: 'logos',
            type: 'array',

        },
    ],
    description: 'Row of logos + caption. Use for integrations, tech stack, partners, brands. eg. logos=["url1", "url2"], text="caption text".',
    celExpression: 'ceil((size(props.textstagger.text.split("\\n")) - 1) * 10 + 20 + (size(props.logos) - 1) * 5 + 12)',
};

