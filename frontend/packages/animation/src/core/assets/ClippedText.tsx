import React, { useMemo } from 'react';
import {
  type UseTextMeasurementResult,
  useTextMeasurement,
} from './useTextMeasurement';
import { Text, type TextProps } from './Text';

const MIN_VERTICAL_SAFETY_PX = 2;
const HORIZONTAL_SAFETY_PX = 6;
const FONT_METRIC_PROBE_TEXT = 'HgjpqyQÅ';

/**
 * `ClippedText` is the safe default for any text that will be partially clipped,
 * revealed, or moved inside an overflow-hidden viewport.
 *
 * Use `Text` when the whole text stays fully visible.
 * Use `ClippedText` when a scene animates text through a clipped wrapper
 * (for example width reveals, masked word entrances, slide-through viewports,
 * or split text effects).
 *
 * Responsibilities handled here:
 * - separates the clipping layer from the moving text layer
 * - measures text height using Remotion utilities
 * - adds strict vertical safety padding using canvas ink bounds for difficult fonts
 *
 * Prop guidance:
 * - `text` is the only required prop; most scenes should rely on `ClippedText`
 *   to measure its own bounds from `text` + `style`
 * - `textMeasurement` is an optional shared measurement helper for performance-
 *   sensitive scenes rendering many `ClippedText` siblings with the same style
 * - `measuredWidthPx` is an optional escape hatch for scenes that already need
 *   per-word width for their own choreography math and want to avoid measuring
 *   the same string twice; most scenes should omit it
 *
 * Scene responsibilities that stay outside this component:
 * - timing, easing, opacity
 * - transforms / choreography
 * - line breaking and overall layout
 * - width calculations used for scene-specific animation math
 */
export interface ClippedTextProps {
  id?: string;
  text: string;
  variant?: TextProps['variant'];
  style?: React.CSSProperties;
  className?: string;
  inline?: boolean;
  clipStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  textMeasurement?: UseTextMeasurementResult;
  measuredWidthPx?: number;
}

function parseRequestedWidth(value: React.CSSProperties['maxWidth']): number | null {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    if (value === 'none') {
      return Number.POSITIVE_INFINITY;
    }

    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function parsePixelValue(value: React.CSSProperties['fontSize'], fallback: number): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function parseLineHeightPx(
  value: React.CSSProperties['lineHeight'],
  fontSizePx: number,
): number {
  if (typeof value === 'number') {
    return value > 8 ? value : value * fontSizePx;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return value.endsWith('px') || parsed > 8 ? parsed : parsed * fontSizePx;
    }
  }

  return fontSizePx * 1.2;
}

function buildCanvasFont(style: React.CSSProperties, fontSizePx: number): string {
  const fontStyle = typeof style.fontStyle === 'string' ? style.fontStyle : 'normal';
  const fontVariant = typeof style.fontVariant === 'string' ? style.fontVariant : 'normal';
  const fontWeight = typeof style.fontWeight === 'string' || typeof style.fontWeight === 'number'
    ? String(style.fontWeight)
    : '400';
  const fontFamily = typeof style.fontFamily === 'string' && style.fontFamily.trim().length > 0
    ? style.fontFamily
    : 'sans-serif';

  return `${fontStyle} ${fontVariant} ${fontWeight} ${fontSizePx}px ${fontFamily}`;
}

function measureInkBoundsHeight(text: string, style: React.CSSProperties, fontSizePx: number): number | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  context.font = buildCanvasFont(style, fontSizePx);

  const measured = context.measureText(text || FONT_METRIC_PROBE_TEXT);
  const probe = context.measureText(FONT_METRIC_PROBE_TEXT);
  const ascent = Math.max(measured.actualBoundingBoxAscent || 0, probe.actualBoundingBoxAscent || 0);
  const descent = Math.max(measured.actualBoundingBoxDescent || 0, probe.actualBoundingBoxDescent || 0);
  const height = ascent + descent;

  return height > 0 ? height : null;
}

function measureInkBoundsWidth(text: string, style: React.CSSProperties, fontSizePx: number): number | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  context.font = buildCanvasFont(style, fontSizePx);

  const measured = context.measureText(text || FONT_METRIC_PROBE_TEXT);
  const width = (measured.actualBoundingBoxLeft || 0) + (measured.actualBoundingBoxRight || 0);

  return width > 0 ? width : null;
}

interface ClippedTextLayoutProps extends ClippedTextProps {
  textMeasurement: UseTextMeasurementResult;
}

