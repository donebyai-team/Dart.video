import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { useElement } from '../../../patches';
import { interpolateWithEasing } from '../../../styles';
import { useTheme } from '../../../theme';
import type { TypographyVariant } from '../../../tokens/semantic';
import {
    resolveAnimationPreset,
    type AnimationPresetName,
} from '../../../core/animation_preset/AnimationPreset';
import type { ComponentRegistration } from '../../../registry/registry';
import {
    getHighlightedTextAnimationTransform,
    type HighlightedTextAnimation,
    type HighlightStyle,
    type SplitByMode,
} from '../types';

function getSplitModeDefaults(splitBy: SplitByMode) {
    switch (splitBy) {
        case 'char':
            return { staggerDelay: 2, duration: 8 };
        case 'word':
            return { staggerDelay: 5, duration: 20 };
        case 'line':
        default:
            return {
                staggerDelay: AnimatedTextDefaults.staggerDelay,
                duration: AnimatedTextDefaults.duration,
            };
    }
}

export const AnimatedTextDefaults = {
    id: 'animatedtext',
    startAt: 0,
    text: '',
    variant: 'headingLg' as TypographyVariant,
    staggerDelay: 15,
    entranceAnimation: 'scaleIn' as AnimationPresetName,
    duration: 20,
    exitAnimation: 'none' as AnimationPresetName,
    exitDuration: 20,
    splitBy: 'line' as SplitByMode,
    highlightStyle: 'simple' as HighlightStyle,
    highlightedTextAnimation: 'none' as HighlightedTextAnimation,
    highlightColor: '',
    className: undefined as string | undefined,
    style: undefined as React.CSSProperties | undefined,
};

export type AnimatedTextProps = Partial<typeof AnimatedTextDefaults>;

type ParsedChar = {
    text: string;
    highlight: boolean;
};

type ParsedWord = {
    text: string;
    highlight: boolean;
    whitespace: boolean;
};

type ParsedLinePart = {
    text: string;
    highlight: boolean;
};

type ParsedLine = {
    parts: ParsedLinePart[];
};

const parseHighlightedRanges = (text: string) => {
    const chars: ParsedChar[] = [];
    let isHighlighting = false;

    for (const char of text) {
        if (char === '{') {
            isHighlighting = true;
            continue;
        }

        if (char === '}') {
            isHighlighting = false;
            continue;
        }

        chars.push({
            text: char,
            highlight: isHighlighting,
        });
    }

    return chars;
};

const toWordUnits = (chars: ParsedChar[]): ParsedWord[] => {
    const units: ParsedWord[] = [];
    let current = '';
    let currentHighlight = false;
    let hasCurrent = false;

    const flushCurrent = () => {
        if (!hasCurrent) return;
        units.push({
            text: current,
            highlight: currentHighlight,
            whitespace: /^\s+$/.test(current),
        });
        current = '';
        currentHighlight = false;
        hasCurrent = false;
    };

    chars.forEach((char) => {
        const isWhitespace = /\s/.test(char.text);

        if (!hasCurrent) {
            current = char.text;
            currentHighlight = char.highlight;
            hasCurrent = true;
            return;
        }

        const currentIsWhitespace = /\s/.test(current[0]);

        if (
            isWhitespace === currentIsWhitespace &&
            (isWhitespace || char.highlight === currentHighlight)
        ) {
            current += char.text;
            return;
        }

        flushCurrent();
        current = char.text;
        currentHighlight = char.highlight;
        hasCurrent = true;
    });

    flushCurrent();
    return units;
};

const toLineUnits = (chars: ParsedChar[]): ParsedLine[] => {
    const lines: ParsedLine[] = [];
    let currentParts: ParsedLinePart[] = [];
    let current = '';
    let currentHighlight = false;
    let hasCurrent = false;

    const flushCurrent = () => {
        if (!hasCurrent) return;
        currentParts.push({
            text: current,
            highlight: currentHighlight,
        });
        current = '';
        currentHighlight = false;
        hasCurrent = false;
    };

    chars.forEach((char) => {
        if (char.text === '\n') {
            flushCurrent();
            lines.push({ parts: currentParts });
            currentParts = [];
            return;
        }

        if (!hasCurrent) {
            current = char.text;
            currentHighlight = char.highlight;
            hasCurrent = true;
            return;
        }

        if (char.highlight === currentHighlight) {
            current += char.text;
            return;
        }

        flushCurrent();
        current = char.text;
        currentHighlight = char.highlight;
        hasCurrent = true;
    });

    flushCurrent();
    lines.push({ parts: currentParts });

    return lines.length > 0 ? lines : [{ parts: [] }];
};

