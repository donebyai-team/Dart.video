import React from 'react';
import { IconAsset } from './IconAsset';
import { useAspectPreset } from '../../styles';
import { useStyleContext } from '../../styles/StyleContext';
import { useTheme } from '../../theme';
import type { TypographyVariant } from '../../tokens/semantic';
import { resolveTypography } from '../../tokens/resolveTypography';
import { Text } from '.';
import { measureTextWidth } from '../../components/scenes/text/measureText';

export const IconTextPillDefaults = {
    id: 'icontextpill',
    containerId: 'container',
    iconId: 'iconasset',
    textId: 'text',
    icon: '',
    text: 'Home',
    variant: 'heading' as TypographyVariant,
    iconStyle: undefined as React.CSSProperties | undefined,
    textStyle: {
        color: '#111827',
        fontWeight: 400,
        opacity: 0.8,
    } as React.CSSProperties,
    gap: 20,
    padding: 30,
    borderRadius: 50,
    borderWidth: 5,
    borderColor: '#d5d6d9',
    backgroundColor: 'transparent',
};

export type IconTextPillProps = Partial<typeof IconTextPillDefaults>;
export type IconPatch = {
    icon?: string;
    style?: React.CSSProperties;
};

export type TextPatch = {
    text?: string;
    variant?: TypographyVariant;
    style?: React.CSSProperties;
};

export type ContainerPatch = {
    style?: Partial<Pick<
        typeof IconTextPillDefaults,
        'backgroundColor' | 'borderRadius' | 'borderWidth' | 'borderColor' | 'padding' | 'gap'
    >>;
};

export type PillPatchGroup = Record<string, IconPatch | TextPatch | ContainerPatch>;

function parseContainerNumber(
    value: string | number | undefined,
    fallback: number,
): number {
    if (typeof value === 'number') {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    return fallback;
}

function normalizeTextStyle(style: React.CSSProperties | undefined): React.CSSProperties {
    if (!style) {
        return {};
    }

    const fontWeight = style.fontWeight === 0 ? 400 : style.fontWeight;

    return {
        ...style,
        fontWeight,
    };
}

export function getNormalizedPill(item: PillPatchGroup): typeof IconTextPillDefaults {
    const entries = Object.entries(item);
    const iconEntry = entries.find(([eid]) => eid.startsWith('iconasset-')) as [string, IconPatch] | undefined;
    const textEntry = entries.find(([eid]) => eid.startsWith('text-') || eid.startsWith('textasset-')) as [string, TextPatch] | undefined;
    const containerEntry = entries.find(([eid]) => eid.startsWith('container-')) as [string, ContainerPatch] | undefined;

    const iconId = iconEntry?.[0] ?? IconTextPillDefaults.iconId;
    const textId = textEntry?.[0] ?? IconTextPillDefaults.textId;
    const containerId = containerEntry?.[0] ?? IconTextPillDefaults.containerId;
    const iconPatch = iconEntry?.[1] ?? {};
    const textPatch = textEntry?.[1] ?? {};
    const containerStyle = containerEntry?.[1].style ?? {};
    const normalizedTextStyle = {
        ...IconTextPillDefaults.textStyle,
        ...normalizeTextStyle(textPatch.style),
    };
    const normalizedContainerStyle = {
        backgroundColor: containerStyle.backgroundColor ?? IconTextPillDefaults.backgroundColor,
        borderRadius: parseContainerNumber(containerStyle.borderRadius, IconTextPillDefaults.borderRadius),
        borderWidth: parseContainerNumber(containerStyle.borderWidth, IconTextPillDefaults.borderWidth),
        borderColor: containerStyle.borderColor ?? IconTextPillDefaults.borderColor,
        padding: parseContainerNumber(containerStyle.padding, IconTextPillDefaults.padding),
        gap: parseContainerNumber(containerStyle.gap, IconTextPillDefaults.gap),
    };

    return {
        ...IconTextPillDefaults,
        ...normalizedContainerStyle,
        icon: iconPatch.icon ?? IconTextPillDefaults.icon,
        iconStyle: iconPatch.style ?? IconTextPillDefaults.iconStyle,
        text: textPatch.text ?? IconTextPillDefaults.text,
        variant: textPatch.variant ?? IconTextPillDefaults.variant,
        textStyle: normalizedTextStyle,
        id: containerId,
        containerId,
        iconId,
        textId,
    };
}

export function getIconTextPillMetrics(
    props: typeof IconTextPillDefaults,
    typographyStyle: React.CSSProperties,
): { width: number; height: number; iconSize: number } {
    const resolvedTextStyle = {
        ...typographyStyle,
        ...props.textStyle,
    };
    const fontSize = typeof resolvedTextStyle.fontSize === 'number' ? resolvedTextStyle.fontSize : 48;
    const lineHeight = typeof resolvedTextStyle.lineHeight === 'number' ? resolvedTextStyle.lineHeight : 1.1;
    const iconSize = Math.round(fontSize * lineHeight);
    const textWidth = measureTextWidth(props.text, resolvedTextStyle);
    const width = (props.padding * 2) + (props.borderWidth * 2) + iconSize + props.gap + textWidth;
    const height = (props.padding * 2) + (props.borderWidth * 2) + Math.max(iconSize, fontSize * lineHeight);

    return {
        width,
        height,
        iconSize,
    };
}

export function IconTextPill(initProps: IconTextPillProps): React.ReactElement {
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();
    const props = { ...IconTextPillDefaults, ...initProps };
    const typo = resolveTypography(props.variant, styleConfig, theme, preset);
    const metrics = getIconTextPillMetrics(props, typo);

    return (
        <div
            id={props.containerId ?? props.id}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: props.gap,
                padding: `${props.padding}px`,
                borderRadius: props.borderRadius,
                border: `${props.borderWidth}px solid ${props.borderColor}`,
                backgroundColor: props.backgroundColor,
            }}

        >
            {props.icon && (
                <IconAsset
                    id={props.iconId}
                    icon={props.icon}
                    size={metrics.iconSize}
                    style={props.iconStyle}
                />
            )}

            <Text
                id={props.textId}
                text={props.text}
                variant={props.variant}
                style={props.textStyle}
            />
        </div>
    );
}
