import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { usePatchedProps, useStyleOverride } from '../../../patches';
import { interpolateWithEasing } from '../../../styles';
import { useTheme } from '../../../theme';
import { TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens';
import { Text } from '../../../core/text/Text';
import { getEntranceTransform, ENTRANCE_ANIMATIONS, HIGHLIGHT_STYLES } from '../types';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../durationTypes';

// Default constants
const DEFAULT_ENTRANCE_DURATION = 30;
const DEFAULT_ZOOM_DURATION = 20;
const DEFAULT_VARIANT = 'heading' as const;
const DEFAULT_HIGHLIGHT_STYLE = 'glow' as const;
const DEFAULT_ANIMATION = 'slideUp' as const;

export const TextHighlightSchema = z.object({
    id: z.string().optional(),
    text: z.string().default(''),
    variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).default(DEFAULT_VARIANT).optional(),
    highlightStyle: z.enum(HIGHLIGHT_STYLES).default(DEFAULT_HIGHLIGHT_STYLE).optional(),
    highlightColor: z.string().optional(),
    entranceAnimation: z.enum(ENTRANCE_ANIMATIONS).default(DEFAULT_ANIMATION).optional(),
    animationDelay: z.number().default(DEFAULT_ENTRANCE_DURATION).optional(),
    zoomDuration: z.number().default(DEFAULT_ZOOM_DURATION).optional(),
    className: z.string().optional(),
    style: z.any().optional(),
});

// Use z.input for props (what callers pass) - fields with defaults are optional
export type TextHighlightProps = z.input<typeof TextHighlightSchema>;

export const TextHighlight: React.FC<TextHighlightProps> = (propsInit: TextHighlightProps) => {
    const frame = useCurrentFrame();
    const theme = useTheme();

    const patchedProps = usePatchedProps(propsInit.id, propsInit);
    const props = { ...TextHighlightSchema.parse(patchedProps), id: propsInit.id };

    // Apply defaults
    const actualVariant = props.variant ?? DEFAULT_VARIANT;
    const actualHighlightStyle = props.highlightStyle ?? DEFAULT_HIGHLIGHT_STYLE;
    const actualHighlightColor = props.highlightColor ?? theme.colors.primary;
    const actualAnimation = props.entranceAnimation ?? DEFAULT_ANIMATION;
    const actualAnimationDelay = props.animationDelay ?? DEFAULT_ENTRANCE_DURATION;
    const actualZoomDuration = props.zoomDuration ?? DEFAULT_ZOOM_DURATION;
    const styleOverride = useStyleOverride(props.id);

    // Animation timeline:
    // Phase 1: Entrance animation with highlight already visible (0 to animationDelay)
    // Phase 2: Zoom out highlighted word (animationDelay to animationDelay + zoomDuration)
    // Phase 3: Entire text disappears after zoom completes

    const entranceProgress = interpolateWithEasing(
        frame,
        [0, actualAnimationDelay],
        [0, 1],
        'ease-out'
    );

    const zoomStartFrame = actualAnimationDelay;
    const zoomProgress = interpolateWithEasing(
        frame,
        [zoomStartFrame, zoomStartFrame + actualZoomDuration],
        [0, 1],
        'ease-out'
    );

    // Disappear immediately after zoom completes
    const disappearFrame = zoomStartFrame + actualZoomDuration;
    const isVisible = frame < disappearFrame;

    const segments = useMemo(() => {
        const parts: { text: string; highlight: boolean; index: number }[] = [];
        let lastIndex = 0;
        let highlightIndex = 0;

        const text = props.text;

        while (true) {
            const start = text.indexOf("{", lastIndex);
            if (start === -1) break;

            const end = text.indexOf("}", start);
            if (end === -1) break;

            // normal text before highlight
            if (start > lastIndex) {
                parts.push({
                    text: text.slice(lastIndex, start),
                    highlight: false,
                    index: 0,
                });
            }

            // highlighted text
            parts.push({
                text: text.slice(start + 1, end),
                highlight: true,
                index: highlightIndex++,
            });

            lastIndex = end + 1;
        }

        // remaining text
        if (lastIndex < text.length) {
            parts.push({
                text: text.slice(lastIndex),
                highlight: false,
                index: 0,
            });
        }

        if (parts.length === 0) {
            parts.push({ text, highlight: false, index: 0 });
        }

        return parts;
    }, [props.text]);

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
            ${actualHighlightColor}88 ${progress * 100}%,
            ${actualHighlightColor}88 100%
          )`,
                    padding: '2px 4px',
                    margin: '0 -4px',
                    transform: baseTransform,
                    display: 'inline-block',
                };

            case 'underline':
                return {
                    position: 'relative',
                    borderBottom: `3px solid ${actualHighlightColor}`,
                    borderBottomWidth: `${progress * 3}px`,
                    paddingBottom: '2px',
                    transform: baseTransform,
                    display: 'inline-block',
                };

            case 'box':
                return {
                    position: 'relative',
                    border: `2px solid ${actualHighlightColor}`,
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
                    textShadow: `0 0 ${progress * 20}px ${actualHighlightColor}`,
                    color: progress > 0.5 ? actualHighlightColor : 'inherit',
                    transform: baseTransform,
                    display: 'inline-block',
                };

            case 'background':
                return {
                    position: 'relative',
                    backgroundColor: actualHighlightColor,
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
        <span
            id={props.id}
            className={props.className}
            style={{
                display: 'inline-block',
                opacity: entranceProgress,
                transform: getEntranceTransform(actualAnimation, entranceProgress, 200),
                ...props.style,
                ...styleOverride,
            }}
        >
            {segments.map((segment, i) => (
                <Text
                    key={i}
                    id={`text-${i}-${props.id}`}
                    text={segment.text}
                    variant={actualVariant}
                    style={{
                        whiteSpace: 'pre-wrap',
                        ...(segment.highlight ? getHighlightStyles(segment.index) : {}),
                    }}
                />
            ))}
        </span>
    );
};

// ============================================================================
// Duration Calculation
// ============================================================================

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
    type: 'content',
    fullSchema: TextHighlightSchema,
    description: 'Bold statement with an emphasized word/phrase. Use for key claims. Use {} to highlight. eg "We build amazing {software}"',
    calculateDuration: calculateTextHighlightDuration,
};
