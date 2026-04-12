import React, { useEffect, useState } from 'react';
import z from 'zod';
import { preloadImage, preloadVideo } from '@remotion/preload';
import { delayRender, continueRender, useCurrentFrame, useRemotionEnvironment } from 'remotion';
import { usePatchedProps } from '../../../patches';
import { ImageAsset, VideoAsset } from '../../../core/assets';
import { Row, Stack } from '../../../core/layout';
import { Text } from '../../../core/assets/Text';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { spacingToCss } from '../../../tokens/spacing';
import { type TypographyVariant } from '../../../tokens/semantic';
import type { ComponentRegistration } from '../../../registry/registry';
import { getEntranceTransform, ENTRANCE_ANIMATIONS } from '../types';
import { resolveContentAwareLayout, type ContentAwareLayout } from './ContentAwareScene.layout';

const DEFAULT_VARIANT = 'heading' as const;
const DEFAULT_ANIMATION = 'slideUp' as const;
const DEFAULT_STACKED_TEXT_WIDTH = 0.7;
const FALLBACK_MEDIA_WIDTH = 1920;
const FALLBACK_MEDIA_HEIGHT = 1080;

export const ContentAwareSceneSchema = z.object({
  id: z.string().optional(),
  src: z.string(),
  mediaType: z.enum(['img', 'video']).default('img').optional(),
  entranceAnimation: z.enum(ENTRANCE_ANIMATIONS).default(DEFAULT_ANIMATION).optional(),
  textComponent: z.any(),
});

export type ContentAwareSceneProps = z.input<typeof ContentAwareSceneSchema>;

type MediaType = ContentAwareSceneProps['mediaType'];

interface MediaDimensions {
  width: number;
  height: number;
}

interface ResolvedTextInput {
  content: string;
  variant: TypographyVariant;
  node: React.ReactElement;
}

function useMediaDimensions(src: string, mediaType: MediaType): MediaDimensions {
  const { isRendering } = useRemotionEnvironment();
  const [handle] = useState(() => (isRendering ? delayRender(`Loading ${mediaType} metadata`) : null));
  const [dimensions, setDimensions] = useState<MediaDimensions>({
    width: FALLBACK_MEDIA_WIDTH,
    height: FALLBACK_MEDIA_HEIGHT,
  });

  useEffect(() => {
    let cancelled = false;
    let unpreload: (() => void) | undefined;

    const finish = (nextDimensions?: MediaDimensions) => {
      if (cancelled) return;
      if (nextDimensions) {
        setDimensions(nextDimensions);
      }
      if (handle !== null) {
        continueRender(handle);
      }
    };

    if (mediaType === 'img') {
      const img = new Image();
      img.onload = () => {
        finish({
          width: img.naturalWidth || FALLBACK_MEDIA_WIDTH,
          height: img.naturalHeight || FALLBACK_MEDIA_HEIGHT,
        });
      };
      img.onerror = () => finish();
      img.src = src;

      if (isRendering) {
        unpreload = preloadImage(src);
      }
    } else {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        finish({
          width: video.videoWidth || FALLBACK_MEDIA_WIDTH,
          height: video.videoHeight || FALLBACK_MEDIA_HEIGHT,
        });
      };
      video.onerror = () => finish();
      video.src = src;

      if (isRendering) {
        unpreload = preloadVideo(src);
      }
    }

    return () => {
      cancelled = true;
      unpreload?.();
    };
  }, [src, mediaType, isRendering, handle]);

  return dimensions;
}

const SHARED_GAP = 6;
const VERTICAL_STACK_GAP_PX = 64;
const CONTENT_PADDING = 6;
const STACK_IMAGE_MAX_WIDTH_RATIO = 0.7;
const STACK_IMAGE_MAX_HEIGHT_RATIO = 0.7;

function fitBoxWithinBounds(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const sourceAspectRatio = sourceWidth / sourceHeight;
  const boundAspectRatio = maxWidth / maxHeight;

  if (sourceAspectRatio > boundAspectRatio) {
    return {
      width: maxWidth,
      height: maxWidth / sourceAspectRatio,
    };
  }

  return {
    width: maxHeight * sourceAspectRatio,
    height: maxHeight,
  };
}

function renderTextBlock(
  id: string | undefined,
  content: string,
  variant: TypographyVariant,
): React.ReactElement {
  return (
    <Text
      id={id ? `text-${id}` : undefined}
      text={content}
      variant={variant}
    />
  );
}

function getTextContentFromComponent(component: React.ReactElement): string | null {
  const props = component.props as { text?: unknown; texts?: unknown };

  if (typeof props.text === 'string' && props.text.trim().length > 0) {
    return props.text;
  }

  if (Array.isArray(props.texts)) {
    const stringItems = props.texts.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    if (stringItems.length > 0) {
      return stringItems.reduce((longest, current) => current.length > longest.length ? current : longest);
    }
  }

  return null;
}

function resolveTextInput(
  id: string | undefined,
  textComponent: unknown,
): ResolvedTextInput {
  if (React.isValidElement(textComponent)) {
    const inferredContent = getTextContentFromComponent(textComponent);
    const inferredVariant = (textComponent.props as { variant?: TypographyVariant }).variant ?? DEFAULT_VARIANT;

    if (inferredContent) {
      return {
        content: inferredContent,
        variant: inferredVariant,
        node: textComponent,
      };
    }
  }

  throw new Error('ContentAwareScene requires textComponent with a text or texts prop.');
}

function renderMediaBlock(
  id: string | undefined,
  mediaType: MediaType,
  src: string,
  width: number,
  height: number,
): React.ReactElement {
  const sharedProps = {
    id: id ? `${mediaType === 'video' ? 'videoasset' : 'imageasset'}-${id}` : undefined,
    src,
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
    style: { objectFit: 'cover' as const },
  };

  return mediaType === 'video'
    ? <VideoAsset {...sharedProps} />
    : <ImageAsset {...sharedProps} />;
}

