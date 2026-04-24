import React from 'react';
import { useCurrentFrame } from 'remotion';
import { ArrayItem } from '../../../../core/assets/ArrayItem';
import {
    getNormalizedPill,
    IconTextPill,
    IconTextPillDefaults,
    PillPatchGroup,
} from '../../../../core/assets/IconTextPill';
import { useArrayPatch, usePatchedProps } from '../../../../patches';
import type { ComponentRegistration } from '../../../../registry/registry';
import { interpolateWithEasing, useAspectPreset } from '../../../../styles';
import type { TypographyVariant } from '../../../../tokens';
import { TextStagger, TextStaggerDefaults } from '../../text/TextStagger';
import type { Direction, EntranceAnimation } from '../../types';
import { ImagePeel, type ImageStackImageItem } from './ImagePeel';
import { ImageSlide } from './ImageSlide';

export const STACK_ANIMATIONS = ['Peel', 'SlideDown'] as const;
export type StackAnimation = typeof STACK_ANIMATIONS[number];

const DEFAULT_HERO_TEXT = {
    ...TextStaggerDefaults,
    id: 'textstagger',
    text: 'Launch every idea faster',
    variant: 'heading' as TypographyVariant,
    splitBy: 'line' as const,
    staggerDelay: 0,
    duration: 22,
    entranceAnimation: 'scaleIn' as EntranceAnimation,
};

const DEFAULT_STACK_ANIMATION: StackAnimation = 'SlideDown';
const DEFAULT_DIRECTION: Direction = 'right';
const DEFAULT_HOLD_DURATION = 10;
const DEFAULT_TRANSITION_DURATION = 10;
const DEFAULT_STACK_OFFSET = 18;
const STACK_START_FRAME = 10;
const STACK_ENTRANCE_DURATION = 10;
const DEFAULT_IMAGE_WIDTH = Math.round(1920 * 0.7);
const DEFAULT_IMAGE_HEIGHT = Math.round(1080 * 0.7);

const MultiImageStackDefaults = {
    id: 'scene',
    stackAnimation: DEFAULT_STACK_ANIMATION,
    direction: DEFAULT_DIRECTION,
    holdDuration: DEFAULT_HOLD_DURATION,
    transitionDuration: DEFAULT_TRANSITION_DURATION,
    stackOffset: DEFAULT_STACK_OFFSET,
};

function getPeelPillState(frame: number, count: number, holdDuration: number, transitionDuration: number) {
    const cycleDuration = holdDuration + transitionDuration;
    const currentIndex = Math.min(Math.floor(frame / cycleDuration), Math.max(count - 1, 0));
    const cycleFrame = frame % cycleDuration;
    const fadeProgress = interpolateWithEasing(
        cycleFrame,
        [holdDuration, holdDuration + transitionDuration],
        [0, 1],
        'ease-out',
    );

    return {
        currentIndex,
        nextIndex: Math.min(currentIndex + 1, Math.max(count - 1, 0)),
        fadeProgress,
    };
}

function getSlidePillState(frame: number, count: number, holdDuration: number, transitionDuration: number) {
    const cycleDuration = holdDuration + transitionDuration;
    const currentIndex = Math.min(Math.floor(frame / cycleDuration), Math.max(count - 1, 0));
    const cycleFrame = frame % cycleDuration;
    const fadeProgress = interpolateWithEasing(
        cycleFrame,
        [0, transitionDuration],
        [0, 1],
        'ease-out',
    );

    return {
        currentIndex,
        nextIndex: currentIndex,
        previousIndex: Math.max(currentIndex - 1, 0),
        fadeProgress,
    };
}

function getPillIndex(index: number, count: number): number {
    return Math.min(index, Math.max(count - 1, 0));
}

function renderPill(item: PillPatchGroup, index: number, opacity: number, translateY: number, zIndex: number) {
    const pillProps = getNormalizedPill(item);

    return (
        <ArrayItem
            key={`${pillProps.containerId}-${index}-${zIndex}`}
            index={index}
            source="pills"
            removeControl="mid-left"
            addControl="mid-right"
            style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                opacity,
                zIndex,
                transform: `translateX(-50%) translateY(${translateY}px)`,
            }}
        >
            <IconTextPill {...pillProps} />
        </ArrayItem>
    );
}

