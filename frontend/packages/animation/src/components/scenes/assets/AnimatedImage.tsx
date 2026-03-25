import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useSpeedFactor, applySpeedFactor } from '../../../duration/speedFactor';
import { useStyleContext } from '../../../styles/StyleContext';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { Text } from '../../../core/text/Text';
import { ImageAsset } from '../../../core/assets/ImageAsset';
import { TypographyVariant } from '../../../tokens/semantic';
import { usePatchedProp, useStyleOverride } from '../../../patches';
import { resolveTypography } from '../../../tokens';
import { useTheme } from '../../../theme';
import { EntranceAnimation, getEntranceTransform } from '../types';


export interface AnimatedImageProps {
    /** The text displayed above the image. */
    text: string;
    /** Image source URL. */
    src: string;
    /** Typography variant for the text. */
    variant?: TypographyVariant;
    /** Image entrance animation. */
    animation?: EntranceAnimation;
    /** Frame at which the animation begins. */
    startAt?: number;
    /** Border radius applied to the image. */
    borderRadius?: number;
    /** Width of the image container. */
    width?: number;
    /** Height of the image container. */
    height?: number;
    style?: React.CSSProperties;
    id?: string;
}

/**
 * Scene showing a text label above a full image that slides up into view.
 * Text fades in first, then the image slides up with a border radius.
 */

export function AnimatedImage({
    text,
    src,
    variant = 'subheading',
    animation = 'slideUp',
    startAt = 0,
    borderRadius = 16,
    width,
    height,
    style,
    id,
}: AnimatedImageProps): React.ReactElement {
    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();
    const speedFactor = useSpeedFactor();
    const adjustedStartAt = applySpeedFactor(startAt, speedFactor);

    const patchedVariant = usePatchedProp<TypographyVariant>(id, 'variant', variant);
    const styleOverride = useStyleOverride(id);
    const patchedSrc = usePatchedProp<string | undefined>(id, 'src', src);
    const patchedWidth = usePatchedProp<number | undefined>(id, 'width', width ?? preset.width * 0.7);
    const patchedHeight = usePatchedProp<number | undefined>(id, 'height', height ?? preset.height * 0.7);


    const easing = styleConfig.motion.entrance;

    const textDuration = 30;
    const imageDuration = 40;
    const imageStart = adjustedStartAt + 10;

    const textProgress = interpolateWithEasing(
        frame,
        [adjustedStartAt, adjustedStartAt + textDuration],
        [0, 1],
        easing,
    );

    const imageProgress = interpolateWithEasing(
        frame,
        [imageStart, imageStart + imageDuration],
        [0, 1],
        easing,
    );

    return (
        <div
            id={id}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 24,
            }}
        >

            <div style={{ opacity: textProgress, transform: `translateY(${(1 - textProgress) * 20}px)` }}>
                <Text style={
                    {
                        ...resolveTypography(patchedVariant, styleConfig, theme, preset),
                        ...style,
                        ...styleOverride
                    }}>
                    {text}
                </Text>
            </div>
            <div
                style={{
                    opacity: imageProgress,
                    transform: getEntranceTransform(animation, imageProgress),
                    borderRadius,
                    overflow: 'hidden',
                    boxShadow: "0 20px 40px rgba(0,0,0,0.25), 0 12px 24px rgba(0,0,0,0.15)",
                }}
            >
                <ImageAsset src={patchedSrc} width={patchedWidth} height={patchedHeight} />
            </div>
        </div>
    );
}
