import React, { useEffect, useState } from 'react';
import z from 'zod';
import { preloadImage, preloadVideo } from '@remotion/preload';
import { continueRender, delayRender, useCurrentFrame, useRemotionEnvironment } from 'remotion';
import { usePatchOverlay, usePatchedProps } from '../../../patches';
import { ImageAsset, VideoAsset } from '../../../core/assets';
import { Row, Stack } from '../../../core/layout';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { spacingToCss } from '../../../tokens/spacing';
import { type TypographyVariant, TYPOGRAPHY_VARIANT_NAMES } from '../../../tokens/semantic';
import type { ComponentRegistration } from '../../../registry/registry';
import { getEntranceTransform, ENTRANCE_ANIMATIONS } from '../types';
import { TextHighlight, TextHighlightDefaults, TextHighlightSchemaFields } from '../text/TextHighlight';
import { TextStagger, TextStaggerDefaults, TextStaggerSchemaFields } from '../text/TextStagger';
import { TextWithWordCycle, TextWithWordCycleDefaults, TextWithWordCycleSchemaFields } from '../text/TextWithWordCycle';
import { resolveContentAwareLayout, type ContentAwareLayout } from './ContentAwareScene.layout';

const DEFAULT_ANIMATION = 'slideUp' as const;
const DEFAULT_STACKED_TEXT_WIDTH = 0.7;
const FALLBACK_MEDIA_WIDTH = 1920;
const FALLBACK_MEDIA_HEIGHT = 1080;

const MediaAssetSchema = z.object({
  src: z.string(),
  duration: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  mediaType: z.string().optional(),
}).passthrough();

const TextHighlightInputSchema = z.object({
  text: z.string(),
  variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).optional(),
}).passthrough();

const TextStaggerInputSchema = z.object({
  text: z.string(),
  variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).optional(),
}).passthrough();

const TextWithWordCycleInputSchema = z.object({
  text: z.string(),
  cyclingWords: z.array(z.string()).default([]).optional(),
  variant: z.enum(TYPOGRAPHY_VARIANT_NAMES).optional(),
}).passthrough();

export const ContentAwareSceneSchema = z.object({
  id: z.string().optional(),
  entranceAnimation: z.enum(ENTRANCE_ANIMATIONS).default(DEFAULT_ANIMATION).optional(),
  imageasset: MediaAssetSchema.optional(),
  videoasset: MediaAssetSchema.optional(),
  texthighlight: TextHighlightInputSchema.optional(),
  textstagger: TextStaggerInputSchema.optional(),
  textwithwordcycle: TextWithWordCycleInputSchema.optional(),
});

export const ContentAwareSceneDefaults = {
  id: 'contentawarescene',
  entranceAnimation: DEFAULT_ANIMATION,
  imageasset: undefined,
  videoasset: undefined,
  texthighlight: undefined,
  textstagger: undefined,
  textwithwordcycle: undefined,
};

export type ContentAwareSceneProps = z.input<typeof ContentAwareSceneSchema>;

const MediaAssetDefaults = {
  src: '',
  duration: undefined as number | undefined,
  width: undefined as number | undefined,
  height: undefined as number | undefined,
  mediaType: undefined as string | undefined,
};

type MediaType = 'img' | 'video';

interface MediaDimensions {
  width: number;
  height: number;
}

interface ResolvedMediaInput {
  type: MediaType;
  src: string;
  width?: number;
  height?: number;
}

interface ResolvedTextInput {
  content: string;
  variant: TypographyVariant;
  node: React.ReactElement;
}

function useMediaDimensions(
  media: ResolvedMediaInput,
): MediaDimensions {
  const { isRendering } = useRemotionEnvironment();
  const [handle] = useState(() => (isRendering ? delayRender(`Loading ${media.type} metadata`) : null));
  const [dimensions, setDimensions] = useState<MediaDimensions>({
    width: media.width && media.width > 0 ? media.width : FALLBACK_MEDIA_WIDTH,
    height: media.height && media.height > 0 ? media.height : FALLBACK_MEDIA_HEIGHT,
  });

  useEffect(() => {
    if (media.width && media.width > 0 && media.height && media.height > 0) {
      if (handle !== null) {
        continueRender(handle);
      }
      setDimensions({ width: media.width, height: media.height });
      return;
    }

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

    if (media.type === 'img') {
      const img = new Image();
      img.onload = () => {
        finish({
          width: img.naturalWidth || FALLBACK_MEDIA_WIDTH,
          height: img.naturalHeight || FALLBACK_MEDIA_HEIGHT,
        });
      };
      img.onerror = () => finish();
      img.src = media.src;

      if (isRendering) {
        unpreload = preloadImage(media.src);
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
      video.src = media.src;

      if (isRendering) {
        unpreload = preloadVideo(media.src);
      }
    }

    return () => {
      cancelled = true;
      unpreload?.();
    };
  }, [handle, isRendering, media.height, media.src, media.type, media.width]);

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

function resolveMediaInput(
  imageasset: typeof MediaAssetDefaults,
  videoasset: typeof MediaAssetDefaults,
  activeMediaType: 'imageasset' | 'videoasset' | null,
): ResolvedMediaInput {
  if (activeMediaType === 'imageasset') {
    return {
      type: 'img',
      src: imageasset.src,
      width: imageasset.width,
      height: imageasset.height,
    };
  }

  if (activeMediaType === 'videoasset') {
    return {
      type: 'video',
      src: videoasset.src,
      width: videoasset.width,
      height: videoasset.height,
    };
  }
  throw new Error('ContentAwareScene requires either imageasset or videoasset.');
}

function resolveTextInput(
  id: string | undefined,
  activeTextType: 'texthighlight' | 'textstagger' | 'textwithwordcycle' | null,
  texthighlight: z.infer<typeof TextHighlightInputSchema>,
  textstagger: z.infer<typeof TextStaggerInputSchema>,
  textwithwordcycle: z.infer<typeof TextWithWordCycleInputSchema>,
): ResolvedTextInput {
  if (activeTextType === 'texthighlight') {
    const textHighlightProps = {
      ...texthighlight,
      id: id ? `texthighlight-${id}` : TextHighlightDefaults.id,
      variant: texthighlight.variant ?? TextHighlightDefaults.variant,
    };

    return {
      content: texthighlight.text,
      variant: textHighlightProps.variant,
      node: <TextHighlight {...textHighlightProps} />,
    };
  }

  if (activeTextType === 'textstagger') {
    const textStaggerProps = {
      ...textstagger,
      id: id ? `textstagger-${id}` : TextStaggerDefaults.id,
      variant: textstagger.variant ?? TextStaggerDefaults.variant,
    };

    return {
      content: textstagger.text,
      variant: textStaggerProps.variant,
      node: <TextStagger {...textStaggerProps} />,
    };
  }

  if (activeTextType === 'textwithwordcycle') {
    const longestWord = (textwithwordcycle.cyclingWords ?? []).reduce(
      (longest, current) => (current.length > longest.length ? current : longest),
      '',
    );
    const content = [textwithwordcycle.text, longestWord].filter(Boolean).join(' ').trim();
    const textWithWordCycleProps = {
      ...TextWithWordCycleDefaults,
      ...textwithwordcycle,
      id: id ? `textwithwordcycle-${id}` : TextWithWordCycleDefaults.id,
      variant: textwithwordcycle.variant ?? TextWithWordCycleDefaults.variant,
      cyclingWords: textwithwordcycle.cyclingWords ?? TextWithWordCycleDefaults.cyclingWords,
    };

    return {
      content,
      variant: textWithWordCycleProps.variant,
      node: <TextWithWordCycle {...textWithWordCycleProps} />,
    };
  }

  throw new Error('ContentAwareScene requires one of texthighlight, textstagger, or textwithwordcycle.');
}

function renderMediaBlock(
  id: string | undefined,
  media: ResolvedMediaInput,
  width: number,
  height: number,
): React.ReactElement {
  const sharedProps = {
    id: id ? `${media.type === 'video' ? 'videoasset' : 'imageasset'}-${id}` : undefined,
    src: media.src,
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
    style: { objectFit: 'cover' as const },
  };

  if (media.type === 'video') {
    return <VideoAsset {...sharedProps} />;
  }

  return <ImageAsset {...sharedProps} />;
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
  const overlay = usePatchOverlay();
  const sceneProps = usePatchedProps('scene', ContentAwareSceneDefaults);
  const imageasset = usePatchedProps('imageasset', MediaAssetDefaults);
  const videoasset = usePatchedProps('videoasset', MediaAssetDefaults);
  const texthighlight = usePatchedProps('texthighlight', TextHighlightDefaults);
  const textstagger = usePatchedProps('textstagger', TextStaggerDefaults);
  const textwithwordcycle = usePatchedProps('textwithwordcycle', TextWithWordCycleDefaults);

  const activeTextType =
    overlay.texthighlight ? 'texthighlight'
      : overlay.textstagger ? 'textstagger'
        : overlay.textwithwordcycle ? 'textwithwordcycle'
          : null;

  const activeMediaType =
    overlay.imageasset ? 'imageasset'
      : overlay.videoasset ? 'videoasset'
        : null;

  const media = resolveMediaInput(imageasset, videoasset, activeMediaType);
  const text = resolveTextInput(propsInit.id ?? sceneProps.id, activeTextType, texthighlight, textstagger, textwithwordcycle);
  const mediaDimensions = useMediaDimensions(media);
  const mediaProgress = interpolateWithEasing(
    frame,
    [10, 50],
    [0, 1],
    'ease-out',
  );

  const availableWidth = preset.width - preset.safeArea.left - preset.safeArea.right;
  const availableHeight = preset.height - preset.safeArea.top - preset.safeArea.bottom;

  const resolved = resolveContentAwareLayout({
    canvasWidth: availableWidth,
    canvasHeight: availableHeight,
    imageWidth: mediaDimensions.width,
    imageHeight: mediaDimensions.height,
    text: text.content,
    variant: text.variant,
  });

  const stackedTextWidth =
    resolved.layout === 'image-top-text-bottom'
      ? Math.max(resolved.textWidth, DEFAULT_STACKED_TEXT_WIDTH)
      : resolved.textWidth;

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
        transform: getEntranceTransform(sceneProps.entranceAnimation ?? DEFAULT_ANIMATION, mediaProgress),
      }}
    >
      {renderMediaBlock(
        propsInit.id ?? sceneProps.id,
        media,
        imageDimensions.width,
        imageDimensions.height,
      )}
    </div>
  );

  return (
    <div
      id={propsInit.id ?? sceneProps.id}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {renderResolvedLayout(
        resolved.layout,
        text.node,
        imageNode,
        stackedTextWidth,
      )}
    </div>
  );
}

export const ContentAwareSchemaFields = [
  {
    type: 'oneof',
    selector: 'props.textComponent',
    components: [
      { name: 'textstagger', fields: TextStaggerSchemaFields },
      { name: 'texthighlight', fields: TextHighlightSchemaFields },
      { name: 'textwithwordcycle', fields: TextWithWordCycleSchemaFields },
    ],
  },
  {
    type: 'oneof',
    selector: 'props.mediaComponent',
    components: [
      {
        name: 'imageasset',
        fields: [
          {
            name: 'src',
            type: 'string',
            dataType: 'media',
            map: 'props.imageasset.src',
          },
          {
            name: 'duration',
            type: 'number',
            map: 'props.imageasset.duration',
          },
          {
            name: 'width',
            type: 'number',
            map: 'props.imageasset.width',
          },
          {
            name: 'height',
            type: 'number',
            map: 'props.imageasset.height',
          },
        ],
      },
      {
        name: 'videoasset',
        fields: [
          {
            name: 'src',
            type: 'string',
            dataType: 'media',
            map: 'props.videoasset.src',
          },
          {
            name: 'duration',
            type: 'number',
            map: 'props.videoasset.duration',
          },
          {
            name: 'width',
            type: 'number',
            map: 'props.videoasset.width',
          },
          {
            name: 'height',
            type: 'number',
            map: 'props.videoasset.height',
          },
        ],
      },
    ],
  },
];

export const ContentAwareDescriptor: ComponentRegistration = {
  name: 'ContentAware',
  type: 'scene',
  tags: ['Solution'],
  schema: ContentAwareSchemaFields,
  llmSchema: [
    {
      name: "textComponent",
      type: "enum",
      enum: [
        "textstagger",
        "texthighlight",
        "textwithwordcycle"
      ]
    },
    {
      name: "textComponentProps",
      type: "object"
    },
    {
      name: "mediaComponent",
      type: "enum",
      enum: [
        "imageasset",
        "videoasset"
      ]
    },
    {
      name: "src",
      type: "string"
    }
  ],
  description: `Shows a scene with exactly one text component and one media component.
  Text component (choose one): texthighlight, textstagger, textwithwordcycle.
  Media component (choose one): imageasset or videoasset.
  Both components are mandatory. If required data is missing, ask the user to provide it before generating the scene.
  If the user changes the media type (imageasset ↔ videoasset), return the updated Scene with the media component replaced.
  If the user changes the text type, replace the existing text component accordingly.`,
  celExpression: 'props.videoasset.duration || 80',
};

export const ContentAware = ContentAwareScene;
