import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { usePatchedProp, useStyleOverride } from '../../patches';
import { useStyleContext, useAspectPreset } from '../../styles';
import { useTheme } from '../../theme';
import { resolveTypography, TypographyVariant } from '../../tokens';

export interface TextHighlightProps {
    id?: string;
    text: string;
    variant?: TypographyVariant;
    highlightPattern?: RegExp | string; // Pattern to match for highlighting
    highlightStyle?: 'marker' | 'underline' | 'box' | 'glow' | 'background';
    highlightColor?: string;
    animationDelay?: number;
    durationInFrames?: number;
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
    highlightColor = '#ffeb3b',
    animationDelay = 30,
    durationInFrames = 20,
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
    const styleOverride = useStyleOverride(id);

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
        const highlightStartAt = startAt + animationDelay + index * 10;
        const progress = interpolate(
            frame,
            [highlightStartAt, highlightStartAt + durationInFrames],
            [0, 1],
            {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
            }
        );

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
                };

            case 'underline':
                return {
                    position: 'relative',
                    borderBottom: `3px solid ${patchedHighlightColor}`,
                    borderBottomWidth: `${progress * 3}px`,
                    paddingBottom: '2px',
                };

            case 'box':
                return {
                    position: 'relative',
                    border: `2px solid ${patchedHighlightColor}`,
                    borderRadius: '4px',
                    padding: '2px 6px',
                    margin: '0 2px',
                    opacity: progress,
                };

            case 'glow':
                return {
                    position: 'relative',
                    textShadow: `0 0 ${progress * 20}px ${patchedHighlightColor}`,
                    color: progress > 0.5 ? patchedHighlightColor : 'inherit',
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
                };

            default:
                return {};
        }
    };

    return (
        <span id={id} className={className} style={
            {
                ...resolveTypography(patchedVariant, styleConfig, theme, preset),
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