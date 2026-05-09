import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { usePatchedDragStyle, usePatchedProps, useStyleOverride } from '../../../patches';
import { interpolateWithEasing } from '../../../styles';
import { useStyleContext } from '../../../styles/StyleContext';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { useTheme } from '../../../theme';
import type { TypographyVariant } from '../../../tokens';
import { resolveTypography } from '../../../tokens/resolveTypography';
import { AnimationPresetName, resolveAnimationPreset } from '../../../core/animation_preset/AnimationPreset';
import {
    getHighlightedTextAnimationTransform,
    type HighlightedTextAnimation,
    type HighlightStyle,
} from '../types';
import type { ComponentRegistration } from '../../../registry/registry';

export const TextHighlightDefaults = {
    id: 'texthighlight',
    text: '',
    variant: 'display' as TypographyVariant,
    highlightStyle: 'simple' as HighlightStyle,
    highlightedTextAnimation: 'none' as HighlightedTextAnimation,
    highlightColor: '',
    entranceAnimation: 'slideLeft' as AnimationPresetName,
    exitAnimation: 'none' as AnimationPresetName,
    animationDelay: 15,
    animationDuration: 20,
    exitDuration: 15,
    className: undefined as string | undefined,
    style: undefined as React.CSSProperties | undefined,
};

export type TextHighlightProps = Partial<typeof TextHighlightDefaults>;

export const TextHighlight: React.FC<TextHighlightProps> = (initProps) => {
    const frame = useCurrentFrame();
    const theme = useTheme();
    const styleConfig = useStyleContext();
    const preset = useAspectPreset();

    const defaultProps = { ...TextHighlightDefaults, ...initProps };
    const id = defaultProps.id;
    const props = usePatchedProps(id, defaultProps);

    // Apply defaults
    const actualVariant = props.variant;
    const actualHighlightStyle = props.highlightStyle;
    const actualHighlightedTextAnimation = props.highlightedTextAnimation;
    const actualHighlightColor = props.highlightColor || theme.colors.primary;
    const actualAnimation = props.entranceAnimation;
    const actualExitAnimation = props.exitAnimation;
    const actualAnimationDelay = props.animationDelay;
    const actualAnimationDuration = props.animationDuration;
    const actualExitDuration = props.exitDuration ?? TextHighlightDefaults.exitDuration;
    const styleOverride = useStyleOverride(id);

    // Animation timeline:
    // Phase 1: Entrance animation with highlight already visible (0 to animationDelay)
    // Phase 2: Highlighted text animation (animationDelay to animationDelay + zoomDuration)
    // Phase 3: Text remains visible after animation completes

    const entranceMotion = resolveAnimationPreset({
        frame,
        startAt: 0,
        duration: actualAnimationDelay,
        presetName: actualAnimation,
        distance: 200,
        easing: 'ease-out',
    });
    const dragStyle = usePatchedDragStyle(id, entranceMotion.transform, props.style?.transform);

    const zoomStartFrame = actualAnimationDelay;
    const zoomProgress = interpolateWithEasing(
        frame,
        [zoomStartFrame, zoomStartFrame + actualAnimationDuration],
        [0, 1],
        'ease-out'
    );
    const exitStartFrame = actualAnimationDelay + actualAnimationDuration;
    const exitMotion = resolveAnimationPreset({
        frame,
        startAt: exitStartFrame,
        duration: actualExitDuration,
        presetName: actualExitAnimation,
        mode: 'exit',
    });

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

        const baseTransform = getHighlightedTextAnimationTransform(actualHighlightedTextAnimation, zoomProgress);

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

            case 'simple':
                return {
                    position: 'relative',
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

    const splitHighlightSegment = (text: string): Array<{ text: string; whitespace: boolean }> => {
        const parts = text.match(/\S+|\s+/g);
        if (!parts || parts.length === 0) {
            return [{ text, whitespace: /^\s+$/.test(text) }];
        }

        return parts.map((part) => ({
            text: part,
            whitespace: /^\s+$/.test(part),
        }));
    };

    return (
        <span
            id={props.id}
            className={props.className}
            style={{
                display: 'block',
                width: '100%',
                maxWidth: '100%',
                opacity: exitMotion.opacity,
                transform: exitMotion.transform,
            }}
        >
            <span
                style={{
                    display: 'inline-block',
                    width: '100%',
                    maxWidth: '100%',
                    opacity: entranceMotion.opacity,
                    ...dragStyle,
                }}
            >
                <span
                    style={{
                        ...resolveTypography(actualVariant, styleConfig, theme, preset),
                        whiteSpace: 'pre-wrap',
                        ...props.style,
                        ...styleOverride,
                    }}
                >
                    {segments.map((segment, i) => {
                        if (!segment.highlight) {
                            return <React.Fragment key={i}>{segment.text}</React.Fragment>;
                        }

                        return splitHighlightSegment(segment.text).map((part, partIndex) => {
                            if (part.whitespace) {
                                return <React.Fragment key={`${i}-${partIndex}`}>{part.text}</React.Fragment>;
                            }

                            return (
                                <span
                                    key={`${i}-${partIndex}`}
                                    style={{
                                        whiteSpace: 'pre-wrap',
                                        ...getHighlightStyles(segment.index),
                                    }}
                                >
                                    {part.text}
                                </span>
                            );
                        });
                    })}
                </span>
            </span>
        </span>
    );
};


export const TextHighlightDescriptor: ComponentRegistration = {
    name: 'TextHighlight',
    type: 'content',
    schema: [{
        type: 'component',
        name: 'texthighlight',
        fields: [
            {
                "name": "text",
                "type": "string",
                "datatype": "text",
                "map": "props.text"
            },
            {
                "name": "variant",
                "type": "enum",
                "map": "props.variant",
                "default": TextHighlightDefaults.variant
            },
            {
                "name": "entranceAnimation",
                "type": "enum",
                "map": "props.entranceAnimation",
                "default": TextHighlightDefaults.entranceAnimation
            },
            {
                "name": "animationDelay",
                "type": "number",
                "map": "props.animationDelay",
                "default": TextHighlightDefaults.animationDelay
            },
            {
                "name": "animationDuration",
                "type": "number",
                "map": "props.animationDuration",
                "default": TextHighlightDefaults.animationDuration
            },
            {
                "name": "exitAnimation",
                "type": "enum",
                "map": "props.exitAnimation",
                "default": "zoomOut"
            },
            {
                "name": "exitDuration",
                "type": "number",
                "map": "props.exitDuration",
                "default": TextHighlightDefaults.exitDuration
            },
            {
                "name": "highlightStyle",
                "type": "enum",
                "map": "props.highlightStyle",
                "default": TextHighlightDefaults.highlightStyle
            },
            {
                "name": "highlightedTextAnimation",
                "type": "enum",
                "map": "props.highlightedTextAnimation",
                "default": "jump"
            },
            {
                "name": "highlightColor",
                "type": "string",
                "datatype": "color",
                "map": "props.highlightColor",
                "default": TextHighlightDefaults.highlightColor
            }
        ]
    }],
    llmSchema: [
        {
            name: 'text',
            type: 'string',
        },
        {
            name: 'entranceAnimation',
            type: 'enum',
            required: false,
            default: TextHighlightDefaults.entranceAnimation,
        }
    ],
    description: 'Bold statement with an emphasized word/phrase. Use for key claims. Use {} to highlight. eg "We build amazing {software}"',
    celExpression: 'props.texthighlight.animationDelay + props.texthighlight.animationDuration + (props.texthighlight.exitAnimation != "none" ? props.texthighlight.exitDuration : 0)',
};
