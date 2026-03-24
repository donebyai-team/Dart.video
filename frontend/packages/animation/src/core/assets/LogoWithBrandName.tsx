import React from "react";
import { useCurrentFrame } from "remotion";
import { usePatchedProp, useStyleOverride } from "../../patches/PatchContext";
import { useSpeedFactor, applySpeedFactor } from "../../duration/speedFactor";
import { useStyleContext } from "../../styles/StyleContext";
import { useAspectPreset } from "../../styles/AspectPresetContext";
import { interpolateWithEasing } from "../../styles/easingResolver";
import { useTheme } from "../../theme";
import { resolveTypography } from "../../tokens/resolveTypography";
import { TypographyVariant } from "../../tokens/semantic";
import { LogoAsset } from "./LogoAsset";

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
    variant = 'heading',
    startAt = 0,
    style,
    id,
}: LogoWithBrandNameProps): React.ReactElement {
    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();
    const speedFactor = useSpeedFactor();
    const adjustedStartAt = applySpeedFactor(startAt, speedFactor);

    const patchedBrandName = usePatchedProp<string>(id, 'brandName', brandName);
    const patchedVariant = usePatchedProp<TypographyVariant>(id, 'variant', variant);
    const styleOverride = useStyleOverride(id);

    // Derive logo size from text's resolved font size
    const typo = resolveTypography(patchedVariant, styleConfig, theme, preset);
    const fontSize = typeof typo.fontSize === 'number' ? typo.fontSize : 48;
    const lineHeight = typeof typo.lineHeight === 'number' ? typo.lineHeight : 1.1;
    const resolvedLogoSize = logoSize ?? Math.round(fontSize * lineHeight);

    const easing = styleConfig.motion.entrance;

    const chars = patchedBrandName.split('');
    const charStagger = 4;
    const charFadeDuration = 15;

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
