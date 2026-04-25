import type React from 'react';

export type ContainerStyleDefaults = {
  backgroundColor: string;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  padding: number;
  gap: number;
  boxShadow?: string;
};

export type ContainerStylePatch = Partial<
  Pick<
    React.CSSProperties,
    'backgroundColor' | 'borderRadius' | 'borderWidth' | 'borderColor' | 'padding' | 'gap' | 'boxShadow'
  >
>;

export type NormalizedContainerStyle = ContainerStyleDefaults & {
  style: React.CSSProperties;
};

export function parseContainerNumber(
  value: React.CSSProperties['borderRadius'] | React.CSSProperties['borderWidth'] | React.CSSProperties['padding'] | React.CSSProperties['gap'] | undefined,
  fallback: number,
): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

export function normalizeContainerStyle(
  defaults: ContainerStyleDefaults,
  ...overrides: Array<ContainerStylePatch | undefined>
): NormalizedContainerStyle {
  const merged = Object.assign({}, defaults, ...overrides);
  const borderRadius = parseContainerNumber(merged.borderRadius, defaults.borderRadius);
  const borderWidth = parseContainerNumber(merged.borderWidth, defaults.borderWidth);
  const padding = parseContainerNumber(merged.padding, defaults.padding);
  const gap = parseContainerNumber(merged.gap, defaults.gap);

  return {
    backgroundColor: merged.backgroundColor ?? defaults.backgroundColor,
    borderRadius,
    borderWidth,
    borderColor: merged.borderColor ?? defaults.borderColor,
    padding,
    gap,
    boxShadow: merged.boxShadow ?? defaults.boxShadow,
    style: {
      backgroundColor: merged.backgroundColor ?? defaults.backgroundColor,
      borderRadius,
      borderWidth,
      borderStyle: 'solid',
      borderColor: merged.borderColor ?? defaults.borderColor,
      padding,
      gap,
      boxShadow: merged.boxShadow ?? defaults.boxShadow,
    },
  };
}
