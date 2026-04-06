import React from 'react';
import { useCurrentFrame } from 'remotion';
import z from 'zod';
import { usePatchedProps, useStyleOverride } from '../../../patches';
import { TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens/semantic';
import { LogoAsset } from './LogoAsset';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../durationTypes';
import { interpolateWithEasing } from '../../../styles';
import { TextStagger, calculateTextStaggerDuration } from '../text/TextStagger';
import { ENTRANCE_ANIMATIONS } from '../types';

const DEFAULT_TEXT_ENTRANCE_DURATION = 5;
const DEFAULT_LOGO_STAGGER = 5;
const DEFAULT_LOGO_ANIMATION_DURATION = 12;
const DEFAULT_VARIANT = 'heading' as const;
const DEFAULT_LOGO_GAP = 48;
const MAX_LOGOS_PER_ROW = 5;
const DEFAULT_TEXT_STAGGER_SPLIT_BY = 'line' as const;
const DEFAULT_TEXT_STAGGER_ANIMATION = ENTRANCE_ANIMATIONS[1];

const SLOT_LAYOUT_BY_COUNT: Record<number, { width: number; height: number; gap: number; padding: number }> = {
    1: { width: 320, height: 180, gap: 0, padding: 24 },
    2: { width: 280, height: 160, gap: 40, padding: 22 },
    3: { width: 240, height: 140, gap: 32, padding: 20 },
    4: { width: 220, height: 128, gap: 24, padding: 18 },
    5: { width: 196, height: 116, gap: 20, padding: 16 },
};

function getSlotLayout(count: number) {
    return SLOT_LAYOUT_BY_COUNT[Math.min(Math.max(count, 1), MAX_LOGOS_PER_ROW)] ?? SLOT_LAYOUT_BY_COUNT[5];
}

export const LogoShowcaseSchema = z.object({
    id: z.string().optional(),
    images: z.array(z.string()).default([]),
    text: z.string().default(''),
    variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).default(DEFAULT_VARIANT).optional(),
    logoGap: z.number().default(DEFAULT_LOGO_GAP).optional(),
    className: z.string().optional(),
    style: z.any().optional(),
});

export type LogoShowcaseProps = z.input<typeof LogoShowcaseSchema>;

export const LogoShowcase: React.FC<LogoShowcaseProps> = (propsInit: LogoShowcaseProps) => {
    const patchedProps = usePatchedProps(propsInit.id, propsInit);
    const props = { ...LogoShowcaseSchema.parse(patchedProps), id: propsInit.id };

    const frame = useCurrentFrame();
    const styleOverride = useStyleOverride(props.id);

    const actualVariant = props.variant ?? DEFAULT_VARIANT;
    const logoCount = props.images.length;
    const itemsPerRow = Math.min(Math.max(logoCount, 1), MAX_LOGOS_PER_ROW);
    const slotLayout = getSlotLayout(itemsPerRow);
    const actualLogoGap = props.logoGap ?? slotLayout.gap;
    const textDurationResult = calculateTextStaggerDuration({
        text: props.text,
        splitBy: DEFAULT_TEXT_STAGGER_SPLIT_BY,
        entranceAnimation: DEFAULT_TEXT_STAGGER_ANIMATION,
    });
    const textDuration = textDurationResult.success ? textDurationResult.duration : DEFAULT_TEXT_ENTRANCE_DURATION;
    const logosStartFrame = textDuration;

    return (
        <div
            id={props.id}
            className={props.className}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                ...props.style,
                ...styleOverride,
            }}
        >
            <TextStagger
                id={`textstagger-${props.id}`}
                text={props.text}
                variant={actualVariant}
                splitBy={DEFAULT_TEXT_STAGGER_SPLIT_BY}
                entranceAnimation={DEFAULT_TEXT_STAGGER_ANIMATION}
                startAt={0}
                style={{ textAlign: 'center', ...props.style }}
            />

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: actualLogoGap,
                    width: '100%',
                    maxWidth: slotLayout.width * itemsPerRow + actualLogoGap * Math.max(itemsPerRow - 1, 0),
                    marginTop: 56,
                    // overflow: 'hidden',
                }}
            >
                {props.images.map((logo, index) => {
                    const logoStartFrame = logosStartFrame + index * DEFAULT_LOGO_STAGGER;
                    const logoLocalFrame = frame - logoStartFrame;
                    const logoProgress = interpolateWithEasing(
                        logoLocalFrame,
                        [0, DEFAULT_LOGO_ANIMATION_DURATION],
                        [0, 1]
                    );

                    const opacity = logoProgress;
                    const translateY = interpolateWithEasing(logoProgress, [0, 1], [24, 0]);
                    const scale = interpolateWithEasing(logoProgress, [0, 1], [0.9, 1]);

                    return (
                        <div
                            key={`${logo}-${index}`}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flex: `0 0 ${slotLayout.width}px`,
                                width: slotLayout.width,
                                height: slotLayout.height,
                                padding: slotLayout.padding,
                                boxSizing: 'border-box',
                                opacity,
                                transform: `translateY(${translateY}px) scale(${scale})`,
                            }}
                        >
                            <LogoAsset
                                id={`logoasset-${index}-${props.id}`}
                                src={logo}
                                width={slotLayout.width - slotLayout.padding * 2}
                                height={slotLayout.height - slotLayout.padding * 2}
                                logoAnimation="none"
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export function calculateLogoShowcaseDuration(props: Record<string, any>): DurationResult {
    const validation = LogoShowcaseSchema.safeParse(props);

    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return {
            success: false,
            error: firstError.message,
            field: firstError.path[0] as string,
        };
    }

    const validated = validation.data;
    const logoCount = validated.images.length;
    const textDurationResult = calculateTextStaggerDuration({
        text: validated.text,
        splitBy: DEFAULT_TEXT_STAGGER_SPLIT_BY,
        entranceAnimation: DEFAULT_TEXT_STAGGER_ANIMATION,
    });
    const textDuration = textDurationResult.success ? textDurationResult.duration : DEFAULT_TEXT_ENTRANCE_DURATION;

    if (logoCount === 0) {
        return {
            success: true,
            duration: textDuration ,
        };
    }

    const lastLogoStartFrame = textDuration
        + (logoCount - 1) * DEFAULT_LOGO_STAGGER;

    return {
        success: true,
        duration: Math.ceil(lastLogoStartFrame + DEFAULT_LOGO_ANIMATION_DURATION),
    };
}

export const LogoShowcaseDescriptor: ComponentRegistration = {
    name: 'LogoShowcase',
    type: 'scene',
    fullSchema: LogoShowcaseSchema,
    description: 'Displays centered text first, followed by logos appearing one-by-one in a consistent wrapped layout with up to 5 logos per row. Required props: text="Trusted by leading teams", logos=["https://.../logo1.svg", "https://.../logo2.svg"].',
    calculateDuration: calculateLogoShowcaseDuration,
};
