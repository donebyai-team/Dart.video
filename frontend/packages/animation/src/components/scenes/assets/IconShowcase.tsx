import React from 'react';
import { interpolate, useCurrentFrame, spring } from 'remotion';
import z from 'zod';
import { IconAsset } from '../../../core/assets/IconAsset';
import { TextStagger } from '../text/TextStagger';
import { useStyleContext } from '../../../styles/StyleContext';
import { usePatchedProp, useStyleOverride } from '../../../patches';
import { useAspectPreset } from '../../../styles';
import { useTheme } from '../../../theme';
import { TypographyVariant, TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens/semantic';
import type { ComponentRegistration } from '../../../registry/registry';
import type { DurationResult } from '../durationTypes';
import { IconName, IconNameSchema } from '../types';

// Default constants
const DEFAULT_ENTRANCE_DURATION = 10;
const DEFAULT_ICON_STAGGER = 5;
const DEFAULT_ICON_ANIMATION_DURATION = 10;
const DEFAULT_TEXT_DELAY = 5;
const DEFAULT_VARIANT = 'heading' as const;
const DEFAULT_ICON_SIZE = 72;
const DEFAULT_ICON_GAP = 64;

export interface IconShowcaseProps {
    id?: string;
    /** Array of icon names to display (e.g., ["react", "typescript", "nodejs"]) */
    icons: IconName[];
    /** Text to display below icons */
    text: string;
    /** Typography variant for text */
    variant?: TypographyVariant;
    /** Icon size in pixels */
    iconSize?: number;
    /** Gap between icons in pixels */
    iconGap?: number;
    /** Frame at which animation starts */
    startAt?: number;
    className?: string;
    style?: React.CSSProperties;
}

export const IconShowcase: React.FC<IconShowcaseProps> = ({
    id,
    icons,
    text,
    variant,
    iconSize,
    iconGap,
    startAt,
    className,
    style,
}) => {
    const frame = useCurrentFrame();
    const styleConfig = useStyleContext();
    const theme = useTheme();
    const preset = useAspectPreset();
    const styleOverride = useStyleOverride(id);

    // Apply defaults
    const actualStartAt = startAt ?? 0;
    const actualIconSize = iconSize ?? DEFAULT_ICON_SIZE;
    const actualIconGap = iconGap ?? DEFAULT_ICON_GAP;
    const actualVariant = variant ?? DEFAULT_VARIANT;

    // Animation timing
    const localFrame = frame - actualStartAt;
    const entranceDuration = DEFAULT_ENTRANCE_DURATION;
    const iconStagger = DEFAULT_ICON_STAGGER;
    const iconAnimDuration = DEFAULT_ICON_ANIMATION_DURATION;

    // Calculate when all icons are visible
    const allIconsVisibleFrame = entranceDuration + (icons.length - 1) * iconStagger + iconAnimDuration;
    const textStartFrame = allIconsVisibleFrame + DEFAULT_TEXT_DELAY;

    // Container entrance animation (fade in)
    const containerOpacity = interpolate(
        localFrame,
        [0, entranceDuration],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    // Vertical shift when text appears (move icons up to center everything)
    const hasText = text && text.trim().length > 0;
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
            id={id}
            className={className}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                opacity: containerOpacity,
                ...style,
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
                    transition: 'transform 0.3s ease-out',
                }}
            >
                {icons.map((iconName, index) => {
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
                            key={`${iconName}-${index}`}
                            style={{
                                transform: `scale(${scale}) rotate(${rotation}deg)`,
                                opacity,
                            }}
                        >
                            <IconAsset
                                name={iconName}
                                size={actualIconSize}
                                id={id ? `${id}-icon-${index}` : undefined}
                            />
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
                        text={text}
                        animation='slideRight'
                        variant={actualVariant}
                        startAt={actualStartAt + textStartFrame}
                        id={id ? `${id}-text` : undefined}
                    />
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Zod Schema
// ============================================================================

export const IconShowcaseSchema = z.object({
    icons: z.array(IconNameSchema).min(2, "at least two icons are required"),
    text: z.string().min(1, "text cannot be empty"),
    variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).default(DEFAULT_VARIANT).optional(),
    iconSize: z.number().min(1, "iconSize must be positive").default(DEFAULT_ICON_SIZE).optional(),
    iconGap: z.number().min(0, "iconGap cannot be negative").default(DEFAULT_ICON_GAP).optional(),
    style: z.any().optional(),
});

// ============================================================================
// Duration Calculator
// ============================================================================

export function calculateIconShowcaseDuration(props: Record<string, any>): DurationResult {
    const validation = IconShowcaseSchema.safeParse(props);

    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return {
            success: false,
            error: firstError.message,
            field: firstError.path[0] as string,
        };
    }

    const validated = validation.data;

    // Calculate duration based on animation sequence
    const entranceDuration = DEFAULT_ENTRANCE_DURATION;
    const iconStagger = DEFAULT_ICON_STAGGER;
    const iconAnimDuration = DEFAULT_ICON_ANIMATION_DURATION;
    const iconCount = validated.icons.length;

    // Time until all icons are visible
    const allIconsVisibleFrame = entranceDuration + (iconCount - 1) * iconStagger + iconAnimDuration;

    // Add text delay + text animation duration (text is now mandatory)
    {
        const textDelay = DEFAULT_TEXT_DELAY;
        const textMoveUpDuration = 15;

        // Text stagger duration: word count based
        const words = validated.text.trim().split(/\s+/);
        const wordCount = words.length;
        const textStaggerDelay = 5; // from TextStagger defaults
        const textWordDuration = 15; // from TextStagger defaults
        const textDuration = (wordCount - 1) * textStaggerDelay + textWordDuration;

        return {
            success: true,
            duration: Math.ceil(allIconsVisibleFrame + textDelay + textMoveUpDuration + textDuration),
        };
    }
}

// ============================================================================
// Registry Descriptor
// ============================================================================

export const IconShowcaseDescriptor: ComponentRegistration = {
    name: 'IconShowcase',
    type: 'scene',
    fullSchema: IconShowcaseSchema,
    editorProps: ['icons', 'text', 'variant', 'iconSize', 'iconGap'],
    description: 'Displays a row of animated icons representing technologies, social proof, integrations, or partners with a short descriptive text. Required props: icons={["shopify", "midjourney", "openai"]}, text="Startups are getting 10× productivity with Cursor".',
    calculateDuration: calculateIconShowcaseDuration,
};
