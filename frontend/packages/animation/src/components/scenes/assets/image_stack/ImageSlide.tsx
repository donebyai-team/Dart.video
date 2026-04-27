import React from 'react';
import { ArrayItem } from '../../../../core/assets/ArrayItem';
import { ImageAsset } from '../../../../core/assets/ImageAsset';
import { interpolateWithEasing } from '../../../../styles/easingResolver';
import type { ImageStackImageItem } from './ImagePeel';

export type ImageSlideProps = {
    frame: number;
    images: ImageStackImageItem[];
    holdDuration: number;
    transitionDuration: number;
    stackOffset: number;
    width: number;
    height: number;
};

export function ImageSlide({
    frame,
    images,
    holdDuration,
    transitionDuration,
    stackOffset,
    width,
    height,
}: ImageSlideProps): React.ReactElement {
    const cycleDuration = holdDuration + transitionDuration;
    const maxIndex = Math.max(images.length - 1, 0);
    const activeIndex = Math.min(Math.floor(frame / cycleDuration), maxIndex);
    const cycleFrame = frame - (activeIndex * cycleDuration);
    const exitProgress = activeIndex >= maxIndex ? 0 : interpolateWithEasing(
        cycleFrame,
        [holdDuration, holdDuration + transitionDuration],
        [0, 1],
        'ease-out',
    );
    const visibleImages = images.slice(activeIndex);

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
                const [eid, patch] = Object.entries(item)[0] ?? [`image-${index}`, {}];
                const stackProgress = Math.max(visibleIndex - exitProgress, 0);
                const stackX = stackProgress * stackOffset;
                const stackY = stackProgress * stackOffset;
                const isExiting = visibleIndex === 0 && activeIndex < maxIndex;
                const translateY = isExiting ? exitProgress * (height + 160) : 0;
                const opacity = isExiting ? 1 - exitProgress : 1;

                return (
                    <ArrayItem
                        key={`${eid}-${index}`}
                        index={index}
                        source="images"
                        removeControl="mid-left"
                        addControl="mid-right"
                    >
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                zIndex: images.length - visibleIndex,
                                opacity,
                                transform: `translate(${stackX}px, ${stackY + translateY}px)`,
                            }}
                        >
                            <ImageAsset
                                id={eid}
                                image={patch.image ?? ''}
                                width={patch.width ?? width}
                                height={patch.height ?? height}
                                style={{ overflow: 'hidden' }}
                            />
                        </div>
                    </ArrayItem>
                );
            })}
        </div>
    );
}