export function MultiImageStack(): React.ReactElement {
    const frame = useCurrentFrame();
    const preset = useAspectPreset();
    const textProps = usePatchedProps('textstagger', DEFAULT_HERO_TEXT);
    const sceneProps = usePatchedProps('scene', MultiImageStackDefaults);
    const images = useArrayPatch('images') as ImageStackImageItem[];
    const pills = useArrayPatch('pills') as PillPatchGroup[];

    const holdDuration = sceneProps.holdDuration ?? DEFAULT_HOLD_DURATION;
    const transitionDuration = sceneProps.transitionDuration ?? DEFAULT_TRANSITION_DURATION;
    const stackFrame = Math.max(frame - STACK_START_FRAME, 0);
    const animationFrame = Math.max(stackFrame - STACK_ENTRANCE_DURATION, 0);
    const stackAnimation = (sceneProps.stackAnimation ?? DEFAULT_STACK_ANIMATION) as StackAnimation;
    const stackOffset = sceneProps.stackOffset ?? DEFAULT_STACK_OFFSET;
    const imageWidth = Math.min(DEFAULT_IMAGE_WIDTH, preset.width * 0.8);
    const imageHeight = Math.min(DEFAULT_IMAGE_HEIGHT, preset.height * 0.8);
    const stackEntranceProgress = interpolateWithEasing(
        stackFrame,
        [0, STACK_ENTRANCE_DURATION],
        [0, 1],
        'ease-out',
    );
    const pillCount = pills.length;
    const imageCount = images.length;
    const syncCount = Math.max(imageCount, 1);

    const peelPillState = getPeelPillState(animationFrame, syncCount, holdDuration, transitionDuration);
    const slidePillState = getSlidePillState(animationFrame, syncCount, holdDuration, transitionDuration);
    const pillState = stackAnimation === 'SlideDown' ? slidePillState : peelPillState;
    const activePillIndex = getPillIndex(pillState.currentIndex, pillCount);
    const nextPillIndex = getPillIndex(pillState.nextIndex, pillCount);
    const previousPillIndex = getPillIndex(slidePillState.previousIndex, pillCount);
    const hasPills = pillCount > 0;

    return (
        <div
            style={{                
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 34,
                padding: `${Math.round(preset.height * 0.08)}px ${Math.round(preset.width * 0.08)}px`,
                boxSizing: 'border-box',
            }}
        >
            <div
                style={{
                    textAlign: 'center',
                    maxWidth: preset.width * 0.82,
                }}
            >
                <TextStagger
                    id="textstagger"
                    text={textProps.text}
                    splitBy="line"
                    staggerDelay={textProps.staggerDelay}
                    duration={textProps.duration}
                    entranceAnimation={textProps.entranceAnimation}
                    variant={textProps.variant}
                />
            </div>

            {hasPills && (
                <div
                    style={{
                        position: 'relative',
                        width: '100%',
                    }}
                >
                    {stackAnimation === 'SlideDown' && activePillIndex !== previousPillIndex && renderPill(
                        pills[previousPillIndex],
                        previousPillIndex,
                        1 - pillState.fadeProgress,
                        -10 - (pillState.fadeProgress * 18),
                        1,
                    )}

                    {stackAnimation === 'Peel' && activePillIndex !== nextPillIndex && renderPill(
                        pills[activePillIndex],
                        activePillIndex,
                        1 - pillState.fadeProgress,
                        -pillState.fadeProgress * 18,
                        1,
                    )}

                    {renderPill(
                        pills[stackAnimation === 'Peel' ? nextPillIndex : activePillIndex],
                        stackAnimation === 'Peel' ? nextPillIndex : activePillIndex,
                        stackAnimation === 'Peel' && activePillIndex !== nextPillIndex
                            ? pillState.fadeProgress
                            : pillState.fadeProgress,
                        stackAnimation === 'Peel' && activePillIndex !== nextPillIndex
                            ? 18 - (pillState.fadeProgress * 18)
                            : 18 - (pillState.fadeProgress * 18),
                        2,
                    )}
                </div>
            )}

            <div
                style={{
                    width: imageWidth + ((imageCount - 1) * stackOffset),
                    height: imageHeight + ((imageCount - 1) * stackOffset),
                    maxWidth: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: stackEntranceProgress,
                    transform: `scale(${0.94 + stackEntranceProgress * 0.06})`,
                }}
            >
                {stackAnimation === 'SlideDown' ? (
                    <ImageSlide
                        frame={animationFrame}
                        images={images}
                        holdDuration={holdDuration}
                        transitionDuration={transitionDuration}
                        stackOffset={stackOffset}
                        width={imageWidth}
                        height={imageHeight}
                    />
                ) : (
                    <ImagePeel
                        frame={animationFrame}
                        images={images}
                        holdDuration={holdDuration}
                        transitionDuration={transitionDuration}
                        stackOffset={stackOffset}
                        width={imageWidth}
                        height={imageHeight}
                        direction={sceneProps.direction ?? DEFAULT_DIRECTION}
                    />
                )}
            </div>
        </div>
    );
}

export const MultiImageStackSchemaFields = [
    {
        type: 'component',
        name: 'textstagger',
        fields: [
            {
                name: 'text',
                type: 'string',
                map: 'props.heroText',
            },
            {
                name: 'variant',
                type: 'string',
                subtype: 'enum',
                default: DEFAULT_HERO_TEXT.variant,
            },
            {
                name: 'entranceAnimation',
                type: 'string',
                subtype: 'enum',
                default: DEFAULT_HERO_TEXT.entranceAnimation,
            },
        ],
    },
    {
        type: 'repeat',
        source: 'pills',
        map: 'props.pills',
        components: [
            {
                name: 'iconasset',
                fields: [
                    {
                        name: 'icon',
                        type: 'string',
                        dataType: 'icon',
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
                        dataType: 'text',
                        map: 'item.text',
                    },
                    {
                        name: 'variant',
                        type: 'string',
                        subtype: 'enum',
                        default: IconTextPillDefaults.variant,
                    },
                ],
            },
            {
                name: 'container',
                fields: [
                    {
                        name: 'style',
                        type: 'object',
                        dataType: 'style',
                        default: {
                            backgroundColor: IconTextPillDefaults.backgroundColor,
                            borderRadius: IconTextPillDefaults.borderRadius,
                            borderWidth: IconTextPillDefaults.borderWidth,
                            borderColor: IconTextPillDefaults.borderColor,
                            padding: IconTextPillDefaults.padding,
                            gap: IconTextPillDefaults.gap,
                        },
                    },
                ],
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
                        dataType: 'media',
                    },
                    {
                        name: 'width',
                        type: 'number',
                        default: DEFAULT_IMAGE_WIDTH,
                    },
                    {
                        name: 'height',
                        type: 'number',
                        default: DEFAULT_IMAGE_HEIGHT,
                    },
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
                type: 'string',
                subtype: 'enum',
                default: DEFAULT_STACK_ANIMATION,
            },
            {
                name: 'direction',
                type: 'string',
                subtype: 'enum',
                default: DEFAULT_DIRECTION,
            },
            {
                name: 'holdDuration',
                type: 'number',
                default: DEFAULT_HOLD_DURATION,
            },
            {
                name: 'transitionDuration',
                type: 'number',
                default: DEFAULT_TRANSITION_DURATION,
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
            name: 'heroText',
            type: 'string',
        },
        {
            name: 'images',
            type: 'array',
            items: {
                type: 'string',
            },
        },
        {
            name: 'stackAnimation',
            type: 'string',
            subtype: 'enum',
        },
        {
            name: 'pills',
            type: 'array',
            optional: true,
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
    description: 'A hero text with a synchronized stack of images and optional icon-text pills. Use Peel to reveal images by peeling the stack, or SlideDown to place images onto the stack one by one. Hero text and images are required; pills are optional and should match the image order when provided.',
    celExpression: '45 + size(props.images) * (props.scene.holdDuration + props.scene.transitionDuration)',
};
