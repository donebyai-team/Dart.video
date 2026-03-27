import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import z from 'zod';
import { TypographyVariant, TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens/semantic';
import { useStyleContext } from '../../../styles/StyleContext';
import { usePatchedProp, useStyleOverride } from '../../../patches';
import { interpolateWithEasing, useAspectPreset } from '../../../styles';
import { useTheme } from '../../../theme';
import { resolveTypography } from '../../../tokens';
import { EntranceAnimation, getEntranceTransform, ENTRANCE_ANIMATIONS } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../durationTypes';

// Default constants
const DEFAULT_STAGGER_DELAY = 5;
const DEFAULT_WORD_DURATION = 15;
const DEFAULT_VARIANT = 'heading' as const;
const DEFAULT_ANIMATION = 'scaleIn' as const;
const DEFAULT_SEPARATOR = ' ';

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
    variant,
    text,
    staggerDelay,
    animation,
    startAt,
    duration,
    separator,
    className,
    style,
    wordStyle,
}) => {
    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();

    // Apply defaults
    const actualVariant = variant ?? DEFAULT_VARIANT;
    const actualStaggerDelay = staggerDelay ?? DEFAULT_STAGGER_DELAY;
    const actualAnimation = animation ?? DEFAULT_ANIMATION;
    const actualStartAt = startAt ?? 0;
    const actualDuration = duration ?? DEFAULT_WORD_DURATION;
    const actualSeparator = separator ?? DEFAULT_SEPARATOR;

    const patchedVariant = usePatchedProp<TypographyVariant>(id, 'variant', actualVariant);
    const styleOverride = useStyleOverride(id);

    const words = text.split(actualSeparator);

    const getAnimationStyles = (wordIndex: number): React.CSSProperties => {
        const wordStartAt = actualStartAt + wordIndex * actualStaggerDelay;
        const progress = interpolateWithEasing(
            frame,
            [wordStartAt, wordStartAt + actualDuration],
            [0, 1],           
        );

        return {
            opacity: progress,
            transform: getEntranceTransform(actualAnimation, progress),
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

// ============================================================================
// Schema & Duration Calculation
// ============================================================================

export const TextStaggerSchema = z.object({
    text: z.string().min(1, "text is required"),
    variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).default(DEFAULT_VARIANT).optional(),
    staggerDelay: z.number().min(0, "staggerDelay cannot be negative").default(DEFAULT_STAGGER_DELAY).optional(),
    animation: z.enum(ENTRANCE_ANIMATIONS).default(DEFAULT_ANIMATION).optional(),
    startAt: z.number().min(0, "startAt cannot be negative").default(0).optional(),
    duration: z.number().min(1, "duration must be positive").default(DEFAULT_WORD_DURATION).optional(),
    separator: z.union([z.string(), z.instanceof(RegExp)]).default(DEFAULT_SEPARATOR).optional(),
    className: z.string().optional(),
    style: z.any().optional(),
    wordStyle: z.any().optional(),
});

export function calculateTextStaggerDuration(props: TextStaggerStaggerProps): DurationResult {
    // Validate props
    const validation = TextStaggerSchema.safeParse(props);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return {
            success: false,
            error: firstError.message,
            field: firstError.path[0] as string,
        };
    }

    const validated = validation.data;
    
    // Calculate word count
    const separator = validated.separator ?? ' ';
    const words = validated.text.split(separator);
    const wordCount = words.length;
    
    if (wordCount === 0) {
        return {
            success: false,
            error: "text must contain at least one word",
            field: "text",
        };
    }

    // Calculate duration
    const staggerDelay = validated.staggerDelay ?? DEFAULT_STAGGER_DELAY;
    const wordDuration = validated.duration ?? DEFAULT_WORD_DURATION;
    const startAt = validated.startAt ?? 0;
    
    // Total duration = time until last word starts + duration of last word animation
    const totalDuration = (wordCount - 1) * staggerDelay + wordDuration;
    
    return {
        success: true,
        duration: Math.ceil(totalDuration),
    };
}

// ============================================================================
// Registry Descriptor
// ============================================================================

export const TextStaggerDescriptor: ComponentRegistration = {
    name: 'TextStagger',
    type: 'content',
    fullSchema: TextStaggerSchema,
    editorProps: ['text', 'animation', 'staggerDelay', 'duration'],
    description: 'Reveals text word-by-word with staggered animation delays. Use for multi-word headlines or body text. Required props: text="Transform your workflow with AI". Each word animates in sequence with configurable delay.',
    calculateDuration: calculateTextStaggerDuration,
};