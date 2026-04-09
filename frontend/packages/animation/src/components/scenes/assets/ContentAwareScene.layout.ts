import { TypographyVariant, TYPOGRAPHY_VARIANTS } from '../../../tokens/semantic';
import { FONT_SIZE_VALUES, FONT_SCALE_BASE } from '../../../tokens/typography';

export type ContentAwareLayout =
  | 'image-left-text-right'
  | 'image-right-text-left'
  | 'image-top-text-bottom'
  | 'image-bottom-text-top'
  | 'image-background-text-overlay'
  | 'text-top-left-image-bottom-right'
  | 'text-top-right-image-bottom-left';

type TextVisualWeight = 'compact' | 'medium' | 'dominant';
type ImageAspectBucket = 'portrait' | 'square' | 'landscape' | 'very-wide';
type ImageFootprintBucket = 'small' | 'medium' | 'screen';
type TextAnchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface ContentAwareLayoutInput {
  canvasWidth: number;
  canvasHeight: number;
  imageWidth: number;
  imageHeight: number;
  text: string;
  variant: TypographyVariant;
}

export interface ResolvedContentAwareLayout {
  layout: ContentAwareLayout;
  textWidth: number;
  textAnchor: TextAnchor;
  estimatedLines: number;
  textWeight: TextVisualWeight;
  imageAspectBucket: ImageAspectBucket;
}

const VARIANT_WEIGHT: Record<TypographyVariant, TextVisualWeight> = {
  subheading: 'compact',
  heading: 'compact',
  display: 'medium',
  displayLg: 'medium',
  displayXl: 'dominant',
  display2xl: 'dominant',
};

const DEFAULT_TEXT_WIDTH: Record<ContentAwareLayout, number> = {
  'image-left-text-right': 0.4,
  'image-right-text-left': 0.4,
  'image-top-text-bottom': 0.72,
  'image-bottom-text-top': 0.72,
  'image-background-text-overlay': 0.52,
  'text-top-left-image-bottom-right': 0.34,
  'text-top-right-image-bottom-left': 0.34,
};

const WIDENED_TEXT_WIDTH: Record<ContentAwareLayout, number> = {
  'image-left-text-right': 0.48,
  'image-right-text-left': 0.48,
  'image-top-text-bottom': 0.78,
  'image-bottom-text-top': 0.78,
  'image-background-text-overlay': 0.7,
  'text-top-left-image-bottom-right': 0.42,
  'text-top-right-image-bottom-left': 0.42,
};

const TEXT_ANCHOR_BY_LAYOUT: Record<ContentAwareLayout, TextAnchor> = {
  'image-left-text-right': 'center',
  'image-right-text-left': 'center',
  'image-top-text-bottom': 'center',
  'image-bottom-text-top': 'center',
  'image-background-text-overlay': 'top-left',
  'text-top-left-image-bottom-right': 'top-left',
  'text-top-right-image-bottom-left': 'top-right',
};

function getTextWeight(variant: TypographyVariant, text: string): TextVisualWeight {
  const charCount = text.trim().length;
  const baseWeight = VARIANT_WEIGHT[variant];

  if (baseWeight === 'compact' && charCount > 80) {
    return 'medium';
  }

  if (baseWeight === 'medium' && charCount > 60) {
    return 'dominant';
  }

  return baseWeight;
}

function getImageAspectBucket(imageWidth: number, imageHeight: number): ImageAspectBucket {
  const aspectRatio = imageWidth / imageHeight;

  if (aspectRatio >= 1.9) {
    return 'very-wide';
  }

  if (aspectRatio > 1.1) {
    return 'landscape';
  }

  if (aspectRatio < 0.9) {
    return 'portrait';
  }

  return 'square';
}

function getImageFootprintBucket(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
): ImageFootprintBucket {
  const widthRatio = imageWidth / canvasWidth;
  const heightRatio = imageHeight / canvasHeight;

  if (widthRatio >= 0.72 && heightRatio >= 0.58) {
    return 'screen';
  }

  if (widthRatio <= 0.3 && heightRatio <= 0.3) {
    return 'small';
  }

  return 'medium';
}

