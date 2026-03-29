import React from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens/semantic';
import { useStyleContext } from '../../../styles/StyleContext';
import { usePatchedProps, useStyleOverride } from '../../../patches';
import { interpolateWithEasing, useAspectPreset } from '../../../styles';
import { useTheme } from '../../../theme';
import { resolveTypography } from '../../../tokens';
import { getEntranceTransform, ENTRANCE_ANIMATIONS, SPLIT_BY_MODES } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../durationTypes';

// Default constants
const DEFAULT_STAGGER_DELAY = 5;
const DEFAULT_WORD_DURATION = 15;
const DEFAULT_VARIANT = 'heading' as const;
const DEFAULT_ANIMATION = 'scaleIn' as const;
const DEFAULT_SPLIT_BY = 'word' as const;

// Use z.input for props (what callers pass) - fields with defaults are optional
export type TextStaggerProps = z.input<typeof TextStaggerSchema>;

export const TextStagger: React.FC<TextStaggerProps> = (propsInit: TextStaggerProps) => {

    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();

    const patchedProps = usePatchedProps(propsInit.id, propsInit);
    const props = { ...TextStaggerSchema.parse(patchedProps), id: propsInit.id }


    // Apply defaults
    const actualVariant = props.variant ?? DEFAULT_VARIANT;
    const actualStaggerDelay = props.staggerDelay ?? DEFAULT_STAGGER_DELAY;
    const actualAnimation = props.entranceAnimation ?? DEFAULT_ANIMATION;
    const actualStartAt = props.startAt ?? 0;
    const actualDuration = props.duration ?? DEFAULT_WORD_DURATION;


    const styleOverride = useStyleOverride(props.id);

    const splitBy = props.splitBy ?? DEFAULT_SPLIT_BY;
    const units = splitBy === 'char' ? props.text.split('') : splitBy === 'line' ? props.text.split('\n') : props.text.split(' ');

    const getAnimationStyles = (unitIndex: number): React.CSSProperties => {
        const wordStartAt = actualStartAt + unitIndex * actualStaggerDelay;
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
            {units.map((unit, index) => (
                <span
                    key={index}
                    style={{
                        display: 'inline-block',
                        marginRight: splitBy === 'word' && index < units.length - 1 ? '0.25em' : 0,
                        ...getAnimationStyles(index),
                        ...resolveTypography(actualVariant, styleConfig, theme, preset),
                        ...props.wordStyle,
                        ...styleOverride
                    }}
                >
                    {unit}
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
    splitBy: z.enum(SPLIT_BY_MODES).optional().default(DEFAULT_SPLIT_BY),
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

    // Calculate unit count based on splitBy mode
    const splitBy = validated.splitBy ?? DEFAULT_SPLIT_BY;
    const units = splitBy === 'char' ? validated.text.split('') : splitBy === 'line' ? validated.text.split('\n') : validated.text.split(' ');
    const unitCount = units.length;

    if (unitCount === 0) {
        return {
            success: false,
            error: "text must contain at least one word",
            field: "text",
        };
    }

    // Calculate duration
    const staggerDelay = validated.staggerDelay ?? DEFAULT_STAGGER_DELAY;
    const unitDuration = validated.duration ?? DEFAULT_WORD_DURATION;

    // Total duration = time until last unit starts + duration of last unit animation
    const totalDuration = (unitCount - 1) * staggerDelay + unitDuration;

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
    editorProps: ['text', 'animation', 'staggerDelay', 'duration', 'splitBy'],
    description: 'Reveals text word-by-word or character-by-character with staggered animation delays. Use for multi-word headlines or body text. Required props: text="Transform your workflow with AI". Each unit animates in sequence with configurable delay. Set splitBy="char" for character-level animation.',
    calculateDuration: calculateTextStaggerDuration,
};