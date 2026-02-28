import { BackgroundStyle, Gradient } from '@coasterai/pb/coasterai/core/v1/slide_pb';

export function gradientToCSS(g: Gradient): string {
  const stops = g.stops.map((s) => `${s.color} ${s.position}%`).join(', ');
  return `linear-gradient(${g.angle}deg, ${stops})`;
}

/**
 * Converts a BackgroundStyle proto to a CSS background value.
 */
export function backgroundStyleToCSS(
  style?: BackgroundStyle | null,
  fallbackColor: string = 'transparent',
): string {
  if (!style?.style?.case) {
    return fallbackColor;
  }

  switch (style.style.case) {
    case 'solid':
      return style.style.value.hex || fallbackColor;

    case 'gradient':
      return gradientToCSS(style.style.value);

    case 'image':
      return `url("${style.style.value.url}") center / cover no-repeat`;

    default:
      return fallbackColor;
  }
}
