import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { TypographyVariant } from '../../../tokens/semantic';
import { useStyleContext } from '../../../styles/StyleContext';
import { usePatchedDragStyle, usePatchedProps, useStyleOverride } from '../../../patches';
import { interpolateWithEasing, useAspectPreset } from '../../../styles';
import { useTheme } from '../../../theme';
import { resolveTypography } from '../../../tokens';
import {
    getEntranceTransform,
    type EntranceAnimation,
    type SplitByMode,
} from '../types';
import type { ComponentRegistration } from '../../../registry/registry';
function getSplitModeDefaults(splitBy: SplitByMode) {
    switch (splitBy) {
        case 'char':
            return { staggerDelay: 2, duration: 8 };
        case 'line':
            return { staggerDelay: 10, duration: 20 };
        case 'word':
        default:
            return {
                staggerDelay: TextStaggerDefaults.staggerDelay,
                duration: TextStaggerDefaults.duration,
            };
    }
}

export const TextStaggerDefaults = {
    id: 'textstagger',
    startAt: 0,
    text: 'Sample text',
    variant: 'heading' as TypographyVariant,
    staggerDelay: 5,
    entranceAnimation: 'scaleIn' as EntranceAnimation,
    duration: 15,
    splitBy: 'word' as SplitByMode,
    className: undefined as string | undefined,
    style: undefined as React.CSSProperties | undefined,
};

export type TextStaggerProps = Partial<typeof TextStaggerDefaults>

export const TextStagger: React.FC<TextStaggerProps> = (initProps) => {

    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();
    const defaultProps = { ...TextStaggerDefaults, ...initProps };
    const id = defaultProps.id;

    const props = usePatchedProps(id, defaultProps);


    // Apply defaults (split-mode-aware)
    const actualVariant = props.variant;
    const actualAnimation = props.entranceAnimation;
    const actualStartAt = props.startAt;
    const splitBy = props.splitBy;
    const modeDefaults = getSplitModeDefaults(splitBy);
    const actualStaggerDelay = props.staggerDelay ?? modeDefaults.staggerDelay;
    const actualDuration = props.duration ?? modeDefaults.duration;


    const styleOverride = useStyleOverride(id);
    const dragStyle = usePatchedDragStyle(id, props.style?.transform);

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
        <span
            id={id}
            className={props.className}
            style={{
                display: 'inline-block',
                ...props.style,
                ...dragStyle,
            }}
        >
            {units.map((unit, index) => (
                <span
                    key={index}
                    style={{
                        display: 'inline-block',
                        marginRight: splitBy === 'word' && index < units.length - 1 ? '0.25em' : 0,
                        ...getAnimationStyles(index),
                        ...resolveTypography(actualVariant, styleConfig, theme, preset),
                        ...props.style,
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
// Registry Descriptor
// ============================================================================

export const TextStaggerSchemaFields = [
    {
        "name": "text",
        "type": "string",
        
        "map": "props.text"
    },
    {
        "name": "variant",
        "type": "string",
        "subtype": "enum",
        "default": TextStaggerDefaults.variant
    },
    {
        "name": "staggerDelay",
        "type": "number",
        "default": TextStaggerDefaults.staggerDelay
    },
    {
        "name": "entranceAnimation",
        "type": "string",
        "subtype": "enum",
        "default": TextStaggerDefaults.entranceAnimation
    },
    {
        "name": "duration",
        "type": "number",
        "default": TextStaggerDefaults.duration
    },
    {
        "name": "splitBy",
        "type": "string",
        "subtype": "enum",
        "default": TextStaggerDefaults.splitBy
    }
]

export const TextStaggerDescriptor: ComponentRegistration = {
    name: 'TextStagger',
    type: 'content',
    schema: [{
        type: 'component',
        name: 'textstagger',
        fields: TextStaggerSchemaFields
    }],
    llmSchema: [
        {
            name: 'text',
            type: 'string',     
        }
    ],
    description: 'Reveals text word-by-word with staggered animation delays. Use for multi-word headlines or body text',
    celExpression: `(segmentCount(props.textstagger.text, props.textstagger.splitBy) - 1) * props.textstagger.staggerDelay + props.textstagger.duration`
};
