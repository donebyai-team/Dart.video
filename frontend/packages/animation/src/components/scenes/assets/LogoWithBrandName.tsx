import React from "react";
import { useCurrentFrame } from "remotion";
import z from 'zod';
import { usePatchedProp, usePatchedProps, useStyleOverride } from "../../../patches/PatchContext";
import { useStyleContext } from "../../../styles/StyleContext";
import { useAspectPreset } from "../../../styles/AspectPresetContext";
import { interpolateWithEasing } from "../../../styles/easingResolver";
import { useTheme } from "../../../theme";
import { resolveTypography } from "../../../tokens/resolveTypography";
import { TypographyVariant, TYPOGRAPHY_VARIANT_NAMES } from "../../../tokens/semantic";
import { LogoAsset } from "./LogoAsset";
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../../../registry/registry';

// Default constants
const DEFAULT_CHAR_STAGGER = 4;
const DEFAULT_CHAR_FADE_DURATION = 15;
const DEFAULT_VARIANT = 'heading' as const;

export const LogoWithBrandNameSchema = z.object({
    id: z.string().optional(),
    brandName: z.string().min(1, "brandName is required"),
    src: z.string().url("src must be a valid URL").optional(),
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

    // Apply defaults
    const actualVariant = props.variant ?? DEFAULT_VARIANT;


    const styleOverride = useStyleOverride(props.id);

    // Derive logo size from text's resolved font size
    const typo = resolveTypography(actualVariant, styleConfig, theme, preset);
    const fontSize = typeof typo.fontSize === 'number' ? typo.fontSize : 48;
    const lineHeight = typeof typo.lineHeight === 'number' ? typo.lineHeight : 1.1;
    const resolvedLogoSize = props.logoSize ?? Math.round(fontSize * lineHeight);

    const easing = styleConfig.motion.entrance;

    const chars = props.brandName.split('');
    const charStagger = DEFAULT_CHAR_STAGGER;
    const charFadeDuration = DEFAULT_CHAR_FADE_DURATION;

    const getCharOpacity = (i: number): number => {
        const charStart = i * charStagger;
        return interpolateWithEasing(
            frame,
            [charStart, charStart + charFadeDuration],
            [0, 1],
            easing,
        );
    };

    const firstCharOpacity = chars.length > 0 ? getCharOpacity(0) : 0;

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
                    src={props.src}
                    width={resolvedLogoSize}
                    height={resolvedLogoSize}
                    animation="none"
                />
                <span
                    style={{
                        whiteSpace: 'nowrap',
                        ...resolveTypography(actualVariant, styleConfig, theme, preset),
                        ...props.style,
                        ...styleOverride,
                    }}
                >
                    {chars.map((char, i) => (
                        <span key={i} style={{ opacity: getCharOpacity(i) }}>
                            {char}
                        </span>
                    ))}
                </span>
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
    
    // Calculate duration based on brand name length
    const charCount = validated.brandName.length;
    const charStagger = DEFAULT_CHAR_STAGGER;
    const charFadeDuration = DEFAULT_CHAR_FADE_DURATION;
    
    // Total duration = time until last char starts + fade duration of last char
    const totalDuration = (charCount - 1) * charStagger + charFadeDuration;
    
    return {
        success: true,
        duration: Math.ceil(totalDuration),
    };
}

// ============================================================================
// Registry Descriptor
// ============================================================================

export const LogoWithBrandNameDescriptor: ComponentRegistration = {
    name: 'LogoWithBrandName',
    type: 'scene',
    fullSchema: LogoWithBrandNameSchema,
    editorProps: ['brandName', 'src', 'variant', 'logoSize'],
    description: 'Displays a logo alongside brand name text that fades in character-by-character. Use for brand introductions or company presentations. Required props: brandName="CoasterAI". Optional: src for custom logo (uses theme logo if omitted). The brand name animates in one character at a time for dramatic effect.',
    calculateDuration: calculateLogoWithBrandNameDuration,
};
