import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useSpeedFactor, applySpeedFactor } from '../../../duration/speedFactor';
import { useStyleContext } from '../../../styles/StyleContext';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { Text } from '../../../core/text/Text';
import { VideoAsset } from '../../../core/assets/VideoAsset';
import { TypographyVariant } from '../../../tokens/semantic';
import { usePatchedProp, useStyleOverride } from '../../../patches';
import { resolveTypography } from '../../../tokens';
import { useTheme } from '../../../theme';

export type VideoAnimation = 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'fadeIn' | 'scaleIn';

export interface AnimatedVideoProps {
    /** The text displayed above the video. */
    text: string;
    /** Video source URL. */
    src: string;
    /** Typography variant for the text. */
    variant?: TypographyVariant;
    /** Video entrance animation. */
    animation?: VideoAnimation;
    /** Frame at which the animation begins. */
    startAt?: number;
    /** Border radius applied to the video. */
    borderRadius?: number;
    /** Width of the video container. */
    width?: number;
    /** Height of the video container. */
    height?: number;
    style?: React.CSSProperties;
    id?: string;
}

function getVideoTransform(animation: VideoAnimation, progress: number): string {
    const inv = 1 - progress;
    switch (animation) {
        case 'slideUp':
            return `translateY(${inv * 200}px)`;
        case 'slideDown':
            return `translateY(${inv * -200}px)`;
        case 'slideLeft':
            return `translateX(${inv * 200}px)`;
        case 'slideRight':
            return `translateX(${inv * -200}px)`;
        case 'scaleIn':
            return `scale(${0.5 + progress * 0.5})`;
        case 'fadeIn':
        default:
            return 'none';
    }
}

export function AnimatedVideo({
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
}: AnimatedVideoProps): React.ReactElement {
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
    const videoDuration = 40;
    const videoStart = adjustedStartAt + 10;

    const textProgress = interpolateWithEasing(
        frame,
        [adjustedStartAt, adjustedStartAt + textDuration],
        [0, 1],
        easing,
    );

    const videoProgress = interpolateWithEasing(
        frame,
        [videoStart, videoStart + videoDuration],
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
                    opacity: videoProgress,
                    transform: getVideoTransform(animation, videoProgress),
                    borderRadius,
                    overflow: 'hidden',
                    boxShadow: "0 20px 40px rgba(0,0,0,0.25), 0 12px 24px rgba(0,0,0,0.15)",
                }}
            >
                <VideoAsset src={patchedSrc} width={patchedWidth} height={patchedHeight} />
            </div>
        </div>
    );
}
