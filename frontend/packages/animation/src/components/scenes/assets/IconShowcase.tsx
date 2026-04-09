import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import z from 'zod';
import { IconAsset } from '../../../core/assets/IconAsset';
import { TextStagger } from '../text/TextStagger';
import { usePatchedProps, useStyleOverride } from '../../../patches';
import { TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens/semantic';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../durationTypes';
import { ENTRANCE_ANIMATIONS, SPLIT_BY_MODES } from '../types';

// Default constants
const DEFAULT_ENTRANCE_DURATION = 10;
const DEFAULT_ICON_STAGGER = 5;
const DEFAULT_ICON_ANIMATION_DURATION = 10;
const DEFAULT_TEXT_DELAY = 5;
const DEFAULT_VARIANT = 'heading' as const;
const DEFAULT_ICON_SIZE = 90;
const DEFAULT_ICON_GAP = 64;

// ============================================================================
// Zod Schema
// ============================================================================

export const IconShowcaseSchema = z.object({
    id: z.string().optional(),
    icons: z.array(z.string()).default([]),
    text: z.string().default(""),
    variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).default(DEFAULT_VARIANT).optional(),
    iconSize: z.number().default(DEFAULT_ICON_SIZE).optional(),
    iconGap: z.number().default(DEFAULT_ICON_GAP).optional(),
    className: z.string().optional(),
    style: z.any().optional(),
});

export type IconShowcaseProps = z.input<typeof IconShowcaseSchema>;

export const IconShowcase: React.FC<IconShowcaseProps> = (propsInit: IconShowcaseProps) => {
    const patchedProps = usePatchedProps(propsInit.id, propsInit);
    const props = { ...IconShowcaseSchema.parse(patchedProps), id: propsInit.id };

    const frame = useCurrentFrame();
    const styleOverride = useStyleOverride(props.id);

    // Apply defaults
    const actualIconSize = props.iconSize ?? DEFAULT_ICON_SIZE;
    const actualIconGap = props.iconGap ?? DEFAULT_ICON_GAP;
    const actualVariant = props.variant ?? DEFAULT_VARIANT;

    // Animation timing
    const localFrame = frame;
    const entranceDuration = DEFAULT_ENTRANCE_DURATION;
    const iconStagger = DEFAULT_ICON_STAGGER;
    const iconAnimDuration = DEFAULT_ICON_ANIMATION_DURATION;

    // Calculate when all icons are visible
    const allIconsVisibleFrame = entranceDuration + (props.icons.length - 1) * iconStagger + iconAnimDuration;
    const textStartFrame = allIconsVisibleFrame + DEFAULT_TEXT_DELAY;

    // Container entrance animation (fade in)
    const containerOpacity = interpolate(
        localFrame,
        [0, entranceDuration],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    // Vertical shift when text appears (move icons up to center everything)
    const hasText = props.text && props.text.trim().length > 0;
    const verticalShift = hasText
        ? interpolate(
            localFrame,
            [textStartFrame, textStartFrame + 15],
            [0, -40],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        )
        : 0;

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
                opacity: containerOpacity,
                ...props.style,
                ...styleOverride,
            }}
        >
            {/* Icons container */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: actualIconGap,
                    flexWrap: 'wrap',
                    maxWidth: '80%',
                    transform: `translateY(${verticalShift}px)`,
                }}
            >
                {props.icons.map((icon, index) => {
                    const iconStartFrame = entranceDuration + index * iconStagger;
                    const iconLocalFrame = localFrame - iconStartFrame;

                    // Icon entrance: scale + rotate
                    const iconProgress = interpolate(
                        iconLocalFrame,
                        [0, iconAnimDuration],
                        [0, 1],
                        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                    );

                    const scale = interpolate(iconProgress, [0, 1], [0, 1]);
                    const rotation = interpolate(iconProgress, [0, 1], [0, 360]);
                    const opacity = interpolate(iconProgress, [0, 0.3], [0, 1], {
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp',
                    });

                    return (
                        <div
                            key={`${icon}-${index}`}
                            style={{
                                transform: `scale(${scale}) rotate(${rotation}deg)`,
                                opacity,
                            }}
                        >
                            <IconAsset id={`iconasset-${index}-${props.id}`} icon={icon} size={actualIconSize} />
                        </div>
                    );
                })}
            </div>

            {/* Text below icons */}
            {hasText && localFrame >= textStartFrame && (
                <div
                    style={{
                        marginTop: 60,
                    }}
                >
                    <TextStagger
                        id={`textstagger-${props.id}`}
                        text={props.text}
                        variant={actualVariant}
                        splitBy={SPLIT_BY_MODES[1]}
                        entranceAnimation={ENTRANCE_ANIMATIONS[3]}
                        startAt={textStartFrame}
                    />
                </div>
            )}
        </div>
    );
};


// ============================================================================
// Registry Descriptor
// ============================================================================

export const IconShowcaseDescriptor: ComponentRegistration = {
    name: 'IconShowcase',
    type: 'scene',
    tags: ['Solution', 'Product Info', 'Social proof'],
    fullSchema: IconShowcaseSchema,
    description: 'Row of icons + caption. Use for integrations, tech stack, partners, brands. eg. icons={["shopify", "midjourney", "openai"]}, text="caption text".',
    celExpression: 'ceil(10 + (size(props.icons) - 1) * 5 + 10 + 5 + 15 + (size(props.text.trim().split(" ")) - 1) * 5 + 15)',
};
