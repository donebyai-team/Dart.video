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
    text: 'Brand',
    variant: 'display' as const,
    splitBy: 'char' as const,
    staggerDelay: 2,
    duration: 10,
    entranceAnimation: 'fadeIn' as const,
};

const TAGLINE_TEXT_DEFAULTS = {
    ...TextStaggerDefaults,
    id: 'textstagger-tagline',
    text: 'Your tagline here',
    variant: 'heading' as const,
    splitBy: 'word' as const,
    staggerDelay: 5,
    duration: 16,
    entranceAnimation: 'slideUp' as const,
};

const LOCKUP_GAP = 20;
const TAGLINE_GAP = 20;
const TAGLINE_LIFT = 24;
const LOCKUP_REVEAL_DURATION = 24;

function getTextDuration(text: string, staggerDelay: number, duration: number, splitBy: 'char' | 'word' | 'line') {
    const units = splitBy === 'char'
        ? text.length
        : splitBy === 'line'
            ? text.split('\n').length
            : text.split(' ').filter(Boolean).length;

    return Math.max(0, units - 1) * staggerDelay + duration;
}

export function LogoWithCTA(): React.ReactElement {
    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const preset = useAspectPreset();
    const theme = useTheme();
    const logoProps = usePatchedProps('logoasset', LogoAssetDefaults);
    const brandProps = usePatchedProps('brandname', BRAND_TEXT_DEFAULTS);
    const taglineProps = usePatchedProps('tagline', TAGLINE_TEXT_DEFAULTS);

    const resolvedLogo = logoProps.src || theme.logoIcon?.url || theme.logo?.url;

    const brandTypography = resolveTypography(brandProps.variant, styleConfig, theme, preset);
    const brandFontSize = typeof brandTypography.fontSize === 'number' ? brandTypography.fontSize : 44;
    const brandLineHeight = typeof brandTypography.lineHeight === 'number' ? brandTypography.lineHeight : 1.1;
    const resolvedLogoSize = logoProps.width
        ?? logoProps.height
        ?? Math.round(brandFontSize * brandLineHeight * 1.02);

    const estimatedBrandWidth = Math.max(brandFontSize * 2.8, brandProps.text.length * brandFontSize * 0.62);
    const brandRevealDuration = getTextDuration(
        brandProps.text,
        brandProps.staggerDelay,
        brandProps.duration,
        brandProps.splitBy,
    );
    const brandRevealFrames = Math.max(LOCKUP_REVEAL_DURATION, brandRevealDuration);
    const taglineStart = brandRevealFrames + 6;
    const taglineRevealDuration = getTextDuration(
        taglineProps.text,
        taglineProps.staggerDelay,
        taglineProps.duration,
        taglineProps.splitBy,
    );

    const brandRevealProgress = interpolateWithEasing(
        frame,
        [0, brandRevealFrames],
        [0, 1],
        'ease-out',
    );

    const rowGap = interpolateWithEasing(
        frame,
        [0, brandRevealFrames],
        [0, LOCKUP_GAP],
        'ease-out',
    );

    const brandMaxWidth = interpolateWithEasing(
        frame,
        [0, brandRevealFrames],
        [0, estimatedBrandWidth],
        'ease-out',
    );

    const logoOffsetX = interpolateWithEasing(
        frame,
        [0, brandRevealFrames],
        [estimatedBrandWidth * 0.18, 0],
        'ease-out',
    );

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
                width: '100%',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: `translateY(${topRowTranslateY}px)`,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: rowGap,
                    }}
                >
                    <LogoAsset
                        id="logoasset"
                        src={resolvedLogo}
                        width={logoProps.width ?? resolvedLogoSize}
                        height={logoProps.height ?? resolvedLogoSize}
                        logoAnimation={logoProps.logoAnimation}
                        className={logoProps.className}
                        style={{
                            ...(logoProps.style ?? {}),
                            transform: `translateX(${logoOffsetX}px)`,
                        }}
                    />

                    <div
                        style={{
                            maxWidth: brandMaxWidth,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <TextStagger
                            id="textstagger-brandname"
                            text={brandProps.text}
                            startAt={4}
                            splitBy="char"
                            staggerDelay={brandProps.staggerDelay}
                            duration={brandProps.duration}
                            entranceAnimation={brandProps.entranceAnimation}
                            variant={brandProps.variant}
                            className={brandProps.className}
                            style={{
                                ...(brandProps.style ?? {}),
                                whiteSpace: 'nowrap',
                                textAlign: 'left',
                            }}
                        />
                    </div>
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    width: '100%',
                    maxWidth: preset.width * 0.82,
                    overflow: 'hidden',
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
        fields: LogoAssetSchemaFields,
    },
    {
        type: 'component',
        name: 'textstagger-brandname',
        fields: [
            {
                name: 'text',
                type: 'string',
                map: 'props.text',
            },
            {
                name: 'variant',
                type: 'string',
                subtype: 'enum',
                default: BRAND_TEXT_DEFAULTS.variant,
            },
            {
                name: 'staggerDelay',
                type: 'number',
                default: BRAND_TEXT_DEFAULTS.staggerDelay,
            },
            {
                name: 'entranceAnimation',
                type: 'string',
                subtype: 'enum',
                default: BRAND_TEXT_DEFAULTS.entranceAnimation,
            },
            {
                name: 'duration',
                type: 'number',
                default: BRAND_TEXT_DEFAULTS.duration,
            },
            {
                name: 'splitBy',
                type: 'string',
                subtype: 'enum',
                default: BRAND_TEXT_DEFAULTS.splitBy,
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
                map: 'props.text',
            },
            {
                name: 'variant',
                type: 'string',
                subtype: 'enum',
                default: TAGLINE_TEXT_DEFAULTS.variant,
            },
            {
                name: 'staggerDelay',
                type: 'number',
                default: TAGLINE_TEXT_DEFAULTS.staggerDelay,
            },
            {
                name: 'entranceAnimation',
                type: 'string',
                subtype: 'enum',
                default: TAGLINE_TEXT_DEFAULTS.entranceAnimation,
            },
            {
                name: 'duration',
                type: 'number',
                default: TAGLINE_TEXT_DEFAULTS.duration,
            },
            {
                name: 'splitBy',
                type: 'string',
                subtype: 'enum',
                default: TAGLINE_TEXT_DEFAULTS.splitBy,
            },
        ],
    },
];

export const LogoWithCTADescriptor: ComponentRegistration = {
    name: 'LogoWithCTA',
    type: 'scene',
    tags: ['CTA', 'Brand'],
    schema: LogoWithCTASchemaFields,
    llmSchema: [
        {
            name: 'brandName',
            type: 'string',
        },
        {
            name: 'tagline',
            type: 'string',
        },
    ],
    description: 'Logo icon reveals first, brand name joins beside it, then a larger tagline appears underneath.',
    celExpression: 'max(24, max(0, segmentCount(props["textstagger-brandname"].text, "char") - 1) * props["textstagger-brandname"].staggerDelay + props["textstagger-brandname"].duration) + 6 + max(0, segmentCount(props["textstagger-tagline"].text, "word") - 1) * props["textstagger-tagline"].staggerDelay + props["textstagger-tagline"].duration',
};
