import React from "react";
import { useCurrentFrame } from "remotion";
import z from 'zod';
import { usePatchedProps, useStyleOverride } from "../../../patches/PatchContext";
import { useStyleContext } from "../../../styles/StyleContext";
import { useAspectPreset } from "../../../styles/AspectPresetContext";
import { interpolateWithEasing } from "../../../styles/easingResolver";
import { useTheme } from "../../../theme";
import { resolveTypography } from "../../../tokens/resolveTypography";
import { TYPOGRAPHY_VARIANT_NAMES } from "../../../tokens/semantic";
import { LogoAsset } from "./LogoAsset";
import { TextStagger, calculateTextStaggerDuration } from "../text/TextStagger";
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../../../registry/registry';
import { SPLIT_BY_MODES } from "../types";

// Default constants
const DEFAULT_CHAR_STAGGER = 4;
const DEFAULT_CHAR_FADE_DURATION = 15;
const DEFAULT_VARIANT = 'heading' as const;
const DEFAULT_SRC = ""

export const LogoWithBrandNameSchema = z.object({
    id: z.string().optional(),
    brandName: z.string().min(1, "brandName is required"),
    src: z.string().default(DEFAULT_SRC).optional(),
    logoSize: z.number().min(1, "logoSize must be positive").optional(),
    variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).default(DEFAULT_VARIANT).optional(),
    style: z.any().optional(),
});

// Use z.input for props (what callers pass) - fields with defaults are optional
export type LogoWithBrandNameProps = z.input<typeof LogoWithBrandNameSchema>;

export function LogoWithBrandName(propsInit: LogoWithBrandNameProps): React.ReactElement {
    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();

    const patchedProps = usePatchedProps(propsInit.id, propsInit);
    const props = { ...LogoWithBrandNameSchema.parse(patchedProps), id: propsInit.id };
    const resolvedLogo = props.src || theme.logoIcon?.url;

    // Apply defaults
    const actualVariant = props.variant ?? DEFAULT_VARIANT;


    const styleOverride = useStyleOverride(props.id);

    // Derive logo size from text's resolved font size
    const typo = resolveTypography(actualVariant, styleConfig, theme, preset);
    const fontSize = typeof typo.fontSize === 'number' ? typo.fontSize : 48;
    const lineHeight = typeof typo.lineHeight === 'number' ? typo.lineHeight : 1.1;
    const resolvedLogoSize = props.logoSize ?? Math.round(fontSize * lineHeight);

    // Check first char opacity to animate the gap
    const easing = styleConfig.motion.entrance;
    const firstCharOpacity = interpolateWithEasing(
        frame,
        [0, DEFAULT_CHAR_FADE_DURATION],
        [0, 1],
        easing,
    );

    return (
        <div
            id={props.id}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...props.style,
                ...styleOverride,
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
                    id={`logoasset-${props.id}`}
                    src={resolvedLogo}
                    width={resolvedLogoSize}
                    height={resolvedLogoSize}
                    logoAnimation="none"
                />
                <TextStagger
                    id={`textstagger-${props.id}`}
                    text={props.brandName}
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
// Duration Calculation
// ============================================================================

export function calculateLogoWithBrandNameDuration(props: LogoWithBrandNameProps): DurationResult {
    // Validate props
    const validation = LogoWithBrandNameSchema.safeParse(props);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return {
            success: false,
            error: firstError.message,
            field: firstError.path[0] as string,
        };
    }

    const validated = validation.data;

    // Delegate to TextStagger duration calculation with char splitting
    return calculateTextStaggerDuration({
        text: validated.brandName,
        splitBy: 'char',
        staggerDelay: DEFAULT_CHAR_STAGGER,
        duration: DEFAULT_CHAR_FADE_DURATION,
    });
}

// ============================================================================
// Registry Descriptor
// ============================================================================

export const LogoWithBrandNameDescriptor: ComponentRegistration = {
    name: 'LogoWithBrandName',
    type: 'scene',
    fullSchema: LogoWithBrandNameSchema,
    description: 'Displays a logo alongside brand name text that fades in character-by-character. Use for brand introductions or company presentations. Required props: brandName="CoasterAI". Optional: src for custom logo (uses theme logo if omitted). The brand name animates in one character at a time for dramatic effect.',
    calculateDuration: calculateLogoWithBrandNameDuration,
};
