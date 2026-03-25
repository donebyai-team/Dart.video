import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { usePatchedProp, useStyleOverride } from '../../../patches';
import { useStyleContext, useAspectPreset, interpolateWithEasing } from '../../../styles';
import { useTheme } from '../../../theme';
import { resolveTypography, TypographyVariant, TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens';
import { EntranceAnimation, getEntranceTransform, ENTRANCE_ANIMATIONS } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../durationTypes';

// Default constants
const DEFAULT_ENTRANCE_DURATION = 30;
const DEFAULT_ZOOM_DURATION = 20;
const DEFAULT_VARIANT = 'heading' as const;
const DEFAULT_HIGHLIGHT_STYLE = 'glow' as const;
const DEFAULT_ANIMATION = 'slideUp' as const;

export interface TextHighlightProps {
    id?: string;
    text: string;
    variant?: TypographyVariant;
    highlightPattern?: RegExp | string; // Pattern to match for highlighting
    highlightStyle?: 'marker' | 'underline' | 'box' | 'glow' | 'background';
    highlightColor?: string;
    animation?: EntranceAnimation;
    animationDelay?: number;
    /** Duration for the zoom out phase in frames */
    zoomDuration?: number;
    startAt?: number;
    className?: string;
    style?: React.CSSProperties;
}

export const TextHighlight: React.FC<TextHighlightProps> = ({
    id,
    text,
    variant,
    highlightPattern,
    highlightStyle,
    highlightColor,
    animation,
    animationDelay,
    zoomDuration,
    startAt,
    className,
    style,
}) => {
    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();

    // Apply defaults
    const actualVariant = variant ?? DEFAULT_VARIANT;
    const actualHighlightStyle = highlightStyle ?? DEFAULT_HIGHLIGHT_STYLE;
    const actualHighlightColor = highlightColor ?? theme.colors.primary;
    const actualAnimation = animation ?? DEFAULT_ANIMATION;
    const actualAnimationDelay = animationDelay ?? DEFAULT_ENTRANCE_DURATION;
    const actualZoomDuration = zoomDuration ?? DEFAULT_ZOOM_DURATION;
    const actualStartAt = startAt ?? 0;

    const patchedVariant = usePatchedProp<TypographyVariant>(id, 'variant', actualVariant);
    const patchedHighlightColor = usePatchedProp<string>(id, 'highlightColor', actualHighlightColor);
    const patchedAnimation = usePatchedProp<EntranceAnimation>(id, 'animation', actualAnimation);
    const styleOverride = useStyleOverride(id);
    const easing = styleConfig.motion.entrance;

    // Animation timeline:
    // Phase 1: Entrance animation with highlight already visible (0 to animationDelay)
    // Phase 2: Zoom out highlighted word (animationDelay to animationDelay + zoomDuration)
    // Phase 3: Entire text disappears after zoom completes

    const entranceProgress = interpolateWithEasing(
        frame,
        [actualStartAt, actualStartAt + actualAnimationDelay],
        [0, 1],
        easing
    );

    const zoomStartFrame = actualStartAt + actualAnimationDelay;
    const zoomProgress = interpolateWithEasing(
        frame,
        [zoomStartFrame, zoomStartFrame + actualZoomDuration],
        [0, 1],
        easing
    );

    // Disappear immediately after zoom completes
    const disappearFrame = zoomStartFrame + actualZoomDuration;
    const isVisible = frame < disappearFrame;

    const segments = useMemo(() => {
        const parts: { text: string; highlight: boolean; index: number }[] = [];
        let lastIndex = 0;
        let highlightIndex = 0;

        // If no highlightPattern provided, check for {curly brace} pattern in text
        const effectivePattern = highlightPattern ?? /\{([^}]+)\}/g;

        if (typeof effectivePattern === 'string') {
            // Simple string matching
            const index = text.indexOf(effectivePattern);
            if (index !== -1) {
                if (index > 0) {
                    parts.push({ text: text.slice(0, index), highlight: false, index: 0 });
                }
                parts.push({ text: effectivePattern, highlight: true, index: 0 });
                if (index + effectivePattern.length < text.length) {
                    parts.push({
                        text: text.slice(index + effectivePattern.length),
                        highlight: false,
                        index: 0
                    });
                }
            } else {
                parts.push({ text, highlight: false, index: 0 });
            }
        } else {
            // Regex matching
            const regex = new RegExp(effectivePattern);
            let match;

            while ((match = regex.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    parts.push({
                        text: text.slice(lastIndex, match.index),
                        highlight: false,
                        index: 0,
                    });
                }

                // If using capture groups (like {text}), use the captured group
                const highlightText = match[1] || match[0];
                parts.push({
                    text: highlightText,
                    highlight: true,
                    index: highlightIndex++,
                });

                lastIndex = match.index + match[0].length;
            }

            if (lastIndex < text.length) {
                parts.push({
                    text: text.slice(lastIndex),
                    highlight: false,
                    index: 0,
                });
            }

            // If no matches, return entire text
            if (parts.length === 0) {
                parts.push({ text, highlight: false, index: 0 });
            }
        }

        return parts;
    }, [text, highlightPattern]);

    const getHighlightStyles = (index: number): React.CSSProperties => {
        // Highlight is always at full intensity (no animation delay)
        const progress = 1;

        // Calculate zoom scale for highlighted words - dramatic expansion to fill screen
        const zoomScale = 1 + zoomProgress * 9; // Scales from 1 to 10x for full screen effect
        const baseTransform = `scale(${zoomScale})`;

        switch (actualHighlightStyle) {
            case 'marker':
                return {
                    position: 'relative',
                    zIndex: 1,
                    background: `linear-gradient(
            to right,
            transparent 0%,
            ${patchedHighlightColor}88 ${progress * 100}%,
            ${patchedHighlightColor}88 100%
          )`,
                    padding: '2px 4px',
                    margin: '0 -4px',
                    transform: baseTransform,
                    display: 'inline-block',
                };

            case 'underline':
                return {
                    position: 'relative',
                    borderBottom: `3px solid ${patchedHighlightColor}`,
                    borderBottomWidth: `${progress * 3}px`,
                    paddingBottom: '2px',
                    transform: baseTransform,
                    display: 'inline-block',
                };

            case 'box':
                return {
                    position: 'relative',
                    border: `2px solid ${patchedHighlightColor}`,
                    borderRadius: '4px',
                    padding: '2px 6px',
                    margin: '0 2px',
                    opacity: progress,
                    transform: baseTransform,
                    display: 'inline-block',
                };

            case 'glow':
                return {
                    position: 'relative',
                    textShadow: `0 0 ${progress * 20}px ${patchedHighlightColor}`,
                    color: progress > 0.5 ? patchedHighlightColor : 'inherit',
                    transform: baseTransform,
                    display: 'inline-block',
                };

            case 'background':
                return {
                    position: 'relative',
                    backgroundColor: patchedHighlightColor,
                    color: progress > 0.5 ? '#000' : 'inherit',
                    padding: '2px 6px',
                    margin: '0 2px',
                    borderRadius: '4px',
                    opacity: progress,
                    transform: baseTransform,
                    display: 'inline-block',
                };

            default:
                return {};
        }
    };

    if (!isVisible) {
        return null;
    }

    return (
        <span id={id} className={className} style={{
                ...resolveTypography(patchedVariant, styleConfig, theme, preset),
                opacity: entranceProgress,
                transform: getEntranceTransform(patchedAnimation, entranceProgress, 200),
                display: 'inline-block',
                ...style,
                ...styleOverride
            }
        }>
            {segments.map((segment, i) => (
                <span
                    key={i}
                    style={
                        segment.highlight
                            ? getHighlightStyles(segment.index)
                            : {}
                    }
                >
                    {segment.text}
                </span>
            ))}
        </span>
    );
};

