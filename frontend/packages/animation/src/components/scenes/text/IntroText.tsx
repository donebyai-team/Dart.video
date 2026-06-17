import React from 'react';
import { useCurrentFrame } from 'remotion';
import {
    AnimatedText,
    AnimatedTextDefaults,
    type AnimatedTextProps,
} from './AnimatedText';
import { composeTransforms, useElement } from '../../../patches';
import { interpolateWithEasing } from '../../../styles';
import type { ComponentRegistration } from '../../../registry/registry';
import { SplitByMode } from '../types';
import { AnimationPresetName } from '../../../core/animation_preset';

const LABEL_HOLD_DURATION = 12;
const LABEL_SETTLE_DURATION = 34;
const BODY_START_OFFSET = LABEL_HOLD_DURATION + 8;
const BODY_REVEAL_DURATION = 18;
const BODY_WORD_STAGGER = 2;
const BODY_REVEAL_EASE_DURATION = 12;
const BODY_HOLD_DURATION = 12;
const LABEL_FINAL_TRANSLATE_Y = -74;
const LABEL_FINAL_SCALE = 0.64;
const LABEL_FINAL_OPACITY = 0.72;
const BODY_BASE_OFFSET_Y = 45;

const LABEL_TRANSITION_START = LABEL_HOLD_DURATION;
const LABEL_TRANSITION_END = LABEL_TRANSITION_START + LABEL_SETTLE_DURATION;
const MIN_DURATION = Math.max(
    LABEL_TRANSITION_END,
    BODY_START_OFFSET + BODY_REVEAL_DURATION,
) + BODY_HOLD_DURATION;

const IntroTextLabelDefaults: AnimatedTextProps = {
    ...AnimatedTextDefaults,
    id: 'animatedtext-label',
    text: 'Introducing',
    variant: 'display',
    splitBy: 'word',
    staggerDelay: 0,
    duration: 0,
};

const IntroTextBodyDefaults: AnimatedTextProps = {
    ...AnimatedTextDefaults,
    id: 'animatedtext-body',
    text: '',
    variant: 'headingLg',
    splitBy: 'word' as SplitByMode,
    entranceAnimation: 'slideLeft' as AnimationPresetName,
    staggerDelay: BODY_WORD_STAGGER,
    duration: BODY_REVEAL_DURATION,
};

const LABEL_ELEMENT_ID = 'animatedtext-label';
const BODY_ELEMENT_ID = 'animatedtext-body';

export type IntroTextProps = Record<string, never>;

export const IntroText: React.FC<IntroTextProps> = (initProps) => {
    const frame = useCurrentFrame();
    const labelEl = useElement<AnimatedTextProps>(
        LABEL_ELEMENT_ID,
        IntroTextLabelDefaults,
    );
    const bodyEl = useElement<AnimatedTextProps>(
        BODY_ELEMENT_ID,
        IntroTextBodyDefaults,
    );
    const elapsed = Math.max(0, frame);

    const labelSettleProgress = interpolateWithEasing(
        elapsed,
        [LABEL_TRANSITION_START, LABEL_TRANSITION_END],
        [0, 1],
        'ease-out-cubic',
    );
    const labelTranslateY = interpolateWithEasing(
        labelSettleProgress,
        [0, 1],
        [0, LABEL_FINAL_TRANSLATE_Y],
        'ease-out-cubic',
    );
    const labelScale = interpolateWithEasing(
        labelSettleProgress,
        [0, 1],
        [1, LABEL_FINAL_SCALE],
        'ease-out-cubic',
    );
    const labelOpacity = interpolateWithEasing(
        labelSettleProgress,
        [0, 1],
        [1, LABEL_FINAL_OPACITY],
        'ease-out',
    );
    const bodyRevealProgress = interpolateWithEasing(
        elapsed,
        [BODY_START_OFFSET, BODY_START_OFFSET + BODY_REVEAL_EASE_DURATION],
        [0, 1],
        'ease-out-cubic',
    );
    const bodyTranslateY = interpolateWithEasing(
        bodyRevealProgress,
        [0, 1],
        [18, 0],
        'ease-out-cubic',
    );

    return (
        <div
            style={{
                position: 'relative',
                display: 'block',
                width: '100%',
                minHeight: 320,
                overflow: 'visible',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: '100%',
                    opacity: labelOpacity,
                    transform: composeTransforms(
                        `translate(-50%, calc(-50% + ${labelTranslateY}px))`,
                        `scale(${labelScale})`,
                    ),
                    transformOrigin: 'center center',
                }}
            >
                <AnimatedText
                    {...labelEl.props}
                    id={LABEL_ELEMENT_ID}
                    startAt={0}
                />
            </div>

            <div
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: '100%',
                    opacity: bodyRevealProgress,
                    transform: composeTransforms(
                        'translateX(-50%)',
                        `translateY(${BODY_BASE_OFFSET_Y + bodyTranslateY}px)`,
                    ),
                }}
            >
                <AnimatedText
                    {...bodyEl.props}
                    id={BODY_ELEMENT_ID}
                    startAt={BODY_START_OFFSET}
                />
            </div>
        </div>
    );
};

export const IntroTextDescriptor: ComponentRegistration = {
    name: 'IntroText',
    type: 'scene',
    tags: ['INTRO'],
    schema: [
        {
            type: 'component',
            name: 'animatedtext-label',
            fields: [
                {
                    name: 'text',
                    type: 'string',
                    datatype: 'text',
                    map: 'props.intro_label',
                },
                {
                    name: 'variant',
                    type: 'enum',
                    default: IntroTextLabelDefaults.variant,
                },
            ],
        },
        {
            type: 'component',
            name: 'animatedtext-body',
            fields: [
                {
                    name: 'text',
                    type: 'string',
                    datatype: 'text',
                    map: 'props.intro_body',
                },
                {
                    name: 'variant',
                    type: 'enum',
                    default: IntroTextBodyDefaults.variant,
                },
                {
                    name: 'entranceAnimation',
                    type: 'enum',
                    default: IntroTextBodyDefaults.entranceAnimation,
                },
                {
                    name: 'staggerDelay',
                    type: 'number',
                    default: IntroTextBodyDefaults.staggerDelay,
                },
                {
                    name: 'splitBy',
                    type: 'enum',
                    default: 'word',
                },
                {
                    name: 'highlightStyle',
                    type: 'enum',
                    default: AnimatedTextDefaults.highlightStyle,
                },
                {
                    name: 'highlightColor',
                    type: 'string',
                    datatype: 'color',
                    default: AnimatedTextDefaults.highlightColor,
                },
            ],
        },
    ],
    llmSchema: [
        {
            name: 'intro_label',
            type: 'string',
            hint: 'Short lead-in like "Introducing", "Meet", or "Now live".',
        },
        {
            name: 'intro_body',
            type: 'string',
            hint: 'Main reveal text shown below the label',
        },
    ],
    description: 'Starts with a centered intro label, then settles it upward while the main text reveals word-by-word below.',
    instructions: 'Use this before introducing a brand logo or product',
    celExpression: `max(
  ${LABEL_TRANSITION_END},
  ${BODY_START_OFFSET}
    + max(0, segmentCount(props["animatedtext-body"].text, props["animatedtext-body"].splitBy) - 1)
      * props["animatedtext-body"].staggerDelay
    + ${BODY_REVEAL_DURATION}
) + ${BODY_HOLD_DURATION}`,
};