const renderCharUnit = (unit: ParsedChar) => {
    if (unit.text === ' ') return '\u00A0';
    if (unit.text === '\n') return <br />;
    return unit.text;
};

const renderHighlightedLine = (
    line: ParsedLine,
    highlightStyles: React.CSSProperties,
) => line.parts.map((part, index) => {
    if (!part.highlight) {
        return <React.Fragment key={index}>{part.text}</React.Fragment>;
    }

    return (
        <span key={index} style={highlightStyles}>
            {part.text}
        </span>
    );
});

export const AnimatedText: React.FC<AnimatedTextProps> = (initProps) => {
    const frame = useCurrentFrame();
    const theme = useTheme();
    const defaultProps = { ...AnimatedTextDefaults, ...initProps };
    const el = useElement(defaultProps.id, defaultProps);
    const { props } = el;

    const actualAnimation = props.entranceAnimation;
    const actualExitAnimation = props.exitAnimation;
    const actualStartAt = props.startAt;
    const splitBy = props.splitBy;
    const actualHighlightStyle = props.highlightStyle;
    const actualHighlightedTextAnimation = props.highlightedTextAnimation;
    const actualHighlightColor = props.highlightColor || theme.colors.primary;
    const modeDefaults = getSplitModeDefaults(splitBy);
    const actualStaggerDelay = props.staggerDelay ?? modeDefaults.staggerDelay;
    const actualDuration = props.duration ?? modeDefaults.duration;
    const actualExitDuration = props.exitDuration ?? actualDuration;

    const parsedChars = useMemo(() => parseHighlightedRanges(props.text), [props.text]);

    const units = useMemo(() => {
        if (splitBy === 'char') {
            return parsedChars;
        }

        if (splitBy === 'word') {
            return toWordUnits(parsedChars);
        }

        return toLineUnits(parsedChars);
    }, [parsedChars, splitBy]);

    const lastUnitIndex = Math.max(0, units.length - 1);
    const revealCompleteAt =
        actualStartAt + lastUnitIndex * actualStaggerDelay + actualDuration;
    const highlightAnimationDuration =
        actualHighlightedTextAnimation !== 'none' ? actualDuration : 0;
    const highlightAnimationProgress = highlightAnimationDuration === 0
        ? 1
        : interpolateWithEasing(
            frame,
            [revealCompleteAt, revealCompleteAt + highlightAnimationDuration],
            [0, 1],
            'ease-out'
        );
    const exitBaseStartAt = revealCompleteAt + highlightAnimationDuration;
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
            distance: 60,
            easing: 'ease-in-out-circ',
        });

        return {
            opacity: entranceMotion.opacity,
            transform: entranceMotion.transform,
        };
    };

    const getHighlightStyles = (): React.CSSProperties => {
        const progress = 1;
        const baseTransform = getHighlightedTextAnimationTransform(
            actualHighlightedTextAnimation,
            highlightAnimationProgress,
        );

        switch (actualHighlightStyle) {
            case 'marker':
                return {
                    position: 'relative',
                    zIndex: 1,
                    background: `linear-gradient(to right, transparent 0%, ${actualHighlightColor}88 ${progress * 100}%, ${actualHighlightColor}88 100%)`,
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
            case 'simple':
            default:
                return {
                    position: 'relative',
                    color: progress > 0.5 ? actualHighlightColor : 'inherit',
                    transform: baseTransform,
                    display: 'inline-block',
                };
        }
    };

    const highlightStyles = getHighlightStyles();

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
                ...el.containerStyle,
            }}
        >
            {splitBy === 'char' &&
                (units as ParsedChar[]).map((unit, index) => (
                    <span
                        key={index}
                        style={{
                            display: 'inline-block',
                            ...getAnimationStyles(index),
                        }}
                    >
                        {unit.highlight ? (
                            <span style={highlightStyles}>{renderCharUnit(unit)}</span>
                        ) : (
                            renderCharUnit(unit)
                        )}
                    </span>
                ))}

            {splitBy === 'word' &&
                (units as ParsedWord[]).map((unit, index) => {
                    if (unit.whitespace) {
                        return <React.Fragment key={index}>{unit.text}</React.Fragment>;
                    }

                    return (
                        <span
                            key={index}
                            style={{
                                display: 'inline-block',
                                whiteSpace: 'nowrap',
                                ...getAnimationStyles(index),
                            }}
                        >
                            {unit.highlight ? (
                                <span style={highlightStyles}>{unit.text}</span>
                            ) : (
                                unit.text
                            )}
                        </span>
                    );
                })}

            {splitBy === 'line' &&
                (units as ParsedLine[]).map((line, index) => (
                    <span
                        key={index}
                        style={{
                            display: 'block',
                            ...getAnimationStyles(index),
                        }}
                    >
                        {renderHighlightedLine(line, highlightStyles)}
                    </span>
                ))}
        </span>
    );
};

