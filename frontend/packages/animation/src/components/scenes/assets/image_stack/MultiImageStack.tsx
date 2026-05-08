import React from 'react';
import { useCurrentFrame } from 'remotion';
import { ArrayItem } from '../../../../core/assets/ArrayItem';
import { DEFAULT_SPEED_PERCENTAGE, getSpeed, MIN_SPEED_PERCENTAGE, scaleTiming } from '../../../../speed/timings';
import { useArrayPatch, usePatchedProps } from '../../../../patches';
import type { ComponentRegistration } from '../../../../registry/registry';
import { interpolateWithEasing, useAspectPreset } from '../../../../styles';
import type { TextEntrancePresetName } from '../../../../core/assets';
import type { TypographyVariant } from '../../../../tokens';
import { TextWithWordCycle, TextWithWordCycleDefaults } from '../../text/TextWithWordCycle';
import type { Direction } from '../../types';
import { ImagePeel } from './ImagePeel';
import { ImageSlide } from './ImageSlide';
import type { ImageStackItem } from './shared';

export const STACK_ANIMATIONS = ['Peel', 'SlideDown'] as const;
export type StackAnimation = typeof STACK_ANIMATIONS[number];

const DEFAULT_HERO_TEXT = {
    ...TextWithWordCycleDefaults,
    variant: 'display' as TypographyVariant,
    entranceAnimation: 'scaleIn' as TextEntrancePresetName,
    highlightStyle: 'background' as const,
    textCycleTransition: 'slideUp' as const,
};

const DEFAULT_STACK_ANIMATION: StackAnimation = 'Peel';
const DEFAULT_DIRECTION: Direction = 'right';

const BASE_HOLD_DURATION = 28;
const BASE_TRANSITION_DURATION = 14;

const DEFAULT_STACK_OFFSET = 30;

const STACK_START_FRAME = 10;
const STACK_ENTRANCE_DURATION = 10;

const BASE_SCENE_FRAMES = STACK_START_FRAME + STACK_ENTRANCE_DURATION + 25;
const PER_IMAGE_BASE_FRAMES = BASE_HOLD_DURATION + BASE_TRANSITION_DURATION;

const IMAGE_BOTTOM_OVERFLOW = 80;
const IMAGE_WIDTH_RATIO = 0.7;
const CONTENT_FRAME_HEIGHT_RATIO = 0.82;
const CONTENT_TOP_PADDING = 50;

const MultiImageStackDefaults = {
    stackAnimation: DEFAULT_STACK_ANIMATION,
    direction: DEFAULT_DIRECTION,
    speed: DEFAULT_SPEED_PERCENTAGE,
    stackOffset: DEFAULT_STACK_OFFSET,
};

function getCycleState(frame: number, count: number, holdDuration: number, transitionDuration: number) {
    const cycleDuration = holdDuration + transitionDuration;
    const maxIndex = Math.max(count - 1, 0);
    const rawIndex = Math.floor(frame / cycleDuration);

    if (rawIndex >= maxIndex) {
        return maxIndex;
    }

    return Math.max(rawIndex, 0);
}

function getSyncedCyclingWords(words: string[], itemCount: number): string[] {
    if (itemCount <= 0) {
        return words;
    }

    const fallbackWord = words[words.length - 1] ?? DEFAULT_HERO_TEXT.cyclingWords[0];
    return Array.from({ length: itemCount }, (_, index) => words[index] ?? fallbackWord);
}

