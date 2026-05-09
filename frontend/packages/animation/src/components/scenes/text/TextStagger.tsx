import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { TypographyVariant } from '../../../tokens/semantic';
import { useElement } from '../../../patches';
import {
    resolveAnimationPreset,
    type AnimationPresetName,
} from '../../../core/animation_preset/AnimationPreset';
import { type SplitByMode } from '../types';
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
    text: '',
    variant: 'headingLg' as TypographyVariant,
    staggerDelay: 5,
    entranceAnimation: 'scaleIn' as AnimationPresetName,
    duration: 15,
    exitAnimation: 'none' as AnimationPresetName,
    exitDuration: 15,
    splitBy: 'line' as SplitByMode,
    className: undefined as string | undefined,
    style: undefined as React.CSSProperties | undefined,
};

export type TextStaggerProps = Partial<typeof TextStaggerDefaults>

const renderUnit = (unit: string) => {
  if (unit === ' ') return '\u00A0';
  if (unit === '\n') return <br />;
  return unit;
};

export const TextStagger: React.FC<TextStaggerProps> = (initProps) => {

    const frame = useCurrentFrame();
    const defaultProps = { ...TextStaggerDefaults, ...initProps };
    const el = useElement(defaultProps.id, defaultProps);
    const {props} = el;

    // Apply defaults (split-mode-aware)
    // const actualVariant = props.variant;
    const actualAnimation = props.entranceAnimation;
    const actualExitAnimation = props.exitAnimation;
    const actualStartAt = props.startAt;
    const splitBy = props.splitBy;
    const modeDefaults = getSplitModeDefaults(splitBy);
    const actualStaggerDelay = props.staggerDelay ?? modeDefaults.staggerDelay;
    const actualDuration = props.duration ?? modeDefaults.duration;
    const actualExitDuration = props.exitDuration ?? actualDuration;


    // const styleOverride = useStyleOverride(id);
    // const dragStyle = usePatchedDragStyle(id, props.style?.transform);
    // const typographyStyle = resolveTypography(actualVariant, styleConfig, theme, preset);

    const units = splitBy === 'char'
        ? props.text.split('')
        : splitBy === 'line'
            ? props.text.split('\n')
            : props.text.trim().split(/\s+/).filter(Boolean);

    const lastUnitIndex = Math.max(0, units.length - 1);
    const exitBaseStartAt =
        actualStartAt + lastUnitIndex * actualStaggerDelay + actualDuration;
    const exitMotion = resolveAnimationPreset({
        frame,
        startAt: exitBaseStartAt,
        duration: actualExitDuration,
        presetName: actualExitAnimation,
        mode: 'exit',
    });

    const getAnimationStyles = (unitIndex: number): React.CSSProperties => {
        const enterStartAt = actualStartAt + unitIndex * actualStaggerDelay;
        const entranceMotion = resolveAnimationPreset({
            frame,
            startAt: enterStartAt,
            duration: actualDuration,
            presetName: actualAnimation,
        });

        return {
            opacity: entranceMotion.opacity,
            transform: entranceMotion.transform,
        };
    };

    return (
        <span
            id={el.id}
            className={props.className}
            style={{
                display: 'block',
                whiteSpace: splitBy === 'line' ? 'pre-line' : 'normal',
                textAlign: 'center',
                opacity: exitMotion.opacity,
                transform: exitMotion.transform,
                ...el.style,
                ...el.containerStyle
            }}
        >
            {units.map((unit, index) => (
                <span
                    key={index}
                    style={{
                        display: splitBy === 'line' ? 'block' : 'inline-block',
                        marginRight: splitBy === 'word' && index < units.length - 1 ? '0.25em' : 0,
                        whiteSpace: splitBy === 'word' ? 'nowrap' : undefined,
                        ...getAnimationStyles(index),
                    }}
                >
                    {renderUnit(unit)}
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
        "map": "props.variant",
        "default": TextStaggerDefaults.variant
    },
    {
        "name": "staggerDelay",
        "type": "number",
        "map": "props.staggerDelay",
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
        "map": "props.duration",
        "default": TextStaggerDefaults.duration
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
        "default": TextStaggerDefaults.exitDuration
    },
    {
        "name": "splitBy",
        "type": "enum",
        "map": "props.splitBy",
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
    celExpression: `max(0, segmentCount(props.textstagger.text, props.textstagger.splitBy) - 1) * props.textstagger.staggerDelay + props.textstagger.duration + (props.textstagger.exitAnimation != "none" ? props.textstagger.exitDuration : 0)`
};