export const AnimatedTextSchemaFields = [
    {
        name: 'text',
        type: 'string',
        datatype: 'text',
        map: 'props.text',
    },
    {
        name: 'variant',
        type: 'enum',
        map: 'props.variant',
        default: AnimatedTextDefaults.variant,
    },
    {
        name: 'staggerDelay',
        type: 'number',
        map: 'props.staggerDelay',
        default: AnimatedTextDefaults.staggerDelay,
    },
    {
        name: 'entranceAnimation',
        type: 'enum',
        map: 'props.entranceAnimation',
        default: AnimatedTextDefaults.entranceAnimation,
    },
    {
        name: 'duration',
        type: 'number',
        map: 'props.duration',
        default: AnimatedTextDefaults.duration,
    },
    {
        name: 'exitAnimation',
        type: 'enum',
        map: 'props.exitAnimation',
        default: 'zoomOut',
    },
    {
        name: 'exitDuration',
        type: 'number',
        map: 'props.exitDuration',
        default: AnimatedTextDefaults.exitDuration,
    },
    {
        name: 'splitBy',
        type: 'enum',
        map: 'props.splitBy',
        default: AnimatedTextDefaults.splitBy,
    },
    {
        name: 'highlightStyle',
        type: 'enum',
        map: 'props.highlightStyle',
        default: AnimatedTextDefaults.highlightStyle,
    },
    {
        name: 'highlightedTextAnimation',
        type: 'enum',
        map: 'props.highlightedTextAnimation',
        default: AnimatedTextDefaults.highlightedTextAnimation,
    },
    {
        name: 'highlightColor',
        type: 'string',
        datatype: 'color',
        map: 'props.highlightColor',
        default: AnimatedTextDefaults.highlightColor,
    },
];

export const AnimatedTextDescriptor: ComponentRegistration = {
    name: 'AnimatedText',
    type: 'content',
    schema: [{
        type: 'component',
        name: 'animatedtext',
        fields: AnimatedTextSchemaFields,
    }],
    llmSchema: [
        {
            name: 'text',
            type: 'string',
            hint: 'Use {} around text that should be highlighted. Example: "We build {great software}"',
        },
        {
            name: 'splitBy',
            type: 'enum',
            required: false,
            default: AnimatedTextDefaults.splitBy,
        }
    ],
    description: 'Reveals a word or a text',
    instructions: `
- Use splitBy="word" or "line" based on how the text should be revealed.
- Use splitBy="word" for sequential word reveals and "line" for grouped multi-line reveals.
- When using splitBy="line", define line breaks with "\\n".
- Optionally wrap words in {} to highlight or emphasize specific parts of the text.
`,
    celExpression: `max(0, segmentCount(props.animatedtext.text, props.animatedtext.splitBy) - 1) * props.animatedtext.staggerDelay + props.animatedtext.duration + (props.animatedtext.highlightedTextAnimation != "none" ? props.animatedtext.duration : 0) + (props.animatedtext.exitAnimation != "none" ? props.animatedtext.exitDuration : 0)`,
};
