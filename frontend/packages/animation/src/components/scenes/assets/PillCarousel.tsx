import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { ArrayItem } from '../../../core/assets/ArrayItem';
import { useArrayPatch, usePatchedProps } from '../../../patches';
import type { ComponentRegistration } from '../../../registry/registry';
import { useAspectPreset } from '../../../styles';
import { useStyleContext } from '../../../styles/StyleContext';
import { useTheme } from '../../../theme';
import { TextStagger, TextStaggerDefaults } from '../text/TextStagger';
import { getIconTextPillMetrics, getNormalizedPill, IconTextPill, IconTextPillDefaults, PillPatchGroup } from '../../../core/assets/IconTextPill';
import { TypographyVariant } from '../../../tokens';
import { resolveTypography } from '../../../tokens/resolveTypography';
import { AnimationPresetName } from '../../../core/animation_preset/AnimationPreset';

const HERO_TEXT_DEFAULTS = {
    ...TextStaggerDefaults,
    id: 'textstagger',
    text: 'One product. Every use case.',
    variant: 'headingLg' as TypographyVariant,
    splitBy: 'line' as const,
    staggerDelay: 0,
    entranceAnimation: 'scaleIn' as AnimationPresetName,
};

const DEFAULT_ENTRANCE_FRAMES = 18;
const DEFAULT_HEADLINE_LIFT_FRAMES = 12;
const DEFAULT_HOLD_FRAMES = 10;
const DEFAULT_MOVE_FRAMES = 15;
const DEFAULT_CAROUSEL_TOP_MARGIN = 34;
const DEFAULT_CAROUSEL_HEIGHT = 140;
const DEFAULT_CAROUSEL_WIDTH_PERCENT = 80;
const DEFAULT_HEADLINE_LIFT = 52;
const DEFAULT_PILL_GAP = 36;
const CAROUSEL_START_DELAY_FRAMES = 2;
const BASE_SCENE_FRAMES = HERO_TEXT_DEFAULTS.duration + CAROUSEL_START_DELAY_FRAMES + DEFAULT_ENTRANCE_FRAMES;
const PER_PILL_SCENE_FRAMES = DEFAULT_HOLD_FRAMES + DEFAULT_MOVE_FRAMES;

function buildPillCenters(widths: number[], gap: number): number[] {
    if (widths.length === 0) {
        return [];
    }

    const centers = widths.map(() => 0);

    for (let index = 1; index < widths.length; index += 1) {
        centers[index] = centers[index - 1] + (widths[index - 1] / 2) + gap + (widths[index] / 2);
    }

    return centers;
}

function getCarouselProgressPosition(progress: number, centers: number[]): number {
    if (centers.length <= 1) {
        return 0;
    }

    const clampedProgress = Math.min(Math.max(progress, 0), centers.length - 1);
    const baseIndex = Math.floor(clampedProgress);
    const nextIndex = Math.min(baseIndex + 1, centers.length - 1);
    const transitionProgress = clampedProgress - baseIndex;
    const start = centers[baseIndex] ?? 0;
    const end = centers[nextIndex] ?? start;

    return start + ((end - start) * transitionProgress);
}

