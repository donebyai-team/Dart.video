import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { TypographyVariant } from '../../../tokens/semantic';
import { useElement } from '../../../patches';
import { interpolateWithEasing } from '../../../styles';
import { useTypography } from '../../../tokens';
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
    variant: 'display' as TypographyVariant,
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
    const id = initProps.id ?? TextStaggerDefaults.id;
    const { props, style } = useElement(id, TextStaggerDefaults, initProps, {
        baseStyle: {
            display: 'inline-block',
        },
    });


    // Apply defaults (split-mode-aware)
    const actualVariant = props.variant;
    const typographyStyle = useTypography(actualVariant);
    const actualAnimation = props.entranceAnimation;
    const actualStartAt = props.startAt;
    const splitBy = props.splitBy;
    const modeDefaults = getSplitModeDefaults(splitBy);
    const actualStaggerDelay = props.staggerDelay ?? modeDefaults.staggerDelay;
    const actualDuration = props.duration ?? modeDefaults.duration;


    const { transform: _unitTransform, ...unitStyle } = props.style ?? {};

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
            style={style}
        >
            {units.map((unit, index) => (
                <span
                    key={index}
                    style={{
                        display: 'inline-block',
                        marginRight: splitBy === 'word' && index < units.length - 1 ? '0.25em' : 0,
                        ...getAnimationStyles(index),
                        ...typographyStyle,
                        ...unitStyle,
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
        "datatype": "text",
        "map": "props.text"
    },
    {
        "name": "variant",
        "type": "enum",
        "default": TextStaggerDefaults.variant
    },
    {
        "name": "staggerDelay",
        "type": "number",
        "default": TextStaggerDefaults.staggerDelay
    },
    {
        "name": "entranceAnimation",
        "type": "enum",
        "map": "props.entranceAnimation",
        "default": TextStaggerDefaults.entranceAnimation
    },
    {
        "name": "duration",
        "type": "number",
        "default": TextStaggerDefaults.duration
    },
    {
        "name": "splitBy",
        "type": "enum",
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
        },
        {
            name: 'entranceAnimation',
            type: 'enum',
            required: false,
            default: TextStaggerDefaults.entranceAnimation,
        }
    ],
    description: 'Reveals a word or full text phrase word-by-word. Works for both single word and multi-word headlines or body text.',
    celExpression: `(segmentCount(props.textstagger.text, props.textstagger.splitBy) * props.textstagger.staggerDelay) + props.textstagger.duration`
};
