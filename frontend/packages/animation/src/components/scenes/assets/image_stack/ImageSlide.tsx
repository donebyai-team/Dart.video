import React from 'react';
import { ImageAsset } from '../../../../core/assets/ImageAsset';
import { interpolateWithEasing } from '../../../../styles/easingResolver';
import { getImageWithLabelImage, type ImageWithLabelItem } from './shared';

export type ImageSlideProps = {
    frame: number;
    items: ImageWithLabelItem[];
    holdDuration: number;
    transitionDuration: number;
    stackOffset: number;
    width: number;
    height: number;
};

export function ImageSlide({
    frame,
    items,
    holdDuration,
    transitionDuration,
    stackOffset,
    width,
    height,
}: ImageSlideProps): React.ReactElement {
    const cycleDuration = holdDuration + transitionDuration;
    const maxIndex = Math.max(items.length - 1, 0);
    const activeIndex = Math.min(Math.floor(frame / cycleDuration), maxIndex);
    const cycleFrame = frame - (activeIndex * cycleDuration);
    const exitProgress = activeIndex >= maxIndex ? 0 : interpolateWithEasing(
        cycleFrame,
        [holdDuration, holdDuration + transitionDuration],
        [0, 1],
        'ease-out',
    );
    const visibleImages = items.slice(activeIndex);

    return (
        <div
            style={{
                position: 'relative',
                width,
                height,
            }}
        >
            {visibleImages.map((item, visibleIndex) => {
                const index = activeIndex + visibleIndex;
                const imagePatch = getImageWithLabelImage(item);
                const stackProgress = Math.max(visibleIndex - exitProgress, 0);
                const stackX = stackProgress * stackOffset;
                const stackY = stackProgress * stackOffset;
                const isExiting = visibleIndex === 0 && activeIndex < maxIndex;
                const translateY = isExiting ? exitProgress * (height + 160) : 0;
                const opacity = isExiting ? 1 - exitProgress : 1;

                return (
                    <div
                        key={`${imagePatch.id}-${index}`}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            zIndex: items.length - visibleIndex,
                            opacity,
                            transform: `translate(${stackX}px, ${stackY + translateY}px)`,
                        }}
                    >
                        <ImageAsset
                            id={imagePatch.id}
                            image={imagePatch.image ?? ''}
                            width={imagePatch.width ?? width}
                            height={imagePatch.height ?? height}
                            style={{ overflow: 'hidden' }}
                        />
                    </div>
                );
            })}
        </div>
    );
}
