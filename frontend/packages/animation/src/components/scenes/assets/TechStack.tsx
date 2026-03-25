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

// Default duration constants
const DEFAULT_ENTRANCE_DURATION = 10;
const DEFAULT_ICON_STAGGER = 5;
const DEFAULT_ICON_ANIMATION_DURATION = 10;
const DEFAULT_TEXT_DELAY = 5;

export interface TechStackProps {
    id?: string;
    /** Array of icon names to display (e.g., ["react", "typescript", "nodejs"]) */
    icons: string[];
    /** Text to display below icons */
    text?: string;
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

export const TechStack: React.FC<TechStackProps> = ({
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
    const actualIconSize = iconSize ?? 72;
    const actualIconGap = iconGap ?? 64;
    const actualVariant = variant ?? 'heading';

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

export const TechStackSchema = z.object({
    icons: z.array(z.string().min(1, "icon name cannot be empty")).min(1, "at least one icon is required"),
    text: z.string().optional(),
    variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).optional(),
    iconSize: z.number().min(1, "iconSize must be positive").optional(),
    iconGap: z.number().min(0, "iconGap cannot be negative").optional(),
    startAt: z.number().min(0, "startAt cannot be negative").default(0).optional(),
    style: z.any().optional(),
});

// ============================================================================
// Duration Calculator
// ============================================================================

export function calculateTechStackDuration(props: Record<string, any>): DurationResult {
    const validation = TechStackSchema.safeParse(props);
    
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
    
    // If there's text, add text delay + text animation duration
    if (validated.text && validated.text.trim().length > 0) {
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
    
    // No text: just icons
    return {
        success: true,
        duration: Math.ceil(allIconsVisibleFrame),
    };
}

// ============================================================================
// Registry Descriptor
// ============================================================================

export const TechStackDescriptor: ComponentRegistration = {
    name: 'TechStack',
    type: 'scene',
    fullSchema: TechStackSchema,
    editorProps: ['icons', 'text', 'variant', 'iconSize', 'iconGap'],
    description: 'Displays technology stack icons with rotating entrance animations followed by optional text. Use for showcasing tools, frameworks, or tech used. Required props: icons={["react", "typescript", "nodejs"]}. Optional: text="Built with modern tools" to add descriptive text below icons.',
    calculateDuration: calculateTechStackDuration,
};
