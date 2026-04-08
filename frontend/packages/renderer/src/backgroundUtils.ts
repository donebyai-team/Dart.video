import { BackgroundStyle, Gradient, BackgroundPattern } from '@coasterai/pb/coasterai/core/v1/slide_pb';

export function gradientToCSS(g: Gradient): string {
  const stops = g.stops.map((s) => `${s.color} ${s.position}%`).join(', ');
  return `linear-gradient(${g.angle}deg, ${stops})`;
}

/**
 * Pattern SVG definitions - inline SVGs encoded as data URIs for use in CSS backgrounds
 */
const PATTERN_SVGS: Record<BackgroundPattern, (color: string) => string> = {
  [BackgroundPattern.NONE]: () => '',
  
  [BackgroundPattern.DOTS]: (color: string) => 
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="2" cy="2" r="1.5" fill="${color}"/></svg>`,
  
  [BackgroundPattern.GRID]: (color: string) => 
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><path d="M0 0h40v40H0z" fill="none" stroke="${color}" stroke-width="1"/></svg>`,
  
  [BackgroundPattern.DIAGONAL_LINES]: (color: string) => 
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><path d="M-5 5l10-10M0 20L20 0M15 25l10-10" stroke="${color}" stroke-width="1"/></svg>`,
  
  [BackgroundPattern.CROSS_HATCH]: (color: string) => 
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><path d="M0 0l20 20M20 0L0 20" stroke="${color}" stroke-width="1"/></svg>`,
  
  [BackgroundPattern.CIRCLES]: (color: string) => 
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="8" fill="none" stroke="${color}" stroke-width="1"/></svg>`,
  
  [BackgroundPattern.HEXAGONS]: (color: string) => 
    `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="100"><path d="M28 66L0 50V16L28 0l28 16v34L28 66zM28 100L0 84V50l28-16 28 16v34l-28 16z" fill="none" stroke="${color}" stroke-width="1"/></svg>`,
  
  [BackgroundPattern.TRIANGLES]: (color: string) => 
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><path d="M20 0L40 40H0z" fill="none" stroke="${color}" stroke-width="1"/></svg>`,
  
  [BackgroundPattern.WAVES]: (color: string) => 
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><path d="M0 10c5-5 15-5 20 0s15 5 20 0" fill="none" stroke="${color}" stroke-width="1.5"/></svg>`,
};

/**
 * Converts a pattern enum to a CSS background-image value
 */
export function patternToCSS(
  pattern: BackgroundPattern,
  color: string = '#ffffff',
  opacity: number = 0.1
): string {
  if (pattern === BackgroundPattern.NONE) {
    return 'none';
  }

  const svgFn = PATTERN_SVGS[pattern];
  if (!svgFn) return 'none';

  // Apply opacity to color
  const colorWithOpacity = hexToRgba(color, opacity);
  const svg = svgFn(colorWithOpacity);
  const encoded = encodeURIComponent(svg);
  
  return `url("data:image/svg+xml,${encoded}")`;
}

/**
 * Convert hex color to rgba with opacity
 */
function hexToRgba(hex: string, opacity: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(255, 255, 255, ${opacity})`;
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Get pattern info for UI display
 */
export const PATTERN_OPTIONS: { value: BackgroundPattern; label: string }[] = [
  { value: BackgroundPattern.NONE, label: 'None' },
  { value: BackgroundPattern.DOTS, label: 'Dots' },
  { value: BackgroundPattern.GRID, label: 'Grid' },
  { value: BackgroundPattern.DIAGONAL_LINES, label: 'Diagonal Lines' },
  { value: BackgroundPattern.CROSS_HATCH, label: 'Cross Hatch' },
  { value: BackgroundPattern.CIRCLES, label: 'Circles' },
  { value: BackgroundPattern.HEXAGONS, label: 'Hexagons' },
  { value: BackgroundPattern.TRIANGLES, label: 'Triangles' },
  { value: BackgroundPattern.WAVES, label: 'Waves' },
];

/**
 * Converts a BackgroundStyle proto to a CSS background value.
 * Includes pattern overlay if specified.
 */
export function backgroundStyleToCSS(
  style?: BackgroundStyle | null,
  fallbackColor: string = 'transparent',
): string {
  if (!style?.style?.case) {
    return fallbackColor;
  }

  let baseBackground: string;
  switch (style.style.case) {
    case 'solid':
      baseBackground = style.style.value.hex || fallbackColor;
      break;
    case 'gradient':
      baseBackground = gradientToCSS(style.style.value);
      break;
    case 'image':
      baseBackground = `url("${style.style.value.url}") center / cover no-repeat`;
      break;
    default:
      baseBackground = fallbackColor;
  }

  // Add pattern overlay if specified
  if (style.pattern != null && style.pattern !== BackgroundPattern.NONE) {
    const primaryColor = getPrimaryColorFromStyle(style);
    const patternColor = getContrastingPatternColor(primaryColor);
    const patternOpacity = style.patternOpacity ?? 0.1;
    const patternCss = patternToCSS(style.pattern, patternColor, patternOpacity);
    
    if (patternCss !== 'none') {
      // Pattern on top, base background below
      return `${patternCss} repeat, ${baseBackground}`;
    }
  }

  return baseBackground;
}

/**
 * Get the primary color from a BackgroundStyle for pattern contrast calculation
 */
function getPrimaryColorFromStyle(style?: BackgroundStyle | null): string {
  if (!style?.style?.case) return '#000000';
  
  switch (style.style.case) {
    case 'solid':
      return style.style.value.hex || '#000000';
    case 'gradient':
      return style.style.value.stops[0]?.color || '#000000';
    default:
      return '#000000';
  }
}

/**
 * Calculate relative luminance of a hex color
 */
function getLuminance(hex: string): number {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 0;
  
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Get contrasting pattern color (white for dark backgrounds, black for light)
 */
function getContrastingPatternColor(bgColor: string): string {
  const luminance = getLuminance(bgColor);
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export { BackgroundPattern };
