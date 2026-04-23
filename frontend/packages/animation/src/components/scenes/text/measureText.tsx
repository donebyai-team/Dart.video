export function normalizeMeasuredText(text: string, textTransform: React.CSSProperties['textTransform']): string {
    switch (textTransform) {
        case 'uppercase':
            return text.toUpperCase();
        case 'lowercase':
            return text.toLowerCase();
        case 'capitalize':
            return text.replace(/\b\w/g, (char) => char.toUpperCase());
        default:
            return text;
    }
}

export function parsePixelValue(value: React.CSSProperties['fontSize'], fallback: number): number {
    if (typeof value === 'number') {
        return value;
    }

    if (typeof value === 'string') {
        if (value.endsWith('px')) {
            const parsed = Number.parseFloat(value);
            return Number.isFinite(parsed) ? parsed : fallback;
        }

        if (value.endsWith('em')) {
            const parsed = Number.parseFloat(value);
            return Number.isFinite(parsed) ? parsed * fallback : fallback;
        }
    }

    return fallback;
}

export function parseLetterSpacing(value: React.CSSProperties['letterSpacing'], fontSizePx: number): number {
    if (typeof value === 'number') {
        return value;
    }

    if (typeof value === 'string') {
        if (value.endsWith('px')) {
            const parsed = Number.parseFloat(value);
            return Number.isFinite(parsed) ? parsed : 0;
        }

        if (value.endsWith('em')) {
            const parsed = Number.parseFloat(value);
            return Number.isFinite(parsed) ? parsed * fontSizePx : 0;
        }
    }

    return 0;
}

export function measureTextWidth(text: string, style: React.CSSProperties): number {
    if (typeof document === 'undefined') {
        return text.length * 16;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        return text.length * 16;
    }

    const fontSizePx = parsePixelValue(style.fontSize, 16);
    const fontStyle = typeof style.fontStyle === 'string' ? style.fontStyle : 'normal';
    const fontVariant = typeof style.fontVariant === 'string' ? style.fontVariant : 'normal';
    const fontWeight = typeof style.fontWeight === 'string' || typeof style.fontWeight === 'number'
        ? String(style.fontWeight)
        : '400';
    const fontFamily = typeof style.fontFamily === 'string' ? style.fontFamily : 'sans-serif';
    const measuredText = normalizeMeasuredText(text, style.textTransform);
    const letterSpacingPx = parseLetterSpacing(style.letterSpacing, fontSizePx);

    context.font = `${fontStyle} ${fontVariant} ${fontWeight} ${fontSizePx}px ${fontFamily}`;

    const baseWidth = context.measureText(measuredText).width;
    const spacingWidth = Math.max(0, measuredText.length - 1) * letterSpacingPx;
    return baseWidth + spacingWidth;
}