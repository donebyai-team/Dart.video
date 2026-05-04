import React, { useEffect, useMemo, useState } from 'react';
import { useCurrentFrame } from 'remotion';
import { ArrayItem } from '../../../core/assets/ArrayItem';
import { ImageAsset } from '../../../core/assets/ImageAsset';
import { useArrayPatch, useElement } from '../../../patches';
import type { ComponentRegistration } from '../../../registry/registry';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { TextStagger, type TextStaggerProps, TextStaggerSchemaFields } from '../text/TextStagger';
import { DEFAULT_SPEED_PERCENTAGE, getSpeed, MIN_SPEED_PERCENTAGE, scaleTiming } from '../../../speed/timings';

const DEFAULT_CARD_WIDTH = 420;
const DEFAULT_CARD_HEIGHT = 236;
const BASE_IMAGE_STAGGER = 7;
const BASE_IMAGE_DURATION = 13;
const BASE_HOLD_DURATION = 10;
const BASE_OUTRO_DURATION = 10;
const BASE_TEXT_DELAY = 5;
const COLLAGE_VIEW_PADDING = 40;
const MAX_SCATTER_WIDTH = 0.3;
const MAX_SCATTER_HEIGHT = 0.34;
const CEL_PER_IMAGE_FRAMES = BASE_IMAGE_STAGGER;
const CEL_BASE_FRAMES = BASE_TEXT_DELAY + BASE_IMAGE_DURATION + BASE_HOLD_DURATION + BASE_OUTRO_DURATION;

const ProblemCollageTextDefaults: TextStaggerProps = {
    id: 'textstagger',
    startAt: 0,
    text: 'Dashboards, logs, and alerts did not adapt.',
    variant: 'heading' as const,
    staggerDelay: 4,
    entranceAnimation: 'scaleIn' as const,
    duration: 12,
    splitBy: 'word' as const,
    className: undefined as string | undefined,
};

const ProblemCollageSceneDefaults = {
    id: 'problemcollage',
    speed: DEFAULT_SPEED_PERCENTAGE,
};

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function fitWithin(sourceWidth: number, sourceHeight: number, maxWidth: number, maxHeight: number) {
    const width = Math.max(1, sourceWidth);
    const height = Math.max(1, sourceHeight);
    const scale = Math.min(maxWidth / width, maxHeight / height, 1);

    return {
        width: Math.round(width * scale),
        height: Math.round(height * scale),
    };
}

function useImageDimensions(src?: string) {
    const [dimensions, setDimensions] = useState({
        width: DEFAULT_CARD_WIDTH,
        height: DEFAULT_CARD_HEIGHT,
    });

    useEffect(() => {
        if (!src) {
            return;
        }

        let cancelled = false;
        const image = new Image();

        image.onload = () => {
            if (cancelled) {
                return;
            }

            setDimensions({
                width: image.naturalWidth || DEFAULT_CARD_WIDTH,
                height: image.naturalHeight || DEFAULT_CARD_HEIGHT,
            });
        };

        image.src = src;

        return () => {
            cancelled = true;
        };
    }, [src]);

    return dimensions;
}

type ImagePatch = {
    image?: string;
    width?: number;
    height?: number;
    dragX?: number;
    dragY?: number;
    style?: React.CSSProperties;
    className?: string;
};

type ResolvedImageItem = {
    id: string;
};

type CollageSlot = {
    x: number;
    y: number;
    zIndex: number;
};

function buildCollageSlots(count: number): CollageSlot[] {
    const ringAnchors = [
        [
            { x: 0.12, y: 0.12 },
            { x: 0.88, y: 0.12 },
            { x: 0.12, y: 0.88 },
            { x: 0.88, y: 0.88 },
            { x: 0.5, y: 0.08 },
            { x: 0.5, y: 0.92 },
            { x: 0.08, y: 0.5 },
            { x: 0.92, y: 0.5 },
            { x: 0.24, y: 0.1 },
            { x: 0.76, y: 0.1 },
            { x: 0.24, y: 0.9 },
            { x: 0.76, y: 0.9 },
        ],
        [
            { x: 0.2, y: 0.2 },
            { x: 0.8, y: 0.2 },
            { x: 0.2, y: 0.8 },
            { x: 0.8, y: 0.8 },
            { x: 0.5, y: 0.18 },
            { x: 0.5, y: 0.82 },
            { x: 0.18, y: 0.5 },
            { x: 0.82, y: 0.5 },
            { x: 0.32, y: 0.18 },
            { x: 0.68, y: 0.18 },
            { x: 0.32, y: 0.82 },
            { x: 0.68, y: 0.82 },
        ],
        [
            { x: 0.3, y: 0.3 },
            { x: 0.7, y: 0.3 },
            { x: 0.3, y: 0.7 },
            { x: 0.7, y: 0.7 },
            { x: 0.5, y: 0.28 },
            { x: 0.5, y: 0.72 },
            { x: 0.28, y: 0.5 },
            { x: 0.72, y: 0.5 },
            { x: 0.4, y: 0.28 },
            { x: 0.6, y: 0.28 },
            { x: 0.4, y: 0.72 },
            { x: 0.6, y: 0.72 },
        ],
    ];
    const slots: CollageSlot[] = [];

    ringAnchors.forEach((anchors, ringIndex) => {
        for (let revealIndex = 0; revealIndex < anchors.length; revealIndex += 1) {
            if (slots.length >= count) {
                return;
            }

            const anchor = anchors[revealIndex];
            const xJitter = ((((revealIndex + 1) * (ringIndex + 2) * 13) % 5) - 2) * 0.006;
            const yJitter = ((((revealIndex + 1) * (ringIndex + 3) * 11) % 5) - 2) * 0.006;

            slots.push({
                x: anchor.x + xJitter,
                y: anchor.y + yJitter,
                zIndex: 4 + slots.length,
            });
        }
    });

    while (slots.length < count) {
        const index = slots.length;
        const extraRing = Math.floor((index - 24) / 8) + 1;
        const fallbackAnchors = [
            { x: 0.36, y: 0.38 },
            { x: 0.64, y: 0.38 },
            { x: 0.36, y: 0.62 },
            { x: 0.64, y: 0.62 },
            { x: 0.5, y: 0.34 },
            { x: 0.5, y: 0.66 },
            { x: 0.34, y: 0.5 },
            { x: 0.66, y: 0.5 },
        ];
        const anchor = fallbackAnchors[index % fallbackAnchors.length];
        const inset = Math.min(extraRing * 0.05, 0.18);

        slots.push({
            x: 0.5 + (anchor.x - 0.5) * (1 - inset),
            y: 0.5 + (anchor.y - 0.5) * (1 - inset),
            zIndex: 4 + index,
        });
    }

    return slots;
}

type ProblemCollageImageProps = {
    id: string;
    index: number;
    slot: CollageSlot;
    frame: number;
    centerX: number;
    centerY: number;
    startFrame: number;
    duration: number;
    boundsWidth: number;
    boundsHeight: number;
};

function ProblemCollageImage({
    id,
    index,
    slot,
    frame,
    centerX,
    centerY,
    startFrame,
    duration,
    boundsWidth,
    boundsHeight,
}: ProblemCollageImageProps) {
    const imageEl = useElement<ImagePatch>(id);
    const { props } = imageEl;
    const naturalDimensions = useImageDimensions(props.image);
    const hasExplicitSize = typeof props.width === 'number' || typeof props.height === 'number';
    const targetSize = useMemo(() => {
        if (props.width && props.height) {
            return {
                width: props.width,
                height: props.height,
            };
        }

        if (props.width) {
            const ratio = naturalDimensions.width / Math.max(1, naturalDimensions.height);
            return {
                width: props.width,
                height: Math.round(props.width / ratio),
            };
        }

        if (props.height) {
            const ratio = naturalDimensions.width / Math.max(1, naturalDimensions.height);
            return {
                width: Math.round(props.height * ratio),
                height: props.height,
            };
        }

        return {
            width: naturalDimensions.width,
            height: naturalDimensions.height,
        };
    }, [naturalDimensions.height, naturalDimensions.width, props.height, props.width]);

    const progress = interpolateWithEasing(
        frame,
        [startFrame, startFrame + duration],
        [0, 1],
        'ease-out',
    );
    const fittedSize = hasExplicitSize
        ? {
            width: Math.max(1, Math.round(targetSize.width)),
            height: Math.max(1, Math.round(targetSize.height)),
        }
        : fitWithin(
            targetSize.width,
            targetSize.height,
            Math.max(1, Math.min(boundsWidth * MAX_SCATTER_WIDTH, boundsWidth - COLLAGE_VIEW_PADDING * 2)),
            Math.max(1, Math.min(boundsHeight * MAX_SCATTER_HEIGHT, boundsHeight - COLLAGE_VIEW_PADDING * 2)),
        );
    const halfWidth = fittedSize.width / 2;
    const halfHeight = fittedSize.height / 2;
    const safeRadiusX = Math.max(0, boundsWidth - fittedSize.width - COLLAGE_VIEW_PADDING * 2);
    const safeRadiusY = Math.max(0, boundsHeight - fittedSize.height - COLLAGE_VIEW_PADDING * 2);
    const safeLeft = clamp(
        COLLAGE_VIEW_PADDING + halfWidth + safeRadiusX * slot.x,
        halfWidth + COLLAGE_VIEW_PADDING,
        boundsWidth - halfWidth - COLLAGE_VIEW_PADDING,
    );
    const safeTop = clamp(
        COLLAGE_VIEW_PADDING + halfHeight + safeRadiusY * slot.y,
        halfHeight + COLLAGE_VIEW_PADDING,
        boundsHeight - halfHeight - COLLAGE_VIEW_PADDING,
    );
    const fromCenterX = centerX - safeLeft;
    const fromCenterY = centerY - safeTop;
    const opacity = clamp(progress / 0.35, 0, 1);
    const scale = interpolateWithEasing(progress, [0, 1], [0.76, 1], 'ease-out');
    const translateX = fromCenterX * (1 - progress);
    const translateY = fromCenterY * (1 - progress);

    return (
        <ArrayItem
            key={id}
            {...imageEl.rootProps}
            index={index}
            source="images"
            removeControl="corner-top-right"
            addControl="corner-top-left"
            style={imageEl.rootStyle({
                base: {
                    position: 'absolute',
                    left: safeLeft,
                    top: safeTop,
                    width: fittedSize.width,
                    height: fittedSize.height,
                    zIndex: slot.zIndex,
                    opacity,
                    transformOrigin: 'center center',
                },
                transform: `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${scale})`,
            })}
        >
            <ImageAsset
                image={props.image}
                width={fittedSize.width}
                height={fittedSize.height}
                style={{ objectFit: props.style?.objectFit }}
            />
        </ArrayItem>
    );
}

export const ProblemCollage: React.FC = () => {
    const frame = useCurrentFrame();
    const preset = useAspectPreset();
    const textEl = useElement('textstagger', ProblemCollageTextDefaults);
    const sceneEl = useElement('scene', ProblemCollageSceneDefaults);
    const textProps = textEl.props;
    const sceneProps = sceneEl.props;
    const imageEntries = useArrayPatch('images');

    const resolvedImages = useMemo<ResolvedImageItem[]>(() => {
        return imageEntries.map((item) => {
                const [id] = Object.entries(item)[0] as [string, ImagePatch];

                return {
                    id: id,
                };
            });
    }, [imageEntries]);

    const contentWidth = preset.width - preset.safeArea.left - preset.safeArea.right;
    const contentHeight = preset.height - preset.safeArea.top - preset.safeArea.bottom;
    
    const speed = getSpeed(sceneProps.speed);
    const textDelay = scaleTiming(BASE_TEXT_DELAY, speed);
    const imageStagger = scaleTiming(BASE_IMAGE_STAGGER, speed);
    const imageDuration = scaleTiming(BASE_IMAGE_DURATION, speed);
    const holdDuration = scaleTiming(BASE_HOLD_DURATION, speed);
    const outroDuration = scaleTiming(BASE_OUTRO_DURATION, speed);
    const centerX = contentWidth / 2;
    const centerY = contentHeight / 2;
    const collageSlots = useMemo(
        () => buildCollageSlots(resolvedImages.length),
        [resolvedImages.length],
    );
    const lastImageStart = Math.max(0, resolvedImages.length - 1) * imageStagger;
    const outroStart = textDelay + imageDuration + lastImageStart + holdDuration;
    const outroProgress = interpolateWithEasing(
        frame,
        [outroStart, outroStart + outroDuration],
        [0, 1],
        'ease-in-out',
    );
    const sceneScale = interpolateWithEasing(outroProgress, [0, 1], [1, 1.5], 'ease-in-out');
    const sceneOpacity = interpolateWithEasing(outroProgress, [0, 1], [1, 0], 'ease-out');
    const sceneBlur = interpolateWithEasing(outroProgress, [0, 1], [0, 10], 'ease-out');

    return (
        <div
            style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: contentWidth,
                height: contentHeight,
                transform: 'translate(-50%, -50%)',
            }}
        >
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    transform: `scale(${sceneScale})`,
                    transformOrigin: 'center center',
                    opacity: sceneOpacity,
                    filter: `blur(${sceneBlur}px)`,
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 5,

                        padding: '0 8%',
                    }}
                >
                    <div
                        style={{
                            textAlign: 'center',
                        }}
                    >
                        <TextStagger
                            {...textProps}
                            id="textstagger"
                            startAt={0}
                            style={{
                                textAlign: 'center',
                                ...textProps.style,
                            }}
                        />
                    </div>
                </div>

                {resolvedImages.map(({ id }, index) => {
                    const slot = collageSlots[index];

                    if (!slot) {
                        return null;
                    }

                    return (
                        <ProblemCollageImage
                            key={id}
                            id={id}
                            index={index}
                            slot={slot}
                            frame={frame}
                            centerX={centerX}
                            centerY={centerY}
                            startFrame={textDelay + index * imageStagger}
                            duration={imageDuration}
                            boundsWidth={contentWidth}
                            boundsHeight={contentHeight}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export const ProblemCollageSchemaFields = [
    {
        type: 'component',
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
                "default": ProblemCollageTextDefaults.variant
            }
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
                name: 'speed',
                type: 'number',
                default: DEFAULT_SPEED_PERCENTAGE,
            },
        ],
    },
];

export const ProblemCollageDescriptor: ComponentRegistration = {
    name: 'ProblemCollage',
    type: 'scene',
    tags: ['Problem', 'Pain Point'],
    schema: ProblemCollageSchemaFields,
    llmSchema: [
        {
            name: 'text',
            type: 'string',
        },
        {
            name: 'images',
            type: 'array',
            items: {
                type: 'string',
            },
        },
    ],
    description: `Centered problem statement with screenshots that fly in around it as a scattered collage. Best used to show data scattered across tools, fragmentation, multiple issues kind of problems.
Provide 5 default images of size 800x400 that user can change later
Takes around **66 frames** to complete`,
    celExpression: `((${CEL_BASE_FRAMES} + max(0, size(props.images) - 1) * ${CEL_PER_IMAGE_FRAMES}) * ${DEFAULT_SPEED_PERCENTAGE}) / max(props.scene.speed, ${MIN_SPEED_PERCENTAGE})`,
};
