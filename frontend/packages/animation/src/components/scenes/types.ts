export const ENTRANCE_ANIMATIONS = [
    'fadeIn',
    'slideUp',
    'slideDown',
    'slideLeft',
    'slideRight',
    'scaleIn',
    'rotateIn',
    'tiltX',
    'tiltY',
    'flipX',
    'flipY',
    'elasticScale',
    'swingIn',
    'zoomIn',
    'zoomOut'
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

export const HIGHLIGHTED_TEXT_ANIMATIONS = ['none', 'zoom', 'jump', 'elasticStretch'] as const;

export type Direction = typeof DIRECTIONS[number];

export type HighlightedTextAnimation = typeof HIGHLIGHTED_TEXT_ANIMATIONS[number];

export const SPLIT_BY_MODES = ['char', 'word', 'line'] as const;

export type SplitByMode = typeof SPLIT_BY_MODES[number];

export const HIGHLIGHT_STYLES = ['marker', 'underline', 'box', 'glow', 'background'] as const;

export type HighlightStyle = typeof HIGHLIGHT_STYLES[number];

export const TEXT_CYCLE_TRANSITIONS = ['flipY', 'fadeSwap', 'slideUp'] as const;

export type TextCycleTransition = typeof TEXT_CYCLE_TRANSITIONS[number];

export function getEntranceTransform(
    animation: EntranceAnimation,
    progress: number,
    distance: number = 200,
): string {
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
        case 'tiltX':
            return `perspective(800px) rotateX(${inv * 90}deg)`;
        case 'tiltY':
            return `perspective(800px) rotateY(${inv * 90}deg)`;
        case 'flipX':
            return `perspective(800px) rotateX(${inv * 180}deg)`;
        case 'flipY':
            return `perspective(800px) rotateY(${inv * 180}deg)`;
        case 'elasticScale': {
            const elastic = 1 + Math.sin(progress * Math.PI * 3) * inv * 0.3;
            return `scale(${progress * elastic})`;
        }
        case 'swingIn':
            return `perspective(800px) rotateY(${inv * 70}deg) translateX(${inv * -100}px)`;
        case 'zoomIn':
            return `scale(${3 - progress * 2})`;    
        case 'zoomOut':
        return `scale(${1 + progress * 2})`;    
        case 'fadeIn':
        default:
            return 'none';
    }
}

export function getHighlightedTextAnimationTransform(
    animation: HighlightedTextAnimation,
    progress: number,
): string {
    const clampedProgress = Math.max(0, Math.min(1, progress));

    switch (animation) {
        case 'zoom':
            return `scale(${1 + clampedProgress * 9})`;
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
