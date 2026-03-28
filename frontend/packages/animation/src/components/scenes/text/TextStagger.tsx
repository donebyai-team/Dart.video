import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import z from 'zod';
import { TypographyVariant, TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens/semantic';
import { useStyleContext } from '../../../styles/StyleContext';
import { usePatchedProp, usePatchedProps, useStyleOverride } from '../../../patches';
import { interpolateWithEasing, useAspectPreset } from '../../../styles';
import { useTheme } from '../../../theme';
import { resolveTypography } from '../../../tokens';
import { getEntranceTransform, ENTRANCE_ANIMATIONS } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../durationTypes';

// Default constants
const DEFAULT_STAGGER_DELAY = 5;
const DEFAULT_WORD_DURATION = 15;
const DEFAULT_VARIANT = 'heading' as const;
const DEFAULT_ANIMATION = 'scaleIn' as const;
const DEFAULT_SEPARATOR = ' ';

// Use z.input for props (what callers pass) - fields with defaults are optional
export type TextStaggerProps = z.input<typeof TextStaggerSchema>;

export const TextStagger: React.FC<TextStaggerProps> = (propsInit: TextStaggerProps) => {

    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();

    const patchedProps = usePatchedProps(propsInit.id, propsInit)   
    const props = { ...TextStaggerSchema.parse(patchedProps), id: propsInit.id }


    // Apply defaults
    const actualVariant = props.variant ?? DEFAULT_VARIANT;
    const actualStaggerDelay = props.staggerDelay ?? DEFAULT_STAGGER_DELAY;
    const actualAnimation = props.entranceAnimation ?? DEFAULT_ANIMATION;
    const actualStartAt = props.startAt ?? 0;
    const actualDuration = props.duration ?? DEFAULT_WORD_DURATION;


    const styleOverride = useStyleOverride(props.id);

    const words = props.text.split(DEFAULT_SEPARATOR);

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
        <span id={props.id} className={props.className} style={{ display: 'inline-block', ...props.style }}>
            {words.map((word, index) => (
                <span
                    key={index}
                    style={{
                        display: 'inline-block',
                        marginRight: index < words.length - 1 ? '0.25em' : 0,
                        ...getAnimationStyles(index),
                        ...resolveTypography(actualVariant, styleConfig, theme, preset),
                        ...props.wordStyle,
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
    id: z.string().optional(),
    startAt: z.number().min(0, "startAt cannot be negative").optional().default(0),
    text: z.string().min(1, "text is required"),
    variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).optional().default(DEFAULT_VARIANT),
    staggerDelay: z.number().min(0, "staggerDelay cannot be negative").optional().default(DEFAULT_STAGGER_DELAY),
    entranceAnimation: z.enum(ENTRANCE_ANIMATIONS).optional().default(DEFAULT_ANIMATION),
    duration: z.number().min(1, "duration must be positive").optional().default(DEFAULT_WORD_DURATION),
    className: z.string().optional(),
    style: z.any().optional(),
    wordStyle: z.any().optional(),
});

export function calculateTextStaggerDuration(props: TextStaggerProps): DurationResult {
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
    const words = validated.text.split(DEFAULT_SEPARATOR);
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