export function PillCarousel(): React.ReactElement {
    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();

    const textProps = usePatchedProps('textstagger', HERO_TEXT_DEFAULTS);
    const pillItems = useArrayPatch('pills');

    const pillCount = pillItems.length;
    const heroRevealDuration = textProps.duration;
    const carouselEntranceStartFrame = heroRevealDuration + CAROUSEL_START_DELAY_FRAMES;
    const carouselEntranceFrame = Math.max(frame - carouselEntranceStartFrame, 0);
    const carouselEntranceProgress = interpolate(
        carouselEntranceFrame,
        [0, DEFAULT_ENTRANCE_FRAMES],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
    const headlineLiftStartFrame = carouselEntranceStartFrame;
    const headlineLiftFrame = Math.max(frame - headlineLiftStartFrame, 0);
    const headlineLiftProgress = interpolate(
        headlineLiftFrame,
        [0, DEFAULT_HEADLINE_LIFT_FRAMES],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
    const carouselFrame = Math.max(frame - (carouselEntranceStartFrame + DEFAULT_ENTRANCE_FRAMES), 0);
    const cycleDuration = DEFAULT_HOLD_FRAMES + DEFAULT_MOVE_FRAMES;
    const cycleIndex = Math.floor(carouselFrame / cycleDuration);
    const cycleFrame = carouselFrame % cycleDuration;
    const moveProgress = interpolate(
        cycleFrame,
        [DEFAULT_HOLD_FRAMES, cycleDuration],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
    const progress = cycleIndex + moveProgress;

    const headlineTranslateY = interpolate(
        headlineLiftProgress,
        [0, 1],
        [0, -DEFAULT_HEADLINE_LIFT],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
    const carouselTranslateX = interpolate(
        carouselEntranceProgress,
        [0, 1],
        [220, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
    const carouselTranslateY = interpolate(
        carouselEntranceProgress,
        [0, 1],
        [20, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
    const carouselOpacity = interpolate(
        carouselEntranceProgress,
        [0, 1],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
    const normalizedPills = pillItems.map((item) => getNormalizedPill(item as PillPatchGroup));
    const pillWidths = normalizedPills.map((pillProps) => {
        const typographyStyle = resolveTypography(pillProps.variant, styleConfig, theme, preset);

        return getIconTextPillMetrics(pillProps, typographyStyle).width;
    });
    const pillCenters = buildPillCenters(pillWidths, DEFAULT_PILL_GAP);
    const progressPosition = getCarouselProgressPosition(progress, pillCenters);
    const carouselViewportWidth = preset.width * (DEFAULT_CAROUSEL_WIDTH_PERCENT / 100);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div
                style={{
                    transform: `translateY(${headlineTranslateY}px)`,
                }}
            >
                <TextStagger
                    id="textstagger"
                    text={textProps.text}
                    splitBy="line"
                    staggerDelay={0}
                    duration={textProps.duration}
                    entranceAnimation={textProps.entranceAnimation}
                    variant={textProps.variant}
                />
            </div>

            {pillCount > 0 && (
                <div
                    style={{
                        position: 'relative',
                        width: `${DEFAULT_CAROUSEL_WIDTH_PERCENT}%`,
                        alignSelf: 'center',
                        height: DEFAULT_CAROUSEL_HEIGHT,
                        marginTop: DEFAULT_CAROUSEL_TOP_MARGIN,
                        overflow: 'hidden',
                        transform: `translate(${carouselTranslateX}px, ${carouselTranslateY}px)`,
                        opacity: carouselOpacity,
                    }}
                >
                    {normalizedPills.map((pillProps, index) => {
                        const distanceFromCenter = (pillCenters[index] ?? 0) - progressPosition;
                        const pillWidth = pillWidths[index] ?? 0;
                        const normalizedDistance = Math.abs(distanceFromCenter) / Math.max(pillWidth + DEFAULT_PILL_GAP, 1);
                        const visibilityThreshold = (carouselViewportWidth / 2) + pillWidth;
                        const isVisible = Math.abs(distanceFromCenter) <= visibilityThreshold;

                        if (!isVisible) {
                            return null;
                        }

                        const distance = normalizedDistance;
                        const translateX = distanceFromCenter;
                        const scale = interpolate(
                            distance,
                            [0, 1, 2],
                            [1, 0.9, 0.82],
                            { extrapolateRight: 'clamp' },
                        );
                        const opacity = interpolate(
                            distance,
                            [0, 1, 2],
                            [1, 0.32, 0.14],
                            { extrapolateRight: 'clamp' },
                        );
                        const zIndex = 100 - Math.round(distance * 10);

                        return (
                            <ArrayItem
                                key={`${pillProps.containerId}-${index}`}
                                index={index}
                                source="pills"
                                removeControl="mid-left"
                                addControl="mid-right"
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: `translate(calc(-50% + ${translateX}px), -50%) scale(${scale})`,
                                    opacity,
                                    zIndex,
                                }}
                            >
                                <IconTextPill
                                    {...pillProps}
                                />
                            </ArrayItem>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export const HeroPillCarouselSchemaFields = [
    {
        type: 'component',
        name: 'textstagger',
        fields: [
            {
                name: 'text',
                type: 'string',
                datatype: 'text',
                map: 'props.text',
            },
            {
                "name": "variant",
                "type": "enum",
                "default": HERO_TEXT_DEFAULTS.variant
            },
            {
                "name": "entranceAnimation",
                "type": "enum",
                "map": "props.entranceAnimation",
                "default": HERO_TEXT_DEFAULTS.entranceAnimation
            },
        ],
    },
    {
        type: 'repeat',
        source: 'pills',
        map: 'props.pills',
        components: [
            {
                name: "iconasset",
                fields: [
                    {
                        name: "icon",
                        type: "string",
                        datatype: "icon",
                        map: "item.icon"
                    }
                ]
            },
            {
                name: "text",
                fields: [
                    {
                        name: "text",
                        type: "string",
                        datatype: "text",
                        map: "item.text"
                    },
                    {
                        name: 'variant',
                        type: 'enum',
                        default: IconTextPillDefaults.variant,
                    }
                ]
            },
            {
                name: "container",
                fields: [
                    {
                        name: 'style',
                        type: 'object',
                        datatype: 'style',
                        default: {
                            backgroundColor: IconTextPillDefaults.backgroundColor,
                            borderRadius: IconTextPillDefaults.borderRadius,
                            borderWidth: IconTextPillDefaults.borderWidth,
                            borderColor: IconTextPillDefaults.borderColor,
                            padding: IconTextPillDefaults.padding,
                            gap: IconTextPillDefaults.gap,
                        },
                    }
                ]
            },
        ],
    },
];

export const PillCarouselDescriptor: ComponentRegistration = {
    name: 'PillCarousel',
    type: 'scene',
    tags: ['Solution', 'Product Info', 'Use Cases'],
    schema: HeroPillCarouselSchemaFields,
    llmSchema: [
        {
            name: 'text',
            type: 'string',
        },
        {
            name: 'pills',
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
        {
            name: 'entranceAnimation',
            type: 'enum',
            required: false,
            default: HERO_TEXT_DEFAULTS.entranceAnimation
        }
    ],
    description: 'A headline with a carousel of items below, each showing text and an icon (choose an icon name that represents the text) as a pill. Use for features, industries, use cases, capabilities, or categories. ~25 frames per item; minimum 3 items.',
    celExpression: `${BASE_SCENE_FRAMES} + max(0, size(props.pills) - 1) * ${PER_PILL_SCENE_FRAMES}`,
};
