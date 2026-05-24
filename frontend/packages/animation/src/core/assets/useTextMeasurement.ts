import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { measureText, type Dimensions } from '@remotion/layout-utils';
import { continueRender, delayRender, getRemotionEnvironment } from 'remotion';
import { getPrimaryFontFamily, loadFontViaStylesheet, waitForFontAvailability } from '../../patches/font';

/**
 * Shared text measurement utilities for animation scenes and assets.
 *
 * Use `useTextMeasurement(style)` in React components when text metrics affect
 * layout and should stay aware of font loading. This is the intended choice for
 * animated scenes because it:
 * - tracks font readiness internally
 * - delays Remotion render internally when needed
 * - exposes stable `width()` / `box()` helpers
 *
 * Future scene code should be structured around this hook so text measurement
 * stays font-aware by default and scene authors do not need to think about
 * loading timing or fallback metrics manually.
 *
 * Scenes should treat this hook as "measure now with fallback, improve when the
 * font is ready." Font readiness remains an internal concern of the hook.
 */
export interface UseTextMeasurementResult {
  ready: boolean;
  width: (text: string) => number;
  box: (text: string) => Dimensions;
}

const FONT_VALIDATION_PROBE_TEXT = 'Hamburgefonsiv';
const FONT_MEASUREMENT_TIMEOUT_MS = 4000;
const announcedReadyKeys = new Set<string>();

function normalizeFontSize(value: React.CSSProperties['fontSize']): number | string {
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }

  return 96;
}

function normalizeLetterSpacing(
  value: React.CSSProperties['letterSpacing'],
): string | undefined {
  if (typeof value === 'number') {
    return `${value}px`;
  }

  if (typeof value === 'string') {
    return value;
  }

  return undefined;
}

function getTextMeasurementConfig(style?: React.CSSProperties) {
  const normalizedStyle = style ?? {};
  const fontFamily = typeof normalizedStyle.fontFamily === 'string'
    ? getPrimaryFontFamily(normalizedStyle.fontFamily)
    : '';

  return {
    fontFamily,
    fontSize: normalizeFontSize(normalizedStyle.fontSize),
    fontWeight: typeof normalizedStyle.fontWeight === 'string' || typeof normalizedStyle.fontWeight === 'number'
      ? normalizedStyle.fontWeight
      : undefined,
    letterSpacing: normalizeLetterSpacing(normalizedStyle.letterSpacing),
    textTransform: normalizedStyle.textTransform as Parameters<typeof measureText>[0]['textTransform'],
    additionalStyles: {
      fontStyle: typeof normalizedStyle.fontStyle === 'string' ? normalizedStyle.fontStyle : undefined,
      fontVariant: typeof normalizedStyle.fontVariant === 'string' ? normalizedStyle.fontVariant : undefined,
      lineHeight: typeof normalizedStyle.lineHeight === 'string' || typeof normalizedStyle.lineHeight === 'number'
        ? normalizedStyle.lineHeight
        : undefined,
    },
  };
}

export function measureTextWithStyle(
  text: string,
  style?: React.CSSProperties,
  validateFontIsLoaded = false,
): Dimensions {
  if (typeof document === 'undefined') {
    return { width: 0, height: 0 };
  }

  return measureText({
    text,
    ...getTextMeasurementConfig(style),
    validateFontIsLoaded,
  });
}

function isFontMeasurementReady(
  config: Omit<Parameters<typeof measureText>[0], 'validateFontIsLoaded' | 'text'>,
): boolean {
  try {
    measureText({
      ...config,
      text: FONT_VALIDATION_PROBE_TEXT,
      validateFontIsLoaded: true,
    });
    return true;
  } catch {
    return false;
  }
}

async function waitForValidatedMeasurement(
  config: Omit<Parameters<typeof measureText>[0], 'validateFontIsLoaded' | 'text'>,
  timeoutMs = FONT_MEASUREMENT_TIMEOUT_MS,
): Promise<boolean> {
  if (typeof document === 'undefined') {
    return true;
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (isFontMeasurementReady(config)) {
      return true;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }

  return isFontMeasurementReady(config);
}

export function useTextMeasurement(style?: React.CSSProperties): UseTextMeasurementResult {
  const { isRendering } = getRemotionEnvironment();
  const styleFontFamily = style?.fontFamily;
  const styleFontSize = style?.fontSize;
  const styleFontWeight = style?.fontWeight;
  const styleLetterSpacing = style?.letterSpacing;
  const styleTextTransform = style?.textTransform;
  const styleFontStyle = style?.fontStyle;
  const styleFontVariant = style?.fontVariant;
  const styleLineHeight = style?.lineHeight;
  const normalizedStyle = style ?? {};
  const sharedMeasureConfig = useMemo(
    () => getTextMeasurementConfig(normalizedStyle),
    [
      styleFontFamily,
      styleFontSize,
      styleFontWeight,
      styleLetterSpacing,
      styleTextTransform,
      styleFontStyle,
      styleFontVariant,
      styleLineHeight,
    ],
  );
  const fontFamily = sharedMeasureConfig.fontFamily;
  const fontWeight = styleFontWeight;
  const readinessKey = `${fontFamily}::${fontWeight ?? 400}`;
  const [loadedReadinessKey, setLoadedReadinessKey] = useState(() => (!fontFamily ? readinessKey : null));
  const ready = !fontFamily || loadedReadinessKey === readinessKey;

  useEffect(() => {
    let disposed = false;
    const renderHandle = isRendering && fontFamily
      ? delayRender(`Loading font for measurement: ${readinessKey}`)
      : null;
    let released = false;
    const releaseRenderHandle = () => {
      if (!released && renderHandle !== null) {
        continueRender(renderHandle);
        released = true;
      }
    };

    if (!fontFamily) {
      setLoadedReadinessKey(readinessKey);
      releaseRenderHandle();
      return () => {
        disposed = true;
        releaseRenderHandle();
      };
    }

    const waitForReady = isRendering
      ? waitForValidatedMeasurement(sharedMeasureConfig)
      : loadFontViaStylesheet(fontFamily)
        .then(() => waitForFontAvailability(fontFamily, fontWeight))
        .then((isAvailable) => {
          if (!isAvailable) {
            return false;
          }

          return waitForValidatedMeasurement(sharedMeasureConfig);
        });

    waitForReady
      .then((isAvailable) => {
        releaseRenderHandle();

        if (disposed) {
          return;
        }

        if (isAvailable && isFontMeasurementReady(sharedMeasureConfig)) {
          setLoadedReadinessKey(readinessKey);
          if (!announcedReadyKeys.has(readinessKey)) {
            announcedReadyKeys.add(readinessKey);
            console.info(`[useTextMeasurement] Font ready for measurement: ${readinessKey}`);
          }
          return;
        }

        setLoadedReadinessKey(null);
        console.warn(
          `[useTextMeasurement] Font was not available in time for measurement: ${readinessKey}`,
        );
      })
      .catch(() => {
        releaseRenderHandle();

        if (disposed) {
          return;
        }

        setLoadedReadinessKey(null);
      });

    return () => {
      disposed = true;
      releaseRenderHandle();
    };
  }, [fontFamily, fontWeight, isRendering, readinessKey, sharedMeasureConfig]);

  const box = useCallback((text: string): Dimensions => {
    if (typeof document === 'undefined') {
      return { width: 0, height: 0 };
    }

    return measureText({
      text,
      ...sharedMeasureConfig,
      validateFontIsLoaded: ready,
    });
  }, [ready, sharedMeasureConfig]);

  const width = useCallback((text: string): number => box(text).width, [box]);

  return {
    ready,
    width,
    box,
  };
}
