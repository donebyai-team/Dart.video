import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { measureText, type Dimensions } from '@remotion/layout-utils';
import { continueRender, delayRender, getRemotionEnvironment } from 'remotion';
import { getPrimaryFontFamily, loadFontViaStylesheet, waitForFontAvailability } from '../../patches/font';

export interface UseTextMeasurementResult {
  ready: boolean;
  width: (text: string) => number;
  box: (text: string) => Dimensions;
}

function normalizeFontSize(value: React.CSSProperties['fontSize']): number | string {
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }

  return 96;
}

export function useTextMeasurement(style?: React.CSSProperties): UseTextMeasurementResult {
  const { isRendering } = getRemotionEnvironment();
  const normalizedStyle = style ?? {};
  const fontFamily = typeof normalizedStyle.fontFamily === 'string'
    ? getPrimaryFontFamily(normalizedStyle.fontFamily)
    : '';
  const fontWeight = normalizedStyle.fontWeight;
  const readinessKey = `${fontFamily}::${fontWeight ?? 400}`;
  const [ready, setReady] = useState(!fontFamily);
  const [renderHandle] = useState(() =>
    isRendering && fontFamily ? delayRender(`Loading font for measurement: ${readinessKey}`) : null,
  );

  useEffect(() => {
    let disposed = false;

    if (!fontFamily) {
      setReady(true);
      if (renderHandle !== null) {
        continueRender(renderHandle);
      }
      return () => {
        disposed = true;
      };
    }

    setReady(false);

    loadFontViaStylesheet(fontFamily)
      .then(() => waitForFontAvailability(fontFamily, fontWeight))
      .finally(() => {
        if (disposed) {
          return;
        }

        setReady(true);
        if (renderHandle !== null) {
          continueRender(renderHandle);
        }
      });

    return () => {
      disposed = true;
    };
  }, [fontFamily, fontWeight, renderHandle]);

  const sharedMeasureConfig = useMemo(() => ({
    fontFamily,
    fontSize: normalizeFontSize(normalizedStyle.fontSize),
    fontWeight: typeof normalizedStyle.fontWeight === 'string' || typeof normalizedStyle.fontWeight === 'number'
      ? normalizedStyle.fontWeight
      : undefined,
    letterSpacing: typeof normalizedStyle.letterSpacing === 'string' ? normalizedStyle.letterSpacing : undefined,
    textTransform: normalizedStyle.textTransform as Parameters<typeof measureText>[0]['textTransform'],
    additionalStyles: {
      fontStyle: typeof normalizedStyle.fontStyle === 'string' ? normalizedStyle.fontStyle : undefined,
      fontVariant: typeof normalizedStyle.fontVariant === 'string' ? normalizedStyle.fontVariant : undefined,
      lineHeight: typeof normalizedStyle.lineHeight === 'string' || typeof normalizedStyle.lineHeight === 'number'
        ? normalizedStyle.lineHeight
        : undefined,
    },
  }), [fontFamily, normalizedStyle.fontSize, normalizedStyle.fontWeight, normalizedStyle.letterSpacing, normalizedStyle.textTransform, normalizedStyle.fontStyle, normalizedStyle.fontVariant, normalizedStyle.lineHeight]);

  const box = useCallback((text: string): Dimensions => {
    if (typeof document === 'undefined') {
      return { width: 0, height: 0 };
    }

    return measureText({
      text,
      ...sharedMeasureConfig,
    });
  }, [sharedMeasureConfig]);

  const width = useCallback((text: string): number => box(text).width, [box]);

  return {
    ready,
    width,
    box,
  };
}
