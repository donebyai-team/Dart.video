import React from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { usePatchedProps, useStyleOverride } from '../../../patches';
import { useStyleContext, useAspectPreset, interpolateWithEasing } from '../../../styles';
import { useTheme } from '../../../theme';
import { resolveTypography } from '../../../tokens';
import { TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens/semantic';
import { getEntranceTransform, ENTRANCE_ANIMATIONS, HIGHLIGHT_STYLES } from '../types';
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
    const actualAnimation = props.entranceAnimation ?? DEFAULT_ANIMATION;
    const actualAnimationDelay = props.animationDelay ?? DEFAULT_ENTRANCE_DURATION;

    const styleOverride = useStyleOverride(props.id);

    const entranceProgress = interpolateWithEasing(
        frame,
        [0, actualAnimationDelay],
        [0, 1],
        'ease-out'
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


            <Text text={props.startText} id={`text-left-${props.id}`} style={
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
                    startAt={0}
                    style={getHighlightStyles()}
                    durationInFrames={DEFAULT_COUNTER_DURATION}
                />
            </span>
            <Text text={props.endText} id={`text-right-${props.id}`} style={
                {
                    // marginLeft: '0.25em',
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
    startText: z.string().default(''),
    endText: z.string().default(''),
    from: z.number().default(0),
    to: z.number(),
    format: z.string().optional(),
    variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).default(DEFAULT_VARIANT).optional(),
    highlightStyle: z.enum(HIGHLIGHT_STYLES).default(DEFAULT_HIGHLIGHT_STYLE).optional(),
    highlightColor: z.string().optional(),
    entranceAnimation: z.enum(ENTRANCE_ANIMATIONS).default(DEFAULT_ANIMATION).optional(),
    animationDelay: z.number().default(DEFAULT_ENTRANCE_DURATION).optional(),
    className: z.string().optional(),
    style: z.any().optional(),
});

// ============================================================================
// Registry Descriptor
// ============================================================================

export const AnimatedNumberDescriptor: ComponentRegistration = {
    name: 'AnimatedNumber',
    type: 'content',
    fullSchema: AnimatedNumberSchema,
    description: 'Counting metric with label text. Use for stats and KPIs',
    celExpression: 'ceil(props.animationDelay + max(45, min(100, log10(abs(props.to - props.from) + 1) * 20)))',
};
