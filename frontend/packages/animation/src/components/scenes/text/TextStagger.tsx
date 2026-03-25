import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { TypographyVariant } from '../../../tokens/semantic';
import { useStyleContext } from '../../../styles/StyleContext';
import { usePatchedProp, useStyleOverride } from '../../../patches';
import { useAspectPreset } from '../../../styles';
import { useTheme } from '../../../theme';
import { resolveTypography } from '../../../tokens';
import { EntranceAnimation, getEntranceTransform } from '../types';

export interface TextStaggerStaggerProps {
    id?: string;
    variant?: TypographyVariant;
    text: string;
    staggerDelay?: number; // frames between each word
    animation?: EntranceAnimation;
    startAt?: number;
    duration?: number; // animation duration per word
    separator?: string | RegExp;
    className?: string;
    style?: React.CSSProperties;
    wordStyle?: React.CSSProperties;
}

export const TextStagger: React.FC<TextStaggerStaggerProps> = ({
    id,
    variant = 'heading',
    text,
    staggerDelay = 5,
    animation = 'slideUp',
    startAt = 0,
    duration = 15,
    separator = ' ',
    className,
    style,
    wordStyle,
}) => {
    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();

    const patchedVariant = usePatchedProp<TypographyVariant>(id, 'variant', variant);
    const styleOverride = useStyleOverride(id);

    const words = text.split(separator);

    const getAnimationStyles = (wordIndex: number): React.CSSProperties => {
        const wordStartAt = startAt + wordIndex * staggerDelay;
        const progress = interpolate(
            frame,
            [wordStartAt, wordStartAt + duration],
            [0, 1],
            {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
            }
        );

        return {
            opacity: progress,
            transform: getEntranceTransform(animation, progress),
        };
    };

    return (
        <span id={id} className={className} style={{ display: 'inline-block', ...style }}>
            {words.map((word, index) => (
                <span
                    key={index}
                    style={{
                        display: 'inline-block',
                        marginRight: index < words.length - 1 ? '0.25em' : 0,
                        ...getAnimationStyles(index),
                        ...resolveTypography(patchedVariant, styleConfig, theme, preset),
                        ...wordStyle,
                        ...styleOverride
                    }}
                >
                    {word}
                </span>
            ))}
        </span>
    );
};