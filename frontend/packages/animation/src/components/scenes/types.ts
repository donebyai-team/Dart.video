import z from "zod";

export const ENTRANCE_ANIMATIONS = [
    'fadeIn',
    'slideUp',
    'slideDown',
    'slideLeft',
    'slideRight',
    'scaleIn',
    'rotateIn',
] as const;

export type EntranceAnimation = typeof ENTRANCE_ANIMATIONS[number];

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

export type Direction = typeof DIRECTIONS[number];

export const SPLIT_BY_MODES = ['char', 'word', 'line'] as const;

export type SplitByMode = typeof SPLIT_BY_MODES[number];

export const HIGHLIGHT_STYLES = ['marker', 'underline', 'box', 'glow', 'background'] as const;

export type HighlightStyle = typeof HIGHLIGHT_STYLES[number];

export const TEXT_CYCLE_TRANSITIONS = ['flipY', 'fadeSwap', 'slideUp'] as const;

export type TextCycleTransition = typeof TEXT_CYCLE_TRANSITIONS[number];


export function getEntranceTransform(animation: EntranceAnimation, progress: number, distance: number = 200): string {
    const inv = 1 - progress;
    switch (animation) {
        case 'slideUp':
            return `translateY(${inv * distance}px)`;
        case 'slideDown':
            return `translateY(${inv * -distance}px)`;
        case 'slideLeft':
            return `translateX(${inv * distance}px)`;
        case 'slideRight':
            return `translateX(${inv * -distance}px)`;
        case 'scaleIn':
            return `scale(${0.5 + progress * 0.5})`;
        case 'rotateIn':
            return `rotate(${inv * 180}deg) scale(${0.5 + progress * 0.5})`;
        case 'fadeIn':
        default:
            return 'none';
    }
}
