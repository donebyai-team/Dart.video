import React from 'react';
import { ImageAsset } from '../../../../core/assets/ImageAsset';
import { interpolateWithEasing } from '../../../../styles/easingResolver';
import { Direction } from '../../types';
import { getImageWithLabelImage, type ImageWithLabelItem } from './shared';
import { DEFAULT_MEDIA_FRAME_STYLE } from '../TextWithMediaScene';

export type ImagePeelProps = {
    frame: number;
    items: ImageWithLabelItem[];
    holdDuration: number;
    transitionDuration: number;
    stackOffset: number;
    width: number;
    height: number;
    direction: Direction;
};

function getPeelTransform(direction: Direction, progress: number): { transform: string; opacity: number } {
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

function getTransformOrigin(direction: Direction): string {
    switch (direction) {
        case 'left':
            return 'top left';
        case 'right':
            return 'top right';
        case 'up':
            return 'top center';
        case 'down':
            return 'bottom center';
    }
}

export function ImagePeel({
    frame,
    items,
    holdDuration,
    transitionDuration,
    stackOffset,
    width,
    height,
    direction,
}: ImagePeelProps): React.ReactElement {
    const count = items.length;
    const cycleDuration = holdDuration + transitionDuration;

    return (
        <div
            style={{
                position: 'relative',
                width,
                height,
            }}
        >
            {[...items].reverse().map((item, reversedIndex) => {
                const index = count - 1 - reversedIndex;
                const imagePatch = getImageWithLabelImage(item);
                const peelStart = index * cycleDuration;
                const peelProgress = interpolateWithEasing(
                    frame,
                    [peelStart + holdDuration, peelStart + holdDuration + transitionDuration],
                    [0, 1],
                    'ease-out',
                );
                const isFullyPeeled = frame >= peelStart + holdDuration + transitionDuration;

                if (isFullyPeeled && index < count - 1) {
                    return null;
                }

                const { transform: peelTransform, opacity } = index < count - 1
                    ? getPeelTransform(direction, peelProgress)
                    : { transform: 'none', opacity: 1 };
                const stackX = reversedIndex * stackOffset;
                const stackY = reversedIndex * stackOffset;

                return (
                    <div
                        key={`${imagePatch.id}-${index}`}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            transformOrigin: getTransformOrigin(direction),
                            transform: `translate(${stackX}px, ${stackY}px) ${peelTransform}`,
                            opacity,
                        }}
                    >
                        <ImageAsset
                            id={imagePatch.id}
                            image={imagePatch.image ?? ''}
                            width={imagePatch.width ?? width}
                            height={imagePatch.height ?? height}
                            style={DEFAULT_MEDIA_FRAME_STYLE}
                        />
                    </div>
                );
            })}
        </div>
    );
}
