import React from "react";
import { useCurrentFrame } from "remotion";
import { usePatchedProps } from "../../../patches/PatchContext";
import { useStyleContext } from "../../../styles/StyleContext";
import { useAspectPreset } from "../../../styles/AspectPresetContext";
import { interpolateWithEasing } from "../../../styles/easingResolver";
import { useTheme } from "../../../theme";
import { resolveTypography } from "../../../tokens/resolveTypography";
import { LogoAsset, LogoAssetDefaults, LogoAssetSchemaFields } from "./LogoAsset";
import { TextStagger, TextStaggerDefaults } from "../text/TextStagger";
import type { ComponentRegistration } from '../../../registry/registry';
import { SPLIT_BY_MODES } from "../types";

// Default constants
const DEFAULT_CHAR_STAGGER = 5;
const DEFAULT_CHAR_FADE_DURATION = 20;
const DEFAULT_VARIANT = 'heading' as const;
const DEFAULT_SRC = ""


export function LogoWithBrandName(): React.ReactElement {
    const textProps = usePatchedProps("textstagger", TextStaggerDefaults);
    const logoAssetProps = usePatchedProps("logoasset", LogoAssetDefaults);


    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();


    const resolvedLogo = logoAssetProps.src || theme.logoIcon?.url;

    // Apply defaults
    const actualVariant = textProps.variant ?? DEFAULT_VARIANT;

    // Derive logo size from text's resolved font size
    const typo = resolveTypography(actualVariant, styleConfig, theme, preset);
    const fontSize = typeof typo.fontSize === 'number' ? typo.fontSize : 48;
    const lineHeight = typeof typo.lineHeight === 'number' ? typo.lineHeight : 1.1;
    const resolvedLogoSize = Math.round(fontSize * lineHeight);

    // Check first char opacity to animate the gap
    const firstCharOpacity = interpolateWithEasing(
        frame,
        [0, DEFAULT_CHAR_FADE_DURATION],
        [0, 1],
        'ease-out',
    );

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: firstCharOpacity > 0 ? 12 : 0,
                }}
            >
                <LogoAsset
                    id="logoasset"
                    src={resolvedLogo}
                    width={resolvedLogoSize}
                    height={resolvedLogoSize}
                    logoAnimation="none"
                />
                <TextStagger
                    id="textstagger"
                    text={textProps.text}
                    splitBy={SPLIT_BY_MODES[0]}
                    staggerDelay={DEFAULT_CHAR_STAGGER}
                    duration={DEFAULT_CHAR_FADE_DURATION}
                    variant={actualVariant}
                    style={{ whiteSpace: 'nowrap' }}
                />
            </div>
        </div>
    );
}

// ============================================================================
// Registry Descriptor
// ============================================================================

export const LogoWithBrandNameSchemaFields = [
    {
        type: "component",
        name: 'textstagger',
        fields: [
            {
                "name": "text",
                "type": "string",
                "datatype": "text",
                "map": "props.brandname"
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
                "default": SPLIT_BY_MODES[0]
            }
        ]
    },
    {
        type: "component",
        name: 'logoasset',
        fields: LogoAssetSchemaFields
    },

]

export const LogoWithBrandNameDescriptor: ComponentRegistration = {
    name: 'LogoWithBrandName',
    type: 'scene',
    tags: ['Solution'],
    schema: LogoWithBrandNameSchemaFields,
    llmSchema: [{
        name: 'brandname',
        type: 'string',
    }],
    description: 'Logo + brand name reveal.',
    instructions: 'Use for brand intros',
    celExpression: 'max(0, segmentCount(props.textstagger.text, "char") - 1) * 5 + 20',
};