// ============================================================================
// Schema & Duration Calculation
// ============================================================================

export const TextHighlightSchema = z.object({
    text: z.string().min(1, "text is required"),
    variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).default(DEFAULT_VARIANT).optional(),
    highlightPattern: z.union([z.string(), z.instanceof(RegExp)]).optional(),
    highlightStyle: z.enum(['marker', 'underline', 'box', 'glow', 'background']).default(DEFAULT_HIGHLIGHT_STYLE).optional(),
    highlightColor: z.string().optional(),
    animation: z.enum(ENTRANCE_ANIMATIONS).default(DEFAULT_ANIMATION).optional(),
    animationDelay: z.number().min(0, "animationDelay cannot be negative").default(DEFAULT_ENTRANCE_DURATION).optional(),
    zoomDuration: z.number().min(0, "zoomDuration cannot be negative").default(DEFAULT_ZOOM_DURATION).optional(),
    startAt: z.number().min(0, "startAt cannot be negative").default(0).optional(),
    className: z.string().optional(),
    style: z.any().optional(),
});

export function calculateTextHighlightDuration(props: TextHighlightProps): DurationResult {
    // Validate props
    const validation = TextHighlightSchema.safeParse(props);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return {
            success: false,
            error: firstError.message,
            field: firstError.path[0] as string,
        };
    }

    const validated = validation.data;
    
    // Fixed duration: entrance + zoom + disappear
    const entranceDuration = validated.animationDelay ?? DEFAULT_ENTRANCE_DURATION;
    const zoomDuration = validated.zoomDuration ?? DEFAULT_ZOOM_DURATION;
    
    return {
        success: true,
        duration: Math.ceil(entranceDuration + zoomDuration),
    };
}

// ============================================================================
// Registry Descriptor
// ============================================================================

export const TextHighlightDescriptor: ComponentRegistration = {
    name: 'TextHighlight',
    type: 'scene',
    fullSchema: TextHighlightSchema,
    editorProps: ['text', 'highlightStyle', 'animation', 'animationDelay', 'zoomDuration'],
    description: 'Displays text with highlighted portions that zoom/pulse for emphasis. Use to draw attention to key words or phrases. Required props: text="Increase revenue by 300%", highlightPattern="300%". The pattern can be a word or phrase to highlight within the text.',
    calculateDuration: calculateTextHighlightDuration,
};