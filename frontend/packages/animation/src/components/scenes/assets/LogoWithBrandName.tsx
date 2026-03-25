import React from "react";
import { useCurrentFrame } from "remotion";
import z from 'zod';
import { usePatchedProp, useStyleOverride } from "../../../patches/PatchContext";
import { useSpeedFactor, applySpeedFactor } from "../../../duration/speedFactor";
import { useStyleContext } from "../../../styles/StyleContext";
import { useAspectPreset } from "../../../styles/AspectPresetContext";
import { interpolateWithEasing } from "../../../styles/easingResolver";
import { useTheme } from "../../../theme";
import { resolveTypography } from "../../../tokens/resolveTypography";
import { TypographyVariant, TYPOGRAPHY_VARIANT_NAMES } from "../../../tokens/semantic";
import { LogoAsset } from "./LogoAsset";
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../../../registry/registry';

// Default duration constants
const DEFAULT_CHAR_STAGGER = 4;
const DEFAULT_CHAR_FADE_DURATION = 15;

export interface LogoWithBrandNameProps {
    /** Brand name text. */
    brandName: string;
    /** Logo image source. Falls back to theme logo. */
    src?: string;
    /** Logo size override. */
    logoSize?: number;
    /** Typography variant for the brand name. */
    variant?: TypographyVariant;
    /** Frame at which the text fade begins. */
    startAt?: number;
    style?: React.CSSProperties;
    id?: string;
}

export function LogoWithBrandName({
    brandName,
    src,
    logoSize,
    variant,
    startAt,
    style,
    id,
}: LogoWithBrandNameProps): React.ReactElement {
    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();
    const speedFactor = useSpeedFactor();

    // Apply defaults
    const actualVariant = variant ?? 'heading';
    const actualStartAt = startAt ?? 0;

    const adjustedStartAt = applySpeedFactor(actualStartAt, speedFactor);

    const patchedBrandName = usePatchedProp<string>(id, 'brandName', brandName);
    const patchedVariant = usePatchedProp<TypographyVariant>(id, 'variant', actualVariant);
    const styleOverride = useStyleOverride(id);

    // Derive logo size from text's resolved font size
    const typo = resolveTypography(patchedVariant, styleConfig, theme, preset);
    const fontSize = typeof typo.fontSize === 'number' ? typo.fontSize : 48;
    const lineHeight = typeof typo.lineHeight === 'number' ? typo.lineHeight : 1.1;
    const resolvedLogoSize = logoSize ?? Math.round(fontSize * lineHeight);

    const easing = styleConfig.motion.entrance;

    const chars = patchedBrandName.split('');
    const charStagger = DEFAULT_CHAR_STAGGER;
    const charFadeDuration = DEFAULT_CHAR_FADE_DURATION;

    const getCharOpacity = (i: number): number => {
        const charStart = adjustedStartAt + i * charStagger;
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
            id={id}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...style,
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
                    src={src}
                    width={resolvedLogoSize}
                    height={resolvedLogoSize}
                    animation="none"
                />
                <span
                    style={{
                        whiteSpace: 'nowrap',
                        ...resolveTypography(patchedVariant, styleConfig, theme, preset),
                        ...style,
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
// Schema & Duration Calculation
// ============================================================================

export const LogoWithBrandNameSchema = z.object({
    brandName: z.string().min(1, "brandName is required"),
    src: z.string().url("src must be a valid URL").optional(),
    logoSize: z.number().min(1, "logoSize must be positive").optional(),
    variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).optional(),
    startAt: z.number().min(0, "startAt cannot be negative").default(0).optional(),
    style: z.any().optional(),
});

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
    description: 'logo with brand name text that fades in character by character',
    calculateDuration: calculateLogoWithBrandNameDuration,
};
