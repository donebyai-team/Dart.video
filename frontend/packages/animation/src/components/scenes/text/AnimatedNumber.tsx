import React from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { usePatchedProp, usePatchedProps, useStyleOverride } from '../../../patches';
import { useStyleContext, useAspectPreset, interpolateWithEasing } from '../../../styles';
import { useTheme } from '../../../theme';
import { resolveTypography, TypographyVariant } from '../../../tokens';
import { TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens/semantic';
import { EntranceAnimation, getEntranceTransform, ENTRANCE_ANIMATIONS } from '../types';
import { Counter } from './Counter';
import { Text } from '../../../core/text/Text';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../durationTypes';

// Default constants
const DEFAULT_ENTRANCE_DURATION = 30;
const DEFAULT_COUNTER_MIN_DURATION = 45;
const DEFAULT_COUNTER_MAX_DURATION = 100;
const DEFAULT_COUNTER_DURATION = 45;
const DEFAULT_VARIANT = 'heading' as const;
const DEFAULT_HIGHLIGHT_STYLE = 'glow' as const;
const DEFAULT_ANIMATION = 'slideUp' as const;

// Use z.input for props (what callers pass) - fields with defaults are optional
export type AnimatedNumberProps = z.input<typeof AnimatedNumberSchema>;

export const AnimatedNumber: React.FC<AnimatedNumberProps> = (propsInit: AnimatedNumberProps) => {
    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();

    const patchedProps = usePatchedProps(propsInit.id, propsInit)
    const props = { ...AnimatedNumberSchema.parse(patchedProps), id: propsInit.id }

    // Apply defaults
    const actualVariant = props.variant ?? DEFAULT_VARIANT;
    const actualHighlightColor = props.highlightColor ?? theme.colors.primary;
    const actualAnimation = props.animation ?? DEFAULT_ANIMATION;
    const actualAnimationDelay = props.animationDelay ?? DEFAULT_ENTRANCE_DURATION;

    const styleOverride = useStyleOverride(props.id);
    const easing = styleConfig.motion.entrance;

    const entranceProgress = interpolateWithEasing(
        frame,
        [0, actualAnimationDelay],
        [0, 1],
        easing
    );

    const getHighlightStyles = (): React.CSSProperties => {
        switch (props.highlightStyle) {
            case 'marker':
                return {
                    position: 'relative',
                    zIndex: 1,
                    background: `${actualHighlightColor}88`,
                    padding: '2px 4px',
                    margin: '0 4px',
                    display: 'inline-block',
                };

            case 'underline':
                return {
                    position: 'relative',
                    borderBottom: `3px solid ${actualHighlightColor}`,
                    paddingBottom: '2px',
                    margin: '0 4px',
                    display: 'inline-block',
                };

            case 'box':
                return {
                    position: 'relative',
                    border: `2px solid ${actualHighlightColor}`,
                    borderRadius: '4px',
                    padding: '2px 6px',
                    margin: '0 4px',
                    display: 'inline-block',
                };

            case 'glow':
                return {
                    position: 'relative',
                    textShadow: `0 0 20px ${actualHighlightColor}`,
                    color: actualHighlightColor,
                    margin: '0 4px',
                    display: 'inline-block',
                };

            case 'background':
                return {
                    position: 'relative',
                    backgroundColor: actualHighlightColor,
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

    const typographyStyle = resolveTypography(actualVariant, styleConfig, theme, preset);

    return (
        <span
            id={props.id}
            className={props.className}
            style={{
                ...typographyStyle,
                opacity: entranceProgress,
                transform: getEntranceTransform(actualAnimation, entranceProgress),
                display: 'inline-block',
                ...props.style,
                ...styleOverride,
            }}
        >


            <Text text={props.startText} id={`text-right-${props.id}`} style={
                {
                    marginRight: '0.25em',
                    ...typographyStyle,
                    ...props.style,
                    ...styleOverride
                }} />

            <span style={getHighlightStyles()}>
                <Counter
                    id={`counter-${props.id}`}
                    from={props.from}
                    to={props.to}
                    format={props.format}
                    variant={actualVariant}
                    startAt={actualAnimationDelay}
                    style={getHighlightStyles()}
                    durationInFrames={DEFAULT_COUNTER_DURATION}
                />
            </span>
            <Text text={props.endText} id={`text-left-${props.id}`} style={
                {
                    marginLeft: '0.25em',
                    ...typographyStyle,
                    ...props.style,
                    ...styleOverride
                }} />
        </span>
    );
};

// ============================================================================
// Schema & Duration Calculation
// ============================================================================

export const AnimatedNumberSchema = z.object({
    id: z.string().optional(),
    startText: z.string().min(1, "startText is required"),
    endText: z.string().min(1, "endText is required"),
    from: z.number().default(0),
    to: z.number(),
    format: z.string().optional(),
    variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).default(DEFAULT_VARIANT).optional(),
    highlightStyle: z.enum(['marker', 'underline', 'box', 'glow', 'background']).default(DEFAULT_HIGHLIGHT_STYLE).optional(),
    highlightColor: z.string().optional(),
    animation: z.enum(ENTRANCE_ANIMATIONS).default(DEFAULT_ANIMATION).optional(),
    animationDelay: z.number().min(0, "animationDelay cannot be negative").default(DEFAULT_ENTRANCE_DURATION).optional(),
    durationInFrames: z.number().min(1, "durationInFrames must be positive").default(DEFAULT_COUNTER_DURATION).optional(),
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
    editorProps: ['startText', 'endText', 'from', 'to', 'format', 'variant', 'highlightStyle', 'animation'],
    description: 'Animated counter that counts from one number to another with text labels. Use for metrics, statistics, KPIs. Required props: startText="Solved", endText="incidents", to={12450}. Optional: from (default 0), format (e.g. "0,0" for thousands separator).',
    calculateDuration: calculateAnimatedNumberDuration,
};
