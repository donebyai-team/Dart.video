import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useSpeedFactor, applySpeedFactor } from '../../../duration/speedFactor';
import { useStyleContext } from '../../../styles/StyleContext';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { ImageAsset } from '../../../core/assets/ImageAsset';
import { usePatchedProp } from '../../../patches';

export type PeelDirection = 'left' | 'right' | 'up' | 'down';

export interface ImagePeelProps {
    /** Array of image source URLs. */
    sources: string[];
    /** Direction images peel away towards. */
    direction?: PeelDirection;
    /** Frame at which the animation begins. */
    startAt?: number;
    /** Frames each image is visible before peeling. */
    holdDuration?: number;
    /** Frames for the peel transition. */
    peelDuration?: number;
    /** Pixel offset between stacked images. */
    stackOffset?: number;
    /** Border radius applied to each image. */
    borderRadius?: number;
    /** Width of each image. */
    width?: number;
    /** Height of each image. */
    height?: number;
    style?: React.CSSProperties;
    id?: string;
}

function getPeelTransform(direction: PeelDirection, progress: number): { transform: string; opacity: number } {
    const opacity = 1 - progress;
    switch (direction) {
        case 'left':
            return { transform: `translateX(${-progress * 120}px) rotate(${-progress * 15}deg)`, opacity };
        case 'right':
            return { transform: `translateX(${progress * 120}px) rotate(${progress * 15}deg)`, opacity };
        case 'up':
            return { transform: `translateY(${-progress * 120}px) rotate(${-progress * 10}deg)`, opacity };
        case 'down':
            return { transform: `translateY(${progress * 120}px) rotate(${progress * 10}deg)`, opacity };
    }
}

export function ImagePeel({
    sources,
    direction = 'right',
    startAt = 0,
    holdDuration = 20,
    peelDuration = 20,
    stackOffset = 20,
    borderRadius = 16,
    width,
    height,
    style,
    id,
}: ImagePeelProps): React.ReactElement {
    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const preset = useAspectPreset();
    const speedFactor = useSpeedFactor();
    const adjustedStartAt = applySpeedFactor(startAt, speedFactor);

    const patchedSources = usePatchedProp<string[]>(id, 'sources', sources);
    const patchedWidth = usePatchedProp<number | undefined>(id, 'width', width ?? preset.width * 0.7);
    const patchedHeight = usePatchedProp<number | undefined>(id, 'height', height ?? preset.height * 0.7);

    const easing = styleConfig.motion.entrance;
    const count = patchedSources.length;
    // Each image: [enter] -> [hold] -> [peel away], staggered
    const cycleDuration = holdDuration + peelDuration;

    // Entrance animation for the whole stack
    const entranceDuration = 30;
    const entranceProgress = interpolateWithEasing(
        frame,
        [adjustedStartAt, adjustedStartAt + entranceDuration],
        [0, 1],
        easing,
    );

    return (
        <div
            id={id}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: entranceProgress,
                transform: `scale(${0.9 + entranceProgress * 0.1})`,
                ...style,
            }}
        >
            <div
                style={{
                    position: 'relative',
                    width: patchedWidth,
                    height: patchedHeight,
                }}
            >
                {/* Render bottom to top: last image at bottom, first on top */}
                {[...patchedSources].reverse().map((src, reversedIndex) => {
                    const index = count - 1 - reversedIndex;
                    const peelStart = adjustedStartAt + entranceDuration + index * cycleDuration;

                    // Progress of this image peeling away (0 = stationary, 1 = fully peeled)
                    const peelProgress = interpolateWithEasing(
                        frame,
                        [peelStart + holdDuration, peelStart + holdDuration + peelDuration],
                        [0, 1],
                        easing,
                    );

                    // Once fully peeled, hide
                    const isFullyPeeled = frame >= peelStart + holdDuration + peelDuration;
                    if (isFullyPeeled && index < count - 1) return null;

                    const { transform: peelTransform, opacity: peelOpacity } = index < count - 1
                        ? getPeelTransform(direction, peelProgress)
                        : { transform: 'none', opacity: 1 };

                    // Stack offset: cards offset toward bottom-right like a deck
                    const stackX = reversedIndex * stackOffset;
                    const stackY = reversedIndex * stackOffset;

                    return (
                        <div
                            key={index}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                borderRadius,
                                overflow: 'hidden',
                                transformOrigin: direction === 'left' ? 'top left'
                                    : direction === 'right' ? 'top right'
                                    : direction === 'up' ? 'top center'
                                    : 'bottom center',
                                transform: `translate(${stackX}px, ${stackY}px) ${peelTransform}`,
                                opacity: peelOpacity,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                            }}
                        >
                            <ImageAsset src={src} width={patchedWidth} height={patchedHeight} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
