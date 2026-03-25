import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { usePatchedProp, useStyleOverride } from '../../../patches';
import { useStyleContext, useAspectPreset, interpolateWithEasing } from '../../../styles';
import { useTheme } from '../../../theme';
import { resolveTypography, TypographyVariant } from '../../../tokens';
import { EntranceAnimation, getEntranceTransform } from '../types';

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
    variant = 'heading',
    text,
    highlightPattern = /{([^}]+)}/g, // Default: matches {text}
    highlightStyle = 'glow',
    highlightColor,
    animation = 'slideUp',
    animationDelay = 30,
    zoomDuration = 20,
    startAt = 0,
    className,
    style,
}) => {
    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();
    if (!highlightColor) {
        highlightColor = theme.colors.primary;
    }

    const patchedVariant = usePatchedProp<TypographyVariant>(id, 'variant', variant);
    const patchedHighlightColor = usePatchedProp<string>(id, 'highlightColor', highlightColor);
    const patchedAnimation = usePatchedProp<EntranceAnimation>(id, 'animation', animation);
    const styleOverride = useStyleOverride(id);
    const easing = styleConfig.motion.entrance;

    // Animation timeline:
    // Phase 1: Entrance animation with highlight already visible (0 to animationDelay)
    // Phase 2: Zoom out highlighted word (animationDelay to animationDelay + zoomDuration)
    // Phase 3: Entire text disappears after zoom completes

    const entranceProgress = interpolateWithEasing(
        frame,
        [startAt, startAt + animationDelay],
        [0, 1],
        easing
    );

    const zoomStartFrame = startAt + animationDelay;
    const zoomProgress = interpolateWithEasing(
        frame,
        [zoomStartFrame, zoomStartFrame + zoomDuration],
        [0, 1],
        easing
    );

    // Disappear immediately after zoom completes
    const disappearFrame = zoomStartFrame + zoomDuration;
    const isVisible = frame < disappearFrame;

    const segments = useMemo(() => {
        const parts: { text: string; highlight: boolean; index: number }[] = [];
        let lastIndex = 0;
        let highlightIndex = 0;

        if (typeof highlightPattern === 'string') {
            // Simple string matching
            const index = text.indexOf(highlightPattern);
            if (index !== -1) {
                if (index > 0) {
                    parts.push({ text: text.slice(0, index), highlight: false, index: 0 });
                }
                parts.push({ text: highlightPattern, highlight: true, index: 0 });
                if (index + highlightPattern.length < text.length) {
                    parts.push({
                        text: text.slice(index + highlightPattern.length),
                        highlight: false,
                        index: 0
                    });
                }
            } else {
                parts.push({ text, highlight: false, index: 0 });
            }
        } else {
            // Regex matching
            const regex = new RegExp(highlightPattern);
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

        switch (highlightStyle) {
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