import React from 'react';
import { useCurrentFrame } from 'remotion';
import { usePatchedProps } from '../../../patches/PatchContext';
import { useStyleContext } from '../../../styles/StyleContext';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { useTheme } from '../../../theme';
import { resolveTypography } from '../../../tokens/resolveTypography';
import { LogoAsset, LogoAssetDefaults, LogoAssetSchemaFields } from './LogoAsset';
import { TextStagger, TextStaggerDefaults } from '../text/TextStagger';
import type { ComponentRegistration } from '../../../registry/registry';

const BRAND_TEXT_DEFAULTS = {
    ...TextStaggerDefaults,
    id: 'textstagger-brandname',
    text: '',
    variant: 'display' as const,
    staggerDelay: 1,
    duration: 8,
    entranceAnimation: 'fadeIn' as const,
};

const TAGLINE_TEXT_DEFAULTS = {
    ...TextStaggerDefaults,
    id: 'textstagger-tagline',
    text: '',
    variant: 'heading' as const,
    staggerDelay: 3,
    duration: 12,
    entranceAnimation: 'fadeIn' as const,
};

const LOCKUP_GAP = 20;
const TAGLINE_GAP = 20;
const TAGLINE_LIFT = 24;
const LOGO_HOLD_FRAMES = 5;
const LOCKUP_REVEAL_DURATION = 14;
const FINAL_TOP_ROW_SCALE = 0.78;

function getWordCount(text: string) {
    return text.split(' ').filter(Boolean).length;
}

function getWordRevealDuration(text: string, staggerDelay: number, duration: number) {
    return Math.max(0, getWordCount(text) - 1) * staggerDelay + duration;
}

export function LogoWithCTA(): React.ReactElement {
    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const preset = useAspectPreset();
    const theme = useTheme();
    const logoProps = usePatchedProps('logoasset', LogoAssetDefaults);
    const brandProps = usePatchedProps('textstagger-brandname', BRAND_TEXT_DEFAULTS);
    const taglineProps = usePatchedProps('textstagger-tagline', TAGLINE_TEXT_DEFAULTS);

    const resolvedLogo = logoProps.src || theme.logoIcon?.url;

    const brandTypography = resolveTypography(brandProps.variant, styleConfig, theme, preset);
    const brandFontSize = typeof brandTypography.fontSize === 'number' ? brandTypography.fontSize : 44;
    const brandLineHeight = typeof brandTypography.lineHeight === 'number' ? brandTypography.lineHeight : 1.1;
    const resolvedLogoSize = logoProps.width
        ?? logoProps.height
        ?? Math.round(brandFontSize * brandLineHeight * 1.02);

    const estimatedBrandWidth = Math.max(brandFontSize * 2.8, brandProps.text.length * brandFontSize * 0.62);
    const brandRevealDuration = getWordRevealDuration(
        brandProps.text,
        brandProps.staggerDelay,
        brandProps.duration,
    );
    const brandRevealFrames = Math.max(LOCKUP_REVEAL_DURATION, brandRevealDuration);
    const taglineStart = LOGO_HOLD_FRAMES + brandRevealFrames + 6;
    const taglineRevealDuration = getWordRevealDuration(
        taglineProps.text,
        taglineProps.staggerDelay,
        taglineProps.duration,
    );

    const brandMaxWidth = interpolateWithEasing(
        frame,
        [LOGO_HOLD_FRAMES, LOGO_HOLD_FRAMES + brandRevealFrames],
        [0, estimatedBrandWidth],
        'ease-out',
    );

    const logoStartOffsetX = (estimatedBrandWidth + LOCKUP_GAP) / 2;
    const logoTranslateX = interpolateWithEasing(
        frame,
        [LOGO_HOLD_FRAMES, LOGO_HOLD_FRAMES + brandRevealFrames],
        [logoStartOffsetX, 0],
        'ease-out',
    );
    const topRowHeight = Math.max(
        resolvedLogoSize,
        Math.round(brandFontSize * brandLineHeight),
    );
    const topRowWidth = resolvedLogoSize + LOCKUP_GAP + estimatedBrandWidth;

    const taglineRevealProgress = interpolateWithEasing(
        frame,
        [taglineStart, taglineStart + taglineRevealDuration],
        [0, 1],
        'ease-out',
    );

    const topRowTranslateY = interpolateWithEasing(
        taglineRevealProgress,
        [0, 1],
        [0, -TAGLINE_LIFT],
        'ease-out',
    );
    const topRowScale = interpolateWithEasing(
        taglineRevealProgress,
        [0, 1],
        [1, FINAL_TOP_ROW_SCALE],
        'ease-out',
    );

    const taglineTranslateY = interpolateWithEasing(
        taglineRevealProgress,
        [0, 1],
        [18, 0],
        'ease-out',
    );

    const taglineMarginTop = interpolateWithEasing(
        taglineRevealProgress,
        [0, 1],
        [0, TAGLINE_GAP],
        'ease-out',
    );

    const taglineMaxHeight = interpolateWithEasing(
        taglineRevealProgress,
        [0, 1],
        [0, 160],
        'ease-out',
    );

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'fit-content',
            }}
        >
            <div
                style={{
                    position: 'relative',
                    width: topRowWidth,
                    height: topRowHeight,
                    transform: `translateY(${topRowTranslateY}px) scale(${topRowScale})`,
                    transformOrigin: 'center center',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: `translate(${logoTranslateX}px, -50%)`,
                    }}
                >
                    <LogoAsset
                        id="logoasset"
                        src={resolvedLogo}
                        width={logoProps.width ?? resolvedLogoSize}
                        height={logoProps.height ?? resolvedLogoSize}
                        logoAnimation={logoProps.logoAnimation}
                        className={logoProps.className}
                        style={logoProps.style}
                    />
                </div>

                <div
                    style={{
                        position: 'absolute',
                        left: resolvedLogoSize + LOCKUP_GAP,
                        top: '50%',
                        width: brandMaxWidth,
                        overflow: 'hidden',
                        transform: 'translateY(-50%)',
                    }}
                >
                    <TextStagger
                        id="textstagger-brandname"
                        text={brandProps.text}
                        startAt={LOGO_HOLD_FRAMES + 4}
                        splitBy="word"
                        staggerDelay={brandProps.staggerDelay}
                        duration={brandProps.duration}
                        entranceAnimation={brandProps.entranceAnimation}
                        variant={brandProps.variant}
                        className={brandProps.className}
                        style={{
                            ...(brandProps.style ?? {}),
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                        }}
                    />
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    width: 'fit-content',
                    maxWidth: preset.width * 0.82,
                    maxHeight: taglineMaxHeight,
                    marginTop: taglineMarginTop,
                    transform: `translateY(${taglineTranslateY}px)`,
                }}
            >
                <TextStagger
                    id="textstagger-tagline"
                    text={taglineProps.text}
                    startAt={taglineStart}
                    splitBy="word"
                    staggerDelay={taglineProps.staggerDelay}
                    duration={taglineProps.duration}
                    entranceAnimation={taglineProps.entranceAnimation}
                    variant={taglineProps.variant}
                    style={{
                        ...(taglineProps.style ?? {}),
                        textAlign: 'center',
                    }}
                />
            </div>
        </div>
    );
}

export const LogoWithCTASchemaFields = [
    {
        type: 'component',
        name: 'logoasset',
        fields: [
            {
                "name": "src",
                "type": "string",
                "datatype": "media",
                "default": "",
            },
            {
                "name": "width",
                "type": "number",
            },
            {
                "name": "height",
                "type": "number",
            }
        ],
    },
    {
        type: 'component',
        name: 'textstagger-brandname',
        fields: [
            {
                name: 'text',
                type: 'string',
                datatype: 'text',
                map: 'props.brandName',
            },
            {
                "name": "variant",
                "type": "enum",
                "default": BRAND_TEXT_DEFAULTS.variant
            },
            {
                "name": "entranceAnimation",
                "type": "enum",
                "default": BRAND_TEXT_DEFAULTS.entranceAnimation
            },
        ],
    },
    {
        type: 'component',
        name: 'textstagger-tagline',
        fields: [
            {
                name: 'text',
                type: 'string',
                datatype: 'text',
                map: 'props.ctaText',
            },
            {
                "name": "variant",
                "type": "enum",
                "default": TAGLINE_TEXT_DEFAULTS.variant
            },
            {
                "name": "entranceAnimation",
                "type": "enum",
                "default": TAGLINE_TEXT_DEFAULTS.entranceAnimation
            },
        ],
    },
];

export const LogoWithCTADescriptor: ComponentRegistration = {
    name: 'LogoWithCTA',
    type: 'scene',
    tags: ['CTA'],
    schema: LogoWithCTASchemaFields,
    llmSchema: [
        {
            name: 'brandName',
            type: 'string',
        },
        {
            name: 'ctaText',
            type: 'string',
        },
    ],
    description: 'Logo icon and brand name reveal with a CTA text below that.',
    instructions: 'Use as the final scene.',
    celExpression: '33 + (segmentCount(props.["textstagger-tagline"].text, "word") - 1) * 3 + 12',
};
