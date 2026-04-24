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
    const activeIndex = Math.min(Math.floor(frame / cycleDuration), Math.max(images.length - 1, 0));
    const visibleImages = images.slice(0, activeIndex + 1);

    return (
        <div
            style={{
                position: 'relative',
                width,
                height,
            }}
        >
            {visibleImages.map((item, index) => {
                const [eid, patch] = Object.entries(item)[0] ?? [`image-${index}`, {}];
                const enterStart = index * cycleDuration;
                const enterProgress = interpolateWithEasing(
                    frame,
                    [enterStart, enterStart + transitionDuration],
                    [0, 1],
                    'ease-out',
                );
                const settledStackIndex = activeIndex - index;
                const settleProgress = index === activeIndex ? enterProgress : 1;
                const stackX = settledStackIndex * stackOffset;
                const stackY = settledStackIndex * stackOffset;
                const translateY = -220 * (1 - settleProgress);
                const opacity = interpolateWithEasing(
                    settleProgress,
                    [0, 1],
                    [0, 1],
                    'ease-out',
                );

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
                                zIndex: index + 1,
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
