import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { usePatchedDragStyle, usePatchedProps, useStyleOverride } from '../../../patches';
import { interpolateWithEasing } from '../../../styles';
import { useTheme } from '../../../theme';
import type { TypographyVariant } from '../../../tokens';
import { Text } from '../../../core/assets/Text';
import {
    getEntranceTransform,
    HighlightedTextAnimation,
    type EntranceAnimation,
    type HighlightStyle,
} from '../types';
import type { ComponentRegistration } from '../../../registry/registry';

export const TextHighlightDefaults = {
    id: 'texthighlight',
    text: 'We build amazing {software}',
    variant: 'heading' as TypographyVariant,
    highlightStyle: 'glow' as HighlightStyle,
    highlightedTextAnimation: 'jump' as HighlightedTextAnimation,
    highlightColor: '',
    entranceAnimation: 'slideUp' as EntranceAnimation,
    animationDelay: 30,
    zoomDuration: 30,
    className: undefined as string | undefined,
    style: undefined as React.CSSProperties | undefined,
};

export type TextHighlightProps = Partial<typeof TextHighlightDefaults>;

export const TextHighlight: React.FC<TextHighlightProps> = (initProps) => {
    const frame = useCurrentFrame();
    const theme = useTheme();

    const defaultProps = { ...TextHighlightDefaults, ...initProps };
    const id = defaultProps.id;
    const props = usePatchedProps(id, defaultProps);

    // Apply defaults
    const actualVariant = props.variant;
    const actualHighlightStyle = props.highlightStyle;
    const actualHighlightedTextAnimation = props.highlightedTextAnimation;
    const actualHighlightColor = props.highlightColor || theme.colors.primary;
    const actualAnimation = props.entranceAnimation;
    const actualAnimationDelay = props.animationDelay;
    const actualZoomDuration = props.zoomDuration;
    const styleOverride = useStyleOverride(initProps.id);
    const dragStyle = usePatchedDragStyle(initProps.id, props.style?.transform);

    // Animation timeline:
    // Phase 1: Entrance animation with highlight already visible (0 to animationDelay)
    // Phase 2: Highlighted text animation (animationDelay to animationDelay + zoomDuration)
    // Phase 3: Text remains visible after animation completes

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

    const jumpHeight = interpolateWithEasing(
        frame,
        [zoomStartFrame, zoomStartFrame + actualZoomDuration / 2],
        [0, -18],
        'ease-out'
    );
    const landingHeight = interpolateWithEasing(
        frame,
        [zoomStartFrame + actualZoomDuration / 2, zoomStartFrame + actualZoomDuration],
        [-18, 0],
        'ease-in-out'
    );

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

        const baseTransform =
            actualHighlightedTextAnimation === 'jump'
                ? `translateY(${frame < zoomStartFrame + actualZoomDuration / 2 ? jumpHeight : landingHeight}px)`
                : `scale(${1 + zoomProgress * 9})`;

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
                ...dragStyle,
            }}
        >
            {segments.map((segment, i) => (
                <Text
                    key={i}
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

export const TextHighlightSchemaFields = [
    {
        "name": "text",
        "type": "string",
        
        "map": "props.text"
    },
    {
        "name": "variant",
        "type": "string",
        "subtype": "enum",
        "default": TextHighlightDefaults.variant
    },
    {
        "name": "entranceAnimation",
        "type": "string",
        "subtype": "enum",
        "default": TextHighlightDefaults.entranceAnimation
    },
    {
        "name": "animationDelay",
        "type": "number",
        "default": TextHighlightDefaults.animationDelay
    },
    {
        "name": "zoomDuration",
        "type": "number",
        "default": TextHighlightDefaults.zoomDuration
    },
    {
        "name": "highlightStyle",
        "type": "string",
        "subtype": "enum",
        "default": TextHighlightDefaults.highlightStyle
    },
    {
        "name": "highlightedTextAnimation",
        "type": "string",
        "subtype": "enum",
        "default": TextHighlightDefaults.highlightedTextAnimation
    },
    {
        "name": "highlightColor",
        "type": "string",
        "subtype": "color",
    }
]

export const TextHighlightDescriptor: ComponentRegistration = {
    name: 'TextHighlight',
    type: 'content',
    schema: [{
        type: 'component',
        name: 'texthighlight',
        fields: TextHighlightSchemaFields
    }],
    llmSchema: [
        {
            name: 'text',
            type: 'string',
        }
    ],
    description: 'Bold statement with an emphasized word/phrase. Use for key claims. Use {} to highlight. eg "We build amazing {software}"',
    celExpression: 'ceil(props.texthighlight.animationDelay + props.texthighlight.zoomDuration)',
};
