import React from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { usePatchedProp, useStyleOverride } from '../../../patches';
import { useStyleContext, useAspectPreset, interpolateWithEasing } from '../../../styles';
import { useTheme } from '../../../theme';
import { resolveTypography, TypographyVariant } from '../../../tokens';
import { TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens/semantic';
import { EntranceAnimation, getEntranceTransform, ENTRANCE_ANIMATIONS } from '../types';
import { Counter } from './Counter';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../durationTypes';

// Default duration constants
const DEFAULT_ENTRANCE_DURATION = 30;
const DEFAULT_COUNTER_MIN_DURATION = 45;
const DEFAULT_COUNTER_MAX_DURATION = 100;

export interface AnimatedNumberProps {
    id?: string;
    /** Text displayed before the number */
    startText: string;
    /** Text displayed after the number */
    endText: string;
    /** Starting number value */
    from?: number;
    /** Ending number value */
    to: number;
    /** Number format string, e.g. "0,0" | "$0,0" | "0%" */
    format?: string;
    /** Typography variant for the entire component */
    variant?: TypographyVariant;
    /** Highlight style for the number */
    highlightStyle?: 'marker' | 'underline' | 'box' | 'glow' | 'background';
    /** Color for the highlight effect */
    highlightColor?: string;
    /** Entrance animation type */
    animation?: EntranceAnimation;
    /** Duration of entrance animation in frames */
    animationDelay?: number;
    /** Duration for counting animation in frames */
    durationInFrames?: number;
    /** Frame at which the animation begins */
    startAt?: number;
    className?: string;
    style?: React.CSSProperties;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
    id,
    startText,
    endText,
    from,
    to,
    format,
    variant,
    highlightStyle,
    highlightColor,
    animation,
    animationDelay,
    durationInFrames,
    startAt,
    className,
    style,
}) => {
    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();
    
    // Apply defaults
    const actualFrom = from ?? 0;
    const actualVariant = variant ?? 'heading';
    const actualHighlightStyle = highlightStyle ?? 'glow';
    const actualHighlightColor = highlightColor ?? theme.colors.primary;
    const actualAnimation = animation ?? 'slideUp';
    const actualAnimationDelay = animationDelay ?? DEFAULT_ENTRANCE_DURATION;
    const actualDurationInFrames = durationInFrames ?? 45;
    const actualStartAt = startAt ?? 0;

    const patchedVariant = usePatchedProp<TypographyVariant>(id, 'variant', actualVariant);
    const patchedHighlightColor = usePatchedProp<string>(id, 'highlightColor', actualHighlightColor);
    const patchedAnimation = usePatchedProp<EntranceAnimation>(id, 'animation', actualAnimation);
    const styleOverride = useStyleOverride(id);
    const easing = styleConfig.motion.entrance;

    const entranceProgress = interpolateWithEasing(
        frame,
        [actualStartAt, actualStartAt + actualAnimationDelay],
        [0, 1],
        easing
    );

    const getHighlightStyles = (): React.CSSProperties => {
        switch (highlightStyle) {
            case 'marker':
                return {
                    position: 'relative',
                    zIndex: 1,
                    background: `${patchedHighlightColor}88`,
                    padding: '2px 4px',
                    margin: '0 4px',
                    display: 'inline-block',
                };

            case 'underline':
                return {
                    position: 'relative',
                    borderBottom: `3px solid ${patchedHighlightColor}`,
                    paddingBottom: '2px',
                    margin: '0 4px',
                    display: 'inline-block',
                };

            case 'box':
                return {
                    position: 'relative',
                    border: `2px solid ${patchedHighlightColor}`,
                    borderRadius: '4px',
                    padding: '2px 6px',
                    margin: '0 4px',
                    display: 'inline-block',
                };

            case 'glow':
                return {
                    position: 'relative',
                    textShadow: `0 0 20px ${patchedHighlightColor}`,
                    color: patchedHighlightColor,
                    margin: '0 4px',
                    display: 'inline-block',
                };

            case 'background':
                return {
                    position: 'relative',
                    backgroundColor: patchedHighlightColor,
                    color: '#000',
                    padding: '2px 6px',
                    margin: '0 4px',
                    borderRadius: '4px',
                    display: 'inline-block',
                };

            default:
                return {
                    margin: '0 4px',
                    display: 'inline-block',
                };
        }
    };

    const typographyStyle = resolveTypography(patchedVariant, styleConfig, theme, preset);

    return (
        <span
            id={id}
            className={className}
            style={{
                ...typographyStyle,
                opacity: entranceProgress,
                transform: getEntranceTransform(patchedAnimation, entranceProgress),
                display: 'inline-block',
                ...style,
                ...styleOverride,
            }}
        >
            <span style={{ marginRight: '0.25em' }}>{startText}</span>
            <span style={getHighlightStyles()}>
                <Counter
                    from={actualFrom}
                    to={to}
                    format={format}
                    variant={patchedVariant}
                    startAt={actualStartAt + actualAnimationDelay}
                    style={getHighlightStyles()}
                    durationInFrames={actualDurationInFrames}
                />
            </span>
            <span style={{ marginLeft: '0.25em' }}>{endText}</span>
        </span>
    );
};

// ============================================================================
// Schema & Duration Calculation
// ============================================================================

export const AnimatedNumberSchema = z.object({
    startText: z.string().min(1, "startText is required"),
    endText: z.string().min(1, "endText is required"),
    from: z.number().default(0),
    to: z.number(),
    format: z.string().optional(),
    variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).optional(),
    highlightStyle: z.enum(['marker', 'underline', 'box', 'glow', 'background']).optional(),
    highlightColor: z.string().optional(),
    animation: z.enum(ENTRANCE_ANIMATIONS).optional(),
    animationDelay: z.number().min(0, "animationDelay cannot be negative").default(DEFAULT_ENTRANCE_DURATION).optional(),
    durationInFrames: z.number().min(1, "durationInFrames must be positive").optional(),
    startAt: z.number().min(0, "startAt cannot be negative").default(0).optional(),
    className: z.string().optional(),
    style: z.any().optional(),
});

export function calculateAnimatedNumberDuration(props: AnimatedNumberProps): DurationResult {
    // Validate props
    const validation = AnimatedNumberSchema.safeParse(props);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return {
            success: false,
            error: firstError.message,
            field: firstError.path[0] as string,
        };
    }

    const validated = validation.data;
    
    // Additional business logic validation
    if (validated.to === validated.from) {
        return {
            success: false,
            error: "to and from cannot be the same value",
            field: "to",
        };
    }

    // Calculate duration
    const entranceDuration = validated.animationDelay ?? DEFAULT_ENTRANCE_DURATION;
    const range = Math.abs(validated.to - validated.from);
    
    // Counter duration: logarithmic scale based on number range
    const counterDuration = validated.durationInFrames ?? 
        Math.max(DEFAULT_COUNTER_MIN_DURATION, Math.min(DEFAULT_COUNTER_MAX_DURATION, Math.log10(range + 1) * 20));
    
    return {
        success: true,
        duration: Math.ceil(entranceDuration + counterDuration),
    };
}

// ============================================================================
// Registry Descriptor
// ============================================================================

export const AnimatedNumberDescriptor: ComponentRegistration = {
    name: 'AnimatedNumber',
    type: 'content',
    fullSchema: AnimatedNumberSchema,
    editorProps: ['startText', 'endText', 'from', 'to', 'highlightStyle', 'animation'],
    description: 'animated number counter with start/end text and highlight effects',
    calculateDuration: calculateAnimatedNumberDuration,
};