function getEstimatedLineCount(
  text: string,
  variant: TypographyVariant,
  canvasWidth: number,
  canvasHeight: number,
  textWidth: number,
): number {
  const variantConfig = TYPOGRAPHY_VARIANTS[variant];
  const fontSize = FONT_SIZE_VALUES[variantConfig.fontSize] * (Math.min(canvasWidth, canvasHeight) / FONT_SCALE_BASE);
  const averageCharWidth = fontSize * 0.58;
  const availableWidth = Math.max(canvasWidth * textWidth, averageCharWidth * 2);
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return 1;
  }

  let currentLineWidth = 0;
  let lines = 1;

  for (const word of words) {
    const wordWidth = word.length * averageCharWidth;
    const spacingWidth = currentLineWidth === 0 ? 0 : averageCharWidth * 0.35;

    if (currentLineWidth > 0 && currentLineWidth + spacingWidth + wordWidth > availableWidth) {
      lines += 1;
      currentLineWidth = wordWidth;
      continue;
    }

    currentLineWidth += spacingWidth + wordWidth;
  }

  return lines;
}

function getInitialLayout(
  textWeight: TextVisualWeight,
  imageAspectBucket: ImageAspectBucket,
  imageFootprintBucket: ImageFootprintBucket,
  estimatedLines: number,
): ContentAwareLayout {
  if (textWeight === 'dominant' || estimatedLines > 3) {
    return 'image-top-text-bottom';
  }

  if (imageFootprintBucket === 'screen') {
    return 'image-top-text-bottom';
  }

  if (imageAspectBucket === 'very-wide') {
    return 'image-top-text-bottom';
  }

  if (imageAspectBucket === 'landscape' && imageFootprintBucket === 'small') {
    return 'image-top-text-bottom';
  }

  if (
    (imageAspectBucket === 'portrait' || imageAspectBucket === 'square') &&
    (imageFootprintBucket === 'medium' || imageFootprintBucket === 'small') &&
    estimatedLines <= 2
  ) {
    return 'image-left-text-right';
  }

  return 'image-top-text-bottom';
}

export function resolveContentAwareLayout(input: ContentAwareLayoutInput): ResolvedContentAwareLayout {
  const textWeight = getTextWeight(input.variant, input.text);
  const imageAspectBucket = getImageAspectBucket(input.imageWidth, input.imageHeight);
  const imageFootprintBucket = getImageFootprintBucket(
    input.imageWidth,
    input.imageHeight,
    input.canvasWidth,
    input.canvasHeight,
  );
  let estimatedLines = getEstimatedLineCount(
    input.text,
    input.variant,
    input.canvasWidth,
    input.canvasHeight,
    DEFAULT_TEXT_WIDTH['image-top-text-bottom'],
  );
  let layout = getInitialLayout(textWeight, imageAspectBucket, imageFootprintBucket, estimatedLines);
  let textWidth = DEFAULT_TEXT_WIDTH[layout];
  estimatedLines = getEstimatedLineCount(input.text, input.variant, input.canvasWidth, input.canvasHeight, textWidth);

  if (estimatedLines > 3) {
    textWidth = Math.max(textWidth, WIDENED_TEXT_WIDTH[layout]);
    estimatedLines = getEstimatedLineCount(input.text, input.variant, input.canvasWidth, input.canvasHeight, textWidth);
  }

  if (estimatedLines > 5 && layout !== 'image-top-text-bottom') {
    layout = 'image-top-text-bottom';
    textWidth = WIDENED_TEXT_WIDTH[layout];
    estimatedLines = getEstimatedLineCount(input.text, input.variant, input.canvasWidth, input.canvasHeight, textWidth);
  }

  return {
    layout,
    textWidth,
    estimatedLines,
    textWeight,
    imageAspectBucket,
    textAnchor: TEXT_ANCHOR_BY_LAYOUT[layout],
  };
}
