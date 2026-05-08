import { Easing } from "remotion";
import {
    TEXT_ENTRANCE_PRESETS,
    TEXT_EXIT_PRESETS,
    getTextMotionTransform,
    type TextEntrancePresetName,
    type TextExitPresetName,
} from "../../core/assets";

export const ENTRANCE_ANIMATIONS = TEXT_ENTRANCE_PRESETS;

export type EntranceAnimation = TextEntrancePresetName;

export const EXIT_ANIMATIONS = TEXT_EXIT_PRESETS;

export type ExitAnimation = TextExitPresetName;

export const LOGO_ANIMATIONS = [
    'none',
    'fadeIn',
    'zoomIn',
    'bounceIn',
    'spinIn',
    'dropIn',
] as const;

export type LogoAnimation = typeof LOGO_ANIMATIONS[number];

export const DIRECTIONS = [
    'left',
    'right',
    'up',
    'down',
] as const;

export const HIGHLIGHTED_TEXT_ANIMATIONS = ['none', 'zoom', 'jump', 'elasticStretch'] as const;

export type Direction = typeof DIRECTIONS[number];

export type HighlightedTextAnimation = typeof HIGHLIGHTED_TEXT_ANIMATIONS[number];

export const SPLIT_BY_MODES = ['char', 'word', 'line'] as const;

export type SplitByMode = typeof SPLIT_BY_MODES[number];

export const HIGHLIGHT_STYLES = ['simple', 'marker', 'underline', 'box', 'glow', 'background'] as const;

export type HighlightStyle = typeof HIGHLIGHT_STYLES[number];

export const TEXT_CYCLE_TRANSITIONS = ['flipY', 'fadeSwap', 'slideUp'] as const;

export type TextCycleTransition = typeof TEXT_CYCLE_TRANSITIONS[number];

export function getEntranceTransform(
    animation: EntranceAnimation,
    progress: number,
    distance: number = 200,
): string {
    return getTextMotionTransform(animation, 'entrance', progress, distance);
}

export function getExitTransform(
    animation: ExitAnimation,
    progress: number,
    distance: number = 200,
): string {
    return getTextMotionTransform(animation, 'exit', progress, distance);
}

export function getHighlightedTextAnimationTransform(
    animation: HighlightedTextAnimation,
    progress: number,
): string {
    const clampedProgress = Math.max(0, Math.min(1, progress));

    switch (animation) {
        case 'zoom':
            const eased = Easing.in(Easing.exp)(clampedProgress);
            return `scale(${1 + eased * 10})`;
        case 'jump': {
            const jumpHeight = -18 * Math.sin(clampedProgress * Math.PI);
            return `translateY(${jumpHeight}px)`;
        }
        case 'elasticStretch': {
            const decay = 1 - clampedProgress;
            const wave = Math.sin(clampedProgress * Math.PI * 3);
            const stretch = 1 + wave * decay * 0.28;
            const squash = 1 - wave * decay * 0.12;

            return `scaleX(${stretch}) scaleY(${squash})`;
        }
        case 'none':
        default:
            return 'none';
    }
}
