import React, { useEffect, useState } from 'react';
import { preloadImage } from '@remotion/preload';
import { continueRender, delayRender, useCurrentFrame, useRemotionEnvironment } from 'remotion';
import { usePatchOverlay, usePatchedProps } from '../../../patches';
import { ImageAsset } from '../../../core/assets';
import { Row, Stack } from '../../../core/layout';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { spacingToCss } from '../../../tokens/spacing';
import type { ComponentRegistration } from '../../../registry/registry';
import { getEntranceTransform, ENTRANCE_ANIMATIONS } from '../types';
import { TextHighlight, TextHighlightDefaults, TextHighlightSchemaFields } from '../text/TextHighlight';
import { TextStagger, TextStaggerDefaults, TextStaggerSchemaFields } from '../text/TextStagger';
import { TextWithWordCycle, TextWithWordCycleDefaults, TextWithWordCycleSchemaFields } from '../text/TextWithWordCycle';
import { resolveContentAwareLayout } from './ContentAwareScene.layout';

const DEFAULT_ANIMATION = 'slideUp' as const;
const FALLBACK_WIDTH = 1920;
const FALLBACK_HEIGHT = 1080;
const SHARED_GAP = 6;
const VERTICAL_STACK_GAP_PX = 64;
const CONTENT_PADDING = 6;

type SceneProps = {
  id?: string;
  entranceAnimation?: (typeof ENTRANCE_ANIMATIONS)[number];
};

type ImageProps = {
  image: string;
  width?: number;
  height?: number;
};

const SceneDefaults: SceneProps = {
  id: 'textwithimagescene',
  entranceAnimation: DEFAULT_ANIMATION,
};

const ImageDefaults: ImageProps = {
  image: '',
  width: undefined,
  height: undefined,
};

function useImageDimensions(src: string, width?: number, height?: number) {
  const { isRendering } = useRemotionEnvironment();
  const [handle] = useState(() => (isRendering ? delayRender('Loading image') : null));
  const [dimensions, setDimensions] = useState({
    width: width && width > 0 ? width : FALLBACK_WIDTH,
    height: height && height > 0 ? height : FALLBACK_HEIGHT,
  });

  useEffect(() => {
    if (width && width > 0 && height && height > 0) {
      if (handle !== null) continueRender(handle);
      setDimensions({ width, height });
      return;
    }

    if (!src) {
      if (handle !== null) continueRender(handle);
      return;
    }

    let cancelled = false;
    let unpreload: (() => void) | undefined;

    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setDimensions({
        width: img.naturalWidth || FALLBACK_WIDTH,
        height: img.naturalHeight || FALLBACK_HEIGHT,
      });
      if (handle !== null) continueRender(handle);
    };
    img.onerror = () => {
      if (cancelled) return;
      if (handle !== null) continueRender(handle);
    };
    img.src = src;

    if (isRendering) {
      unpreload = preloadImage(src);
    }

    return () => {
      cancelled = true;
      unpreload?.();
    };
  }, [handle, height, isRendering, src, width]);

  return dimensions;
}

function fitImage(sourceW: number, sourceH: number, maxW: number, maxH: number) {
  const ratio = sourceW / sourceH;
  const boundRatio = maxW / maxH;

  if (ratio > boundRatio) {
    return { width: maxW, height: maxW / ratio };
  }
  return { width: maxH * ratio, height: maxH };
}

export function TextWithImageScene(propsInit: SceneProps): React.ReactElement {
  const frame = useCurrentFrame();
  const preset = useAspectPreset();
  const overlay = usePatchOverlay();
  const sceneProps = usePatchedProps('scene', SceneDefaults);
  const imageProps = usePatchedProps('imageasset', ImageDefaults);
  const textHighlightProps = usePatchedProps('texthighlight', TextHighlightDefaults);
  const textStaggerProps = usePatchedProps('textstagger', TextStaggerDefaults);
  const textWithWordCycleProps = usePatchedProps('textwithwordcycle', TextWithWordCycleDefaults);

  const sceneId = propsInit.id ?? sceneProps.id;
  const imageDimensions = useImageDimensions(imageProps.image, imageProps.width, imageProps.height);
  const imageProgress = interpolateWithEasing(frame, [10, 50], [0, 1], 'ease-out');

  const availableWidth = preset.width - preset.safeArea.left - preset.safeArea.right;
  const availableHeight = preset.height - preset.safeArea.top - preset.safeArea.bottom;

  // Determine active text component
  const activeTextType = overlay.texthighlight ? 'texthighlight'
    : overlay.textstagger ? 'textstagger'
      : 'textwithwordcycle';

  let textNode: React.ReactElement;
  let textContent: string;
  let textVariant: string;

  if (activeTextType === 'texthighlight') {
    textContent = textHighlightProps.text;
    textVariant = textHighlightProps.variant;
    textNode = <TextHighlight {...textHighlightProps} id={`texthighlight-${sceneId}`} />;
  } else if (activeTextType === 'textstagger') {
    textContent = textStaggerProps.text;
    textVariant = textStaggerProps.variant;
    textNode = <TextStagger {...textStaggerProps} id={`textstagger-${sceneId}`} />;
  } else {
    const longestWord = textWithWordCycleProps.cyclingWords.reduce(
      (longest, current) => (current.length > longest.length ? current : longest),
      '',
    );
    textContent = [textWithWordCycleProps.text, longestWord].filter(Boolean).join(' ').trim();
    textVariant = textWithWordCycleProps.variant;
    textNode = <TextWithWordCycle {...textWithWordCycleProps} id={`textwithwordcycle-${sceneId}`} />;
  }

  const resolved = resolveContentAwareLayout({
    canvasWidth: availableWidth,
    canvasHeight: availableHeight,
    imageWidth: imageDimensions.width,
    imageHeight: imageDimensions.height,
    text: textContent,
    variant: textVariant as any,
  });

  const textWidthPercent = resolved.layout === 'image-top-text-bottom'
    ? Math.max(resolved.textWidth, 0.7)
    : resolved.textWidth;

  const paddedWidth = Math.max(1, availableWidth - CONTENT_PADDING * 2);
  const paddedHeight = Math.max(1, availableHeight - CONTENT_PADDING * 2);

  let maxImageWidth: number;
  let maxImageHeight: number;

  if (resolved.layout === 'image-left-text-right') {
    const textWidth = availableWidth * textWidthPercent;
    maxImageWidth = Math.max(1, paddedWidth - textWidth - SHARED_GAP);
    maxImageHeight = paddedHeight * 0.7;
  } else {
    maxImageWidth = paddedWidth * 0.7;
    maxImageHeight = paddedHeight * 0.7;
  }

  const fittedImage = fitImage(imageDimensions.width, imageDimensions.height, maxImageWidth, maxImageHeight);

  const imageNode = (
    <div
      style={{
        opacity: imageProgress,
        transform: getEntranceTransform(sceneProps.entranceAnimation ?? DEFAULT_ANIMATION, imageProgress),
      }}
    >
      <ImageAsset
        id={`imageasset-${sceneId}`}
        image={imageProps.image}
        width={Math.max(1, Math.round(fittedImage.width))}
        height={Math.max(1, Math.round(fittedImage.height))}
        style={{ objectFit: 'cover' }}
      />
    </div>
  );

  const textBasis = `${Math.round(textWidthPercent * 100)}%`;

  return (
    <div id={sceneId} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {resolved.layout === 'image-left-text-right' ? (
        <Row gap={SHARED_GAP} align="center" justify="center" style={{ width: '100%', height: '100%' }}>
          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: spacingToCss(CONTENT_PADDING) }}>
            {imageNode}
          </div>
          <div style={{ flexBasis: textBasis, maxWidth: textBasis, minWidth: 0, display: 'flex', alignItems: 'center', paddingLeft: spacingToCss(CONTENT_PADDING) }}>
            {textNode}
          </div>
        </Row>
      ) : (
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
          <Stack gap={VERTICAL_STACK_GAP_PX} align="center" justify="center" style={{ width: '100%', maxWidth: '100%' }}>
            <div style={{ width: textBasis, maxWidth: '100%', margin: '0 auto', flexShrink: 0 }}>{textNode}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', flexShrink: 0 }}>{imageNode}</div>
          </Stack>
        </div>
      )}
    </div>
  );
}



export const TextWithImageSceneDescriptor: ComponentRegistration = {
  name: 'TextWithImageScene',
  type: 'scene',
  tags: ['Solution', 'Product/Benefit Info'],
  schema: [
    {
      type: "component",
      name: 'scene',
      fields: [
        {
          "name": "entranceAnimation",
          "type": "string",
          "subtype": "enum",
          "default": DEFAULT_ANIMATION
        }
      ]
    },
    {
      type: 'oneof',
      selector: 'props.textComponent',
      components: [
        { name: 'textstagger', fields: TextStaggerSchemaFields },
        { name: 'texthighlight', fields: TextHighlightSchemaFields },
        { name: 'textwithwordcycle', fields: TextWithWordCycleSchemaFields },
      ],
    }, {
      type: "component",
      name: 'imageasset',
      fields: [
        {
          name: "image",
          type: "string",
          dataType: "media",
          map: "props.image"
        }
      ]
    }],
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
      name: "image",
      type: "string"
    }
  ],
  description: 'Displays text with an image. Choose one of the filler component and its props in textComponentProps: texthighlight, textstagger, or textwithwordcycle.',
  celExpression: '80',
};
