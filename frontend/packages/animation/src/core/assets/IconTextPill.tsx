import React, { useMemo } from 'react';
import { IconAsset } from './IconAsset';
import type { TypographyVariant } from '../../tokens/semantic';
import { CardAsset, Text } from '.';
import { useTextMeasurement } from './useTextMeasurement';
import { useStyleContext } from '../../styles/StyleContext';
import { useAspectPreset } from '../../styles/AspectPresetContext';
import { useTheme } from '../../theme/ThemeContext';
import { resolveTypography } from '../../tokens/resolveTypography';

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

export type PillPatchGroup = Record<string, IconPatch | TextPatch>;

export function getNormalizedPill(item: PillPatchGroup): typeof IconTextPillDefaults {
    const entries = Object.entries(item);
    const iconEntry = entries.find(([eid]) => eid.startsWith('iconasset-')) as [string, IconPatch] | undefined;
    const textEntry = entries.find(([eid]) => eid.startsWith('text-') || eid.startsWith('textasset-')) as [string, TextPatch] | undefined;
    const containerEntry = entries.find(([eid]) => eid.startsWith('container-'));

    const iconId = iconEntry?.[0] ?? IconTextPillDefaults.iconId;
    const textId = textEntry?.[0] ?? IconTextPillDefaults.textId;
    const containerId = containerEntry?.[0] ?? IconTextPillDefaults.containerId;
    const iconPatch = iconEntry?.[1] ?? {};
    const textPatch = textEntry?.[1] ?? {};
    const normalizedTextStyle = {
        ...IconTextPillDefaults.textStyle,
        ...textPatch.style,
    };

    return {
        ...IconTextPillDefaults,      
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
    textWidth: number,
): { width: number; height: number; iconSize: number } {
    const resolvedTextStyle = {
        ...typographyStyle,
        ...props.textStyle,
    };
    const fontSize = typeof resolvedTextStyle.fontSize === 'number' ? resolvedTextStyle.fontSize : 48;
    const lineHeight = typeof resolvedTextStyle.lineHeight === 'number' ? resolvedTextStyle.lineHeight : 1.1;
    const iconSize = Math.round(fontSize * lineHeight);
    const width = (props.padding * 2) + (props.borderWidth * 2) + iconSize + props.gap + textWidth;
    const height = (props.padding * 2) + (props.borderWidth * 2) + Math.max(iconSize, fontSize * lineHeight);

    return {
        width,
        height,
        iconSize,
    };
}

export function IconTextPill(initProps: IconTextPillProps): React.ReactElement {
    const props = { ...IconTextPillDefaults, ...initProps };
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();
    const typographyStyle = resolveTypography(props.variant, styleConfig, theme, preset);
    const resolvedTextStyle = useMemo(
        () => ({
            ...typographyStyle,
            ...props.textStyle,
        }),
        [props.textStyle, typographyStyle],
    );
    const textMeasurement = useTextMeasurement(resolvedTextStyle);
    const textWidth = textMeasurement.width(props.text);
    const metrics = getIconTextPillMetrics(props, typographyStyle, textWidth);

    return (
        <CardAsset
            id={props.containerId ?? props.id}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                ...IconTextPillDefaults,
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
                style={{
                    ...props.textStyle,
                    whiteSpace: 'nowrap', // to prevent text from wrapping and causing the pill to grow
                }}
            />
        </CardAsset>
    );
}