export function MultiImageStack(): React.ReactElement {
    const frame = useCurrentFrame();
    const preset = useAspectPreset();
    const textProps = usePatchedProps('textwithwordcycle', DEFAULT_HERO_TEXT);
    const sceneProps = usePatchedProps('scene', MultiImageStackDefaults);
    const items = useArrayPatch('images') as ImageStackItem[];

    const speed = getSpeed(sceneProps.speed);
    const holdDuration = scaleTiming(BASE_HOLD_DURATION, speed);
    const transitionDuration = scaleTiming(BASE_TRANSITION_DURATION, speed);
    const stackFrame = Math.max(frame - STACK_START_FRAME, 0);
    const animationFrame = Math.max(stackFrame - STACK_ENTRANCE_DURATION, 0);
    const stackAnimation = (sceneProps.stackAnimation ?? DEFAULT_STACK_ANIMATION) as StackAnimation;
    const stackOffset = sceneProps.stackOffset ?? DEFAULT_STACK_OFFSET;
    const stackEntranceProgress = interpolateWithEasing(
        stackFrame,
        [0, STACK_ENTRANCE_DURATION],
        [0, 1],
        'ease-out',
    );
    const itemCount = items.length;
    const contentFrameHeight = Math.round(preset.height * CONTENT_FRAME_HEIGHT_RATIO);

    const imageWidth = Math.round(preset.width * IMAGE_WIDTH_RATIO);
    const imageHeight = Math.round(preset.height * 0.72);

    const baseCyclingWords = textProps.cyclingWords?.length ? textProps.cyclingWords : DEFAULT_HERO_TEXT.cyclingWords;
    const cyclingWords = getSyncedCyclingWords(baseCyclingWords, itemCount || baseCyclingWords.length);
    const cycleCount = Math.max(itemCount, cyclingWords.length, 1);
    const activeIndex = Math.min(
        getCycleState(animationFrame, cycleCount, holdDuration, transitionDuration),
        Math.max(itemCount - 1, 0),
    );

    return (
        <div
            style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
            }}
        >
            <div
                style={{
                    width: '100%',
                    minHeight: contentFrameHeight,
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    paddingTop: CONTENT_TOP_PADDING,
                }}
            >
                <div
                    style={{
                        textAlign: 'center',
                        width: '100%',
                    }}
                >
                    <TextWithWordCycle
                        id="textwithwordcycle"
                        startAt={STACK_START_FRAME + STACK_ENTRANCE_DURATION}
                        text={textProps.text}
                        cyclingWords={cyclingWords}
                        holdDuration={holdDuration}
                        transitionDuration={transitionDuration}
                        entranceAnimation={textProps.entranceAnimation}
                        variant={textProps.variant}
                        highlightStyle={textProps.highlightStyle}
                        highlightColor={textProps.highlightColor}
                        textCycleTransition={textProps.textCycleTransition}
                        style={textProps.style}
                        className={textProps.className}
                    />
                </div>

                {itemCount > 0 && (
                    <div
                        style={{
                            width: imageWidth + (Math.max(itemCount - 1, 0) * stackOffset),
                            height: imageHeight + (Math.max(itemCount - 1, 0) * stackOffset),
                            marginBottom: -IMAGE_BOTTOM_OVERFLOW,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: stackEntranceProgress,
                            transform: `translateY(${IMAGE_BOTTOM_OVERFLOW}px) scale(${0.96 + stackEntranceProgress * 0.04})`,
                        }}
                    >
                        <ArrayItem
                            index={Math.min(activeIndex, Math.max(itemCount - 1, 0))}
                            source="images"
                            removeControl="mid-left"
                            addControl="mid-right"
                        >
                            {stackAnimation === 'SlideDown' ? (
                                <ImageSlide
                                    frame={animationFrame}
                                    items={items}
                                    holdDuration={holdDuration}
                                    transitionDuration={transitionDuration}
                                    stackOffset={stackOffset}
                                    width={imageWidth}
                                    height={imageHeight}
                                />
                            ) : (
                                <ImagePeel
                                    frame={animationFrame}
                                    items={items}
                                    holdDuration={holdDuration}
                                    transitionDuration={transitionDuration}
                                    stackOffset={stackOffset}
                                    width={imageWidth}
                                    height={imageHeight}
                                    direction={sceneProps.direction ?? DEFAULT_DIRECTION}
                                />
                            )}
                        </ArrayItem>
                    </div>
                )}
            </div>
        </div>
    );
}

export const MultiImageStackSchemaFields = [
    {
        type: 'component',
        name: 'textwithwordcycle',
        fields: [
            {
                name: 'text',
                type: 'string',
                datatype: 'text',
                map: 'props.headline',
            },
            {
                name: 'cyclingWords',
                type: 'array',
                datatype: 'text',
                map: 'props.cyclingWords',
            },
            {
                name: 'variant',
                type: 'enum',
                default: DEFAULT_HERO_TEXT.variant,
            },
            {
                name: 'entranceAnimation',
                type: 'enum',
                map: 'props.entranceAnimation',
                default: DEFAULT_HERO_TEXT.entranceAnimation,
            },
            {
                name: 'textCycleTransition',
                type: 'enum',
                default: DEFAULT_HERO_TEXT.textCycleTransition,
            },
            {
                name: 'highlightStyle',
                type: 'enum',
                default: DEFAULT_HERO_TEXT.highlightStyle,
            },
        ],
    },
    {
        type: 'repeat',
        source: 'images',
        map: 'props.images',
        components: [
            {
                name: 'imageasset',
                fields: [
                    {
                        name: 'image',
                        type: 'string',
                        map: 'item',
                        datatype: 'media',
                    }
                ],
            },
        ],
    },
    {
        type: 'component',
        name: 'scene',
        fields: [
            {
                name: 'stackAnimation',
                type: 'enum',
                default: DEFAULT_STACK_ANIMATION,
            },
            {
                name: 'direction',
                type: 'enum',
                default: DEFAULT_DIRECTION,
            },
            {
                name: 'speed',
                type: 'number',
                default: DEFAULT_SPEED_PERCENTAGE,
            },
            {
                name: 'stackOffset',
                type: 'number',
                default: DEFAULT_STACK_OFFSET,
            },
        ],
    },
];

export const MultiImageStackDescriptor: ComponentRegistration = {
    name: 'MultiImageStack',
    type: 'scene',
    tags: ['Solution', 'Product Info', 'Use Cases'],
    schema: MultiImageStackSchemaFields,
    llmSchema: [
        {
            name: 'headline',
            type: 'string',
        },
        {
            name: 'cyclingWords',
            type: 'array',
            hint: 'The features to highlight per image',
            items: {
                type: 'string',
            },
        },
        {
            name: 'images',
            type: 'array',
            hint: 'The images of each feature under a usecase',
            items: {
                type: 'string',
            },
        },
    ],
    description: `
    A centered TextWithWordCycle headline above a stacked images revealing one by one with word cycle. 
    use it to show multi features of a usecase with product images
    Takes around 170 frames for 3 images.`,
    celExpression: `((${BASE_SCENE_FRAMES} + size(props.images) * ${PER_IMAGE_BASE_FRAMES}) * ${DEFAULT_SPEED_PERCENTAGE}) / max(props.scene.speed, ${MIN_SPEED_PERCENTAGE})`,
};
