import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useElement } from '../../../patches';
import { interpolateWithEasing } from '../../../styles';
import { useTheme } from '../../../theme';
import { useTypography } from '../../../tokens';
import type { TypographyVariant } from '../../../tokens/semantic';
import { getEntranceTransform } from '../types';
import type { EntranceAnimation, HighlightStyle } from '../types';
import { Counter } from './Counter';
import { Text } from '../../../core/assets/Text';
import type { ComponentRegistration } from '../../../registry/registry';

export const AnimatedNumberDefaults = {
    id: 'animatednumber',
    startText: 'Solved',
    endText: 'incidents',
    from: 0,
    to: 100,
    format: undefined as string | undefined,
    variant: 'display' as TypographyVariant,
    highlightStyle: 'glow' as HighlightStyle,
    highlightColor: undefined as string | undefined,
    entranceAnimation: 'slideUp' as EntranceAnimation,
    animationDelay: 30,
    counterDuration: 45,
    className: undefined as string | undefined,
    style: undefined as React.CSSProperties | undefined,
};

export type AnimatedNumberProps = Partial<typeof AnimatedNumberDefaults> & { id?: string };

export const AnimatedNumber: React.FC<AnimatedNumberProps> = (initProps) => {
    const frame = useCurrentFrame();
    const theme = useTheme();

    const id = initProps.id ?? AnimatedNumberDefaults.id;
    const { props, getStyle } = useElement(id, AnimatedNumberDefaults, initProps);

    const actualVariant = props.variant;
    const typographyStyle = useTypography(actualVariant);
    const style = getStyle({
        baseStyle: {
            ...typographyStyle,
            opacity: interpolateWithEasing(
                frame,
                [0, props.animationDelay],
                [0, 1],
                'ease-out',
            ),
            display: 'inline-block',
        },
        transform: getEntranceTransform(
            props.entranceAnimation,
            interpolateWithEasing(
                frame,
                [0, props.animationDelay],
                [0, 1],
                'ease-out',
            ),
        ),
    });
    const actualHighlightColor = props.highlightColor ?? theme.colors.primary;
    const { transform: _ignoredStyleTransform, ...textStyleOverride } = props.style ?? {};

    const getHighlightStyles = (): React.CSSProperties => {
        switch (props.highlightStyle) {
            case 'marker':
                return {
                    position: 'relative',
                    zIndex: 1,
                    background: `${actualHighlightColor}88`,
                    padding: '2px 4px',
                    margin: '0 4px',
                    display: 'inline-block',
                };

            case 'underline':
                return {
                    position: 'relative',
                    borderBottom: `3px solid ${actualHighlightColor}`,
                    paddingBottom: '2px',
                    margin: '0 4px',
                    display: 'inline-block',
                };

            case 'box':
                return {
                    position: 'relative',
                    border: `2px solid ${actualHighlightColor}`,
                    borderRadius: '4px',
                    padding: '2px 6px',
                    margin: '0 4px',
                    display: 'inline-block',
                };

            case 'glow':
                return {
                    position: 'relative',
                    textShadow: `0 0 20px ${actualHighlightColor}`,
                    color: actualHighlightColor,
                    margin: '0 4px',
                    display: 'inline-block',
                };

            case 'background':
                return {
                    position: 'relative',
                    backgroundColor: actualHighlightColor,
                    color: '#000',
                    padding: '2px 6px',
                    margin: '0 4px',
                    borderRadius: '4px',
                    display: 'inline-block',
                };

            default:
                return {
                    margin: '0 4px',
                    display: 'inline-block',
                };
        }
    };

    return (
        <span
            id={id}
            className={props.className}
            style={style}
        >


            <Text text={props.startText} style={
                {
                    marginRight: '0.25em',
                    ...typographyStyle,
                    ...textStyleOverride,
                }} />

            <span style={getHighlightStyles()}>
                <Counter
                    id={`counter`}
                    from={props.from}
                    to={props.to}
                    format={props.format}
                    variant={actualVariant}
                    startAt={0}
                    style={getHighlightStyles()}
                    durationInFrames={props.counterDuration}
                />
            </span>
            <Text text={props.endText} style={
                {
                    // marginLeft: '0.25em',
                    ...typographyStyle,
                    ...textStyleOverride,
                }} />
        </span>
    );
};

export const AnimatedNumberAssetSchema = [
    {
        name: 'entranceAnimation',
        type: 'enum',
        map: "props.entranceAnimation",
        default: AnimatedNumberDefaults.entranceAnimation,
    },
    {
        name: 'animationDelay',
        type: 'number',
        default: AnimatedNumberDefaults.animationDelay,
    },
    {
        "name": "startText",
        "type": "string",
        "datatype": "text",
        "map": "props.startText"
    },

    {
        "name": "endText",
        "type": "string",
        "datatype": "text",
        "map": "props.endText"
    },
    {
        "name": "from",
        "type": "number",
        "datatype": "text",
        "map": "props.from",
        "default": AnimatedNumberDefaults.from
    },
    {
        "name": "to",
        "type": "number",
        "datatype": "text",
        "map": "props.to",
        "default": AnimatedNumberDefaults.to
    },
    {
        "name": "format",
        "type": "string",
        "datatype": "text",
        "default": ""
    },
    {
        "name": "variant",
        "type": "enum",
        "default": AnimatedNumberDefaults.variant
    }
]

export const AnimatedNumberDescriptor: ComponentRegistration = {
    name: 'AnimatedNumber',
    type: 'content',
    schema: [{
        type: 'component',
        name: 'animatednumber',
        fields: AnimatedNumberAssetSchema
    }],
    llmSchema: [
        {
            name: 'startText',
            type: 'string',
        },
        {
            name: 'endText',
            type: 'string',
        },
        {
            name: 'from',
            type: 'number',
        },
        {
            name: 'to',
            type: 'number',
        },
        {
            name: 'entranceAnimation',
            type: 'enum',
            required: false,
            default: AnimatedNumberDefaults.entranceAnimation,
        },

    ],
    description: 'Counting metric with label text. Make sure there is no other number in the label. Use for stats and KPIs',
    celExpression: 'props.animatednumber.animationDelay + max(45, min(100, log10(abs(props.animatednumber.to - props.animatednumber.from) + 1) * 20))'
};