function ClippedTextLayout({
  id,
  text,
  variant,
  style,
  className,
  inline = true,
  clipStyle,
  contentStyle,
  textMeasurement,
  measuredWidthPx,
}: ClippedTextLayoutProps): React.ReactElement {
  const display = inline ? 'inline-block' : 'block';
  const { maxWidth: clipMaxWidth, overflow: _ignoredOverflow, ...clipStyleWithoutMaxWidth } = clipStyle ?? {};
  const resolvedMeasuredWidth = measuredWidthPx ?? textMeasurement.width(text);

  const clipMetrics = useMemo(() => {
    const resolvedStyle = style ?? {};
    const fontSizePx = parsePixelValue(resolvedStyle.fontSize, 96);
    const lineHeightPx = parseLineHeightPx(resolvedStyle.lineHeight, fontSizePx);
    const fallbackPaddingPx = Math.max(MIN_VERTICAL_SAFETY_PX, Math.ceil(fontSizePx * 0.04));
    const measured = textMeasurement.ready ? textMeasurement.box(text) : null;
    const inkBoundsHeightPx = textMeasurement.ready ? measureInkBoundsHeight(text, resolvedStyle, fontSizePx) : null;
    const inkBoundsWidthPx = textMeasurement.ready ? measureInkBoundsWidth(text, resolvedStyle, fontSizePx) : null;
    const measuredHeightPx = Math.max(
      lineHeightPx,
      measured?.height ?? 0,
      inkBoundsHeightPx ?? 0,
    );
    const overflowPx = Math.max(0, measuredHeightPx - lineHeightPx);
    const extraPaddingPx = Math.ceil(overflowPx / 2);

    return {
      safeWidthPx: Math.max(
        resolvedMeasuredWidth,
        measured?.width ?? 0,
        inkBoundsWidthPx ?? 0,
      ),
      paddingTopPx: fallbackPaddingPx + extraPaddingPx,
      paddingBottomPx: fallbackPaddingPx + extraPaddingPx,
    };
  }, [resolvedMeasuredWidth, style, text, textMeasurement]);
  const measuredWidth = Math.ceil(clipMetrics.safeWidthPx) + HORIZONTAL_SAFETY_PX;
  const requestedWidth = parseRequestedWidth(clipMaxWidth);
  const layoutWidth = requestedWidth === Number.POSITIVE_INFINITY
    ? (textMeasurement.ready ? measuredWidth : null)
    : requestedWidth === null
      ? null
      : Math.max(0, Math.ceil(requestedWidth) + HORIZONTAL_SAFETY_PX);

  return (
    <span
      style={{
        display,
        overflow: 'visible',
        whiteSpace: 'nowrap',
        verticalAlign: 'top',
        lineHeight: 'inherit',
        paddingTop: clipMetrics.paddingTopPx,
        paddingBottom: clipMetrics.paddingBottomPx,
        ...style,
        ...clipStyleWithoutMaxWidth,
      }}
    >
      <span
        style={{
          display,
          whiteSpace: 'nowrap',
          verticalAlign: 'top',
          width: layoutWidth !== null ? layoutWidth : undefined,
        }}
      >
        <span
          style={{
            display,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            verticalAlign: 'top',
            width: layoutWidth !== null ? layoutWidth : undefined,
            paddingTop: clipMetrics.paddingTopPx,
            paddingBottom: clipMetrics.paddingBottomPx,
            marginTop: -clipMetrics.paddingTopPx,
            marginBottom: -clipMetrics.paddingBottomPx,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              whiteSpace: 'nowrap',
              ...contentStyle,
            }}
          >
            <Text
              id={id}
              text={text}
              variant={variant}
              className={className}
              style={style}
            />
          </span>
        </span>
      </span>
    </span>
  );
}

export function ClippedText({
  textMeasurement: providedTextMeasurement,
  ...props
}: ClippedTextProps): React.ReactElement {
  if (providedTextMeasurement) {
    return <ClippedTextLayout {...props} textMeasurement={providedTextMeasurement} />;
  }

  return <ClippedTextWithOwnedMeasurement {...props} />;
}

function ClippedTextWithOwnedMeasurement(props: ClippedTextProps): React.ReactElement {
  const ownedTextMeasurement = useTextMeasurement(props.style);

  return <ClippedTextLayout {...props} textMeasurement={ownedTextMeasurement} />;
}
