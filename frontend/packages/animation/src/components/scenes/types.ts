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

export const PEEL_DIRECTIONS = [
  'left',
  'right',
  'up',
  'down',
] as const;

export type PeelDirection = typeof PEEL_DIRECTIONS[number];

export const TYPEWRITER_MODES = ['char', 'word', 'line'] as const;

export type TypewriterMode = typeof TYPEWRITER_MODES[number];

export const IconNameSchema = z.string().min(2, "icon name cannot be empty");

export type IconName = z.infer<typeof IconNameSchema>;


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