function getImageDimensions(
  layout: ContentAwareLayout,
  availableWidth: number,
  availableHeight: number,
  textWidthPercent: number,
  sourceWidth: number,
  sourceHeight: number,
): { width: number; height: number } {
  const textWidth = availableWidth * textWidthPercent;
  const paddedWidth = Math.max(1, availableWidth - CONTENT_PADDING * 2);
  const paddedHeight = Math.max(1, availableHeight - CONTENT_PADDING * 2);
  const aspectRatio = sourceWidth / sourceHeight;
  const isVeryTallPortrait = aspectRatio < 0.72;

  switch (layout) {
    case 'image-left-text-right':
      return fitBoxWithinBounds(
        sourceWidth,
        sourceHeight,
        isVeryTallPortrait
          ? Math.max(1, paddedWidth * 0.7)
          : Math.max(1, paddedWidth - textWidth - SHARED_GAP),
        paddedHeight * 0.7,
      );
    case 'image-bottom-text-top':
    case 'image-top-text-bottom':
      return fitBoxWithinBounds(
        sourceWidth,
        sourceHeight,
        paddedWidth * STACK_IMAGE_MAX_WIDTH_RATIO,
        paddedHeight * STACK_IMAGE_MAX_HEIGHT_RATIO,
      );
    default:
      return fitBoxWithinBounds(sourceWidth, sourceHeight, paddedWidth, paddedHeight);
  }
}

function renderResolvedLayout(
  layout: ContentAwareLayout,
  textNode: React.ReactElement,
  imageNode: React.ReactElement,
  textWidthPercent: number,
  estimatedLines: number,
): React.ReactElement {
  const textBasis = `${Math.round(textWidthPercent * 100)}%`;

  switch (layout) {
    case 'image-left-text-right':
      return (
        <Row gap={SHARED_GAP} align="center" justify="center" style={{ width: '100%', height: '100%' }}>
          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: spacingToCss(CONTENT_PADDING) }}>{imageNode}</div>
          <div style={{ flexBasis: textBasis, maxWidth: textBasis, minWidth: 0, display: 'flex', alignItems: 'center', paddingLeft: spacingToCss(CONTENT_PADDING) }}>
            {textNode}
          </div>
        </Row>
      );
    case 'image-top-text-bottom':
    default:
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: `${spacingToCss(CONTENT_PADDING)} ${spacingToCss(CONTENT_PADDING)} ${spacingToCss(12)}`,
            boxSizing: 'border-box',
          }}
        >
          <Stack
            gap={VERTICAL_STACK_GAP_PX}
            align="center"
            justify="center"
            style={{ width: '100%', maxWidth: '100%' }}
          >
            <div style={{ width: textBasis, maxWidth: '100%', margin: '0 auto', flexShrink: 0 }}>{textNode}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', flexShrink: 0 }}>{imageNode}</div>
          </Stack>
        </div>
      );
  }
}

export function ContentAwareScene(propsInit: ContentAwareSceneProps): React.ReactElement {
  const frame = useCurrentFrame();
  const preset = useAspectPreset();
  const patchedProps = usePatchedProps(propsInit.id, propsInit);
  const props = { ...ContentAwareSceneSchema.parse(patchedProps), id: propsInit.id };
  const mediaDimensions = useMediaDimensions(props.src, props.mediaType);
  const mediaProgress = interpolateWithEasing(
    frame,
    [10, 50],
    [0, 1],
    'ease-out',
  );

  const availableWidth = preset.width - preset.safeArea.left - preset.safeArea.right;
  const availableHeight = preset.height - preset.safeArea.top - preset.safeArea.bottom;
  
  const resolvedText = resolveTextInput(props.id, props.textComponent);

  const resolved = resolveContentAwareLayout({
    canvasWidth: availableWidth,
    canvasHeight: availableHeight,
    imageWidth: mediaDimensions.width,
    imageHeight: mediaDimensions.height,
    text: resolvedText.content,
    variant: resolvedText.variant,
  });
  const stackedTextWidth =
    resolved.layout === 'image-top-text-bottom'
      ? Math.max(resolved.textWidth, DEFAULT_STACKED_TEXT_WIDTH)
      : resolved.textWidth;

  const textNode = resolvedText.node;

  const imageDimensions = getImageDimensions(
    resolved.layout,
    availableWidth,
    availableHeight,
    stackedTextWidth,
    mediaDimensions.width,
    mediaDimensions.height,
  );

  const imageNode = (
    <div
      style={{
        opacity: mediaProgress,
        transform: getEntranceTransform(props.entranceAnimation ?? DEFAULT_ANIMATION, mediaProgress),
      }}
    >
      {renderMediaBlock(
        props.id,
        props.mediaType,
        props.src,
        imageDimensions.width,
        imageDimensions.height,
      )}
    </div>
  );

  return (
    <div
      id={props.id}
      style={{
        width: '100%',
          height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {renderResolvedLayout(
        resolved.layout,
        textNode,
        imageNode,
        stackedTextWidth,
        resolved.estimatedLines,
      )}
    </div>
  );
}

// export const ContentAwareSceneDescriptor: ComponentRegistration = {
//   name: 'ContentAwareScene',
//   type: 'scene',
//   llmSchema: ContentAwareSceneSchema,
//   description: 'Automatically chooses a media-and-text layout from image or video dimensions and text visual weight.' +
//     'Pass textComponent as one of TextStagger, TextHighlight, Typewriter, or TextWithWordCycle.',
// };
