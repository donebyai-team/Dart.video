import React from 'react';
import { ImageAsset } from '../../../../core/assets/ImageAsset';
import { useElement } from '../../../../patches';
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

type ImageSlideItemProps = {
    imagePatch: ReturnType<typeof getImageWithLabelImage>;
    index: number;
    visibleIndex: number;
    itemCount: number;
    opacity: number;
    transform: string;
    width: number;
    height: number;
};

function ImageSlideItem({
    imagePatch,
    index,
    visibleIndex,
    itemCount,
    opacity,
    transform,
    width,
    height,
}: ImageSlideItemProps): React.ReactElement {
    const el = useElement<ReturnType<typeof getImageWithLabelImage>>(imagePatch.id);
    const { props } = el;

    return (
        <div
            key={`${imagePatch.id}-${index}`}
            {...el.rootProps}
            style={el.rootStyle({
                base: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: itemCount - visibleIndex,
                    opacity,
                },
                transform,
            })}
        >
            <ImageAsset
                image={props.image ?? ''}
                width={props.width ?? width}
                height={props.height ?? height}
                style={{ overflow: 'hidden', objectFit: props.style?.objectFit }}
            />
        </div>
    );
}

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
                    <ImageSlideItem
                        key={`${imagePatch.id}-${index}`}
                        imagePatch={imagePatch}
                        index={index}
                        visibleIndex={visibleIndex}
                        itemCount={items.length}
                        opacity={opacity}
                        transform={`translate(${stackX}px, ${stackY + translateY}px)`}
                        width={width}
                        height={height}
                    />
                );
            })}
        </div>
    );
}
