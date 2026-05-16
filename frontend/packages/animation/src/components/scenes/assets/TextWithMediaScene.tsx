import React, { useEffect, useState } from 'react';
import { useCurrentFrame } from 'remotion';
import { useElement, usePatchOverlay } from '../../../patches';
import { MediaAsset, MediaAssetProps, } from '../../../core/assets';
import { resolveAnimationPreset } from '../../../core/animation_preset/AnimationPreset';
import { Row, Stack } from '../../../core/layout';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import type { ComponentRegistration } from '../../../registry/registry';
import { TextHighlight, TextHighlightDefaults } from '../text/TextHighlight';
import { TextStagger, TextStaggerDefaults } from '../text/TextStagger';
import { TextWithWordCycle, TextWithWordCycleDefaults } from '../text/TextWithWordCycle';
import { resolveContentAwareLayout } from './ContentAwareScene.layout';
import { TypographyVariant } from '../../../tokens';
import { AnimationPresetName } from '../../../core/animation_preset/AnimationPreset';

const DEFAULT_ANIMATION = 'slideUp' as const;
const FALLBACK_WIDTH = 1920;
const FALLBACK_HEIGHT = 1080;
const ROW_SHARED_GAP = 32;
const VERTICAL_STACK_GAP_PX = 64;
export const DEFAULT_MEDIA_FRAME_STYLE = {
  objectFit: 'cover' as const,
  borderRadius: 16, // always > borderWidth
  borderWidth: 8,
  borderColor: '#c4c9d4',
};

type SceneProps = {
  id?: string;
  entranceAnimation?: AnimationPresetName;
};

const SceneDefaults: SceneProps = {
  id: 'textwithvideoscene',
  entranceAnimation: DEFAULT_ANIMATION,
};

function useVideoDimensions(src: string) {
  const [dimensions, setDimensions] = useState({
    width: FALLBACK_WIDTH,
    height: FALLBACK_HEIGHT,
  });

  useEffect(() => {
    if (!src) return;

    let cancelled = false;

    const video = document.createElement('video');
    video.onloadedmetadata = () => {
      if (cancelled) return;
      setDimensions({
        width: video.videoWidth || FALLBACK_WIDTH,
        height: video.videoHeight || FALLBACK_HEIGHT,
      });
    };
    video.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return dimensions;
}

function fitVideo(sourceW: number, sourceH: number, maxW: number, maxH: number) {
  const ratio = sourceW / sourceH;
  const boundRatio = maxW / maxH;

  if (ratio > boundRatio) {
    return { width: maxW, height: maxW / ratio };
  }
  return { width: maxH * ratio, height: maxH };
}

export function TextWithMediaScene(): React.ReactElement {
  const frame = useCurrentFrame();
  const preset = useAspectPreset();
  const overlay = usePatchOverlay();

  const assetKey = ['imageasset', 'videoasset', 'mediaasset']
    .find((key) => overlay?.[key]);

  const { props: sceneProps } = useElement('scene', SceneDefaults);
  const { props: mediaProps } = useElement<MediaAssetProps>(assetKey || 'mediaasset', {});

  const { props: textHighlightProps } = useElement('texthighlight', { ...TextHighlightDefaults, variant: "headingLg" as TypographyVariant });
  const { props: textStaggerProps } = useElement('textstagger', { ...TextStaggerDefaults, variant: "headingLg" as TypographyVariant });
  const { props: textWithWordCycleProps } = useElement('textwithwordcycle', { ...TextWithWordCycleDefaults, variant: "headingLg" as TypographyVariant });

  const mediaDimentions = useVideoDimensions(mediaProps.src || '');

  const mediaMotion = resolveAnimationPreset({
    frame,
    startAt: 10,
    duration: 40,
    presetName: sceneProps.entranceAnimation ?? DEFAULT_ANIMATION,
    easing: 'ease-out',
  });

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
    textNode = <TextHighlight {...textHighlightProps} id="texthighlight" />;
  } else if (activeTextType === 'textstagger') {
    textContent = textStaggerProps.text;
    textVariant = textStaggerProps.variant;
    textNode = <TextStagger {...textStaggerProps} id="textstagger" />;
  } else {
    const longestWord = textWithWordCycleProps.cyclingWords.reduce(
      (longest, current) => (current.length > longest.length ? current : longest),
      '',
    );
    textContent = [textWithWordCycleProps.text, longestWord].filter(Boolean).join(' ').trim();
    textVariant = textWithWordCycleProps.variant;
    textNode = <TextWithWordCycle {...textWithWordCycleProps} id="textwithwordcycle" />;
  }

  const resolved = resolveContentAwareLayout({
    canvasWidth: availableWidth,
    canvasHeight: availableHeight,
    imageWidth: mediaDimentions.width,
    imageHeight: mediaDimentions.height,
    text: textContent,
    variant: textVariant as any,
  });

  const textWidthPercent = resolved.layout === 'image-top-text-bottom'
    ? Math.max(resolved.textWidth, 0.9)
    : resolved.textWidth;

  const paddedWidth = Math.max(1, availableWidth);
  const paddedHeight = Math.max(1, availableHeight);

  let maxVideoWidth: number;
  let maxVideoHeight: number;

  if (resolved.layout === 'image-left-text-right') {
    const textWidth = availableWidth * textWidthPercent;
    maxVideoWidth = Math.max(1, paddedWidth - textWidth - ROW_SHARED_GAP);
    maxVideoHeight = paddedHeight * 0.7;
  } else {
    maxVideoWidth = paddedWidth * 0.7;
    maxVideoHeight = paddedHeight * 0.7;
  }

  const fittedVideo = fitVideo(mediaDimentions.width, mediaDimentions.height, maxVideoWidth, maxVideoHeight);
  const resolvedVideoWidth = mediaProps.width ?? Math.max(1, Math.round(fittedVideo.width));
  const resolvedVideoHeight = mediaProps.height ?? Math.max(1, Math.round(fittedVideo.height));

  const mediaNode = (
    <div
      style={{
        opacity: mediaMotion.opacity,
        transform: mediaMotion.transform,
      }}
    >
      <MediaAsset
        id={assetKey || 'mediaasset'}
        src={mediaProps.src || mediaProps.image || mediaProps.video}
        width={resolvedVideoWidth}
        height={resolvedVideoHeight}
        style={DEFAULT_MEDIA_FRAME_STYLE}
      />
    </div>
  );

  const fullSafeAreaWidth = Math.max(1, availableWidth);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {resolved.layout === 'image-left-text-right' ? (
        <Row gap={ROW_SHARED_GAP} align="center" justify="center" style={{ width: '100%', height: '100%' }}>
          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            {mediaNode}
          </div>
          <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center' }}>
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
            boxSizing: 'border-box',
          }}
        >
          <Stack gap={VERTICAL_STACK_GAP_PX} style={{ width: '100%', maxWidth: '100%' }}>
            <div
              style={{
                width: fullSafeAreaWidth,
                maxWidth: '100%',
                margin: '0 auto',
                flexShrink: 0,
              }}
            >
              {textNode}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', flexShrink: 0 }}>{mediaNode}</div>
          </Stack>
        </div>
      )}
    </div>
  );
}


export const TextWithMediaSceneDescriptor: ComponentRegistration = {
  name: 'TextWithMediaScene',
  type: 'scene',
  tags: ['Solution', 'Product/Benefit Info'],
  schema: [{
    type: "component",
    name: 'scene',
    fields: [
      {
        "name": "entranceAnimation",
        "type": "enum",
        "default": DEFAULT_ANIMATION
      }
    ]
  }, {
    type: 'oneof',
    selector: 'props.textComponent',
    propsPath: 'props.textComponentProps',
    components: [
      {
        name: 'textstagger',
        fields: [
          {
            "name": "text",
            "type": "string",
            "datatype": "text",
            "map": "props.text"
          },
          {
            "name": "variant",
            "type": "enum",
            "map": "props.variant",
            "default": "headingLg"
          },
          {
            "name": "staggerDelay",
            "type": "number",
            "map": "props.staggerDelay",
            "default": TextStaggerDefaults.staggerDelay
          },
          {
            "name": "entranceAnimation",
            "type": "enum",
            "map": "props.entranceAnimation",
            "default": TextStaggerDefaults.entranceAnimation
          },
          {
            "name": "duration",
            "type": "number",
            "map": "props.duration",
            "default": TextStaggerDefaults.duration
          },
          {
            "name": "exitAnimation",
            "type": "enum",
            "map": "props.exitAnimation",
            "default": "none"
          },
          {
            "name": "exitDuration",
            "type": "number",
            "map": "props.exitDuration",
            "default": TextStaggerDefaults.exitDuration
          },
          {
            "name": "splitBy",
            "type": "enum",
            "map": "props.splitBy",
            "default": TextStaggerDefaults.splitBy
          }
        ]
      },
      {
        name: 'texthighlight', fields: [
          {
            "name": "text",
            "type": "string",
            "datatype": "text",
            "map": "props.text"
          },
          {
            "name": "variant",
            "type": "enum",
            "map": "props.variant",
            "default": "headingLg"
          },
          {
            "name": "entranceAnimation",
            "type": "enum",
            "map": "props.entranceAnimation",
            "default": TextHighlightDefaults.entranceAnimation
          },
          {
            "name": "animationDelay",
            "type": "number",
            "map": "props.animationDelay",
            "default": TextHighlightDefaults.animationDelay
          },
          {
            "name": "animationDuration",
            "type": "number",
            "map": "props.animationDuration",
            "default": TextHighlightDefaults.animationDuration
          },
          {
            "name": "exitAnimation",
            "type": "enum",
            "map": "props.exitAnimation",
            "default": "none"
          },
          {
            "name": "exitDuration",
            "type": "number",
            "map": "props.exitDuration",
            "default": TextHighlightDefaults.exitDuration
          },
          {
            "name": "highlightStyle",
            "type": "enum",
            "map": "props.highlightStyle",
            "default": TextHighlightDefaults.highlightStyle
          },
          {
            "name": "highlightedTextAnimation",
            "type": "enum",
            "map": "props.highlightedTextAnimation",
            "default": "none"
          },
          {
            "name": "highlightColor",
            "type": "string",
            "datatype": "color",
            "map": "props.highlightColor",
            "default": TextHighlightDefaults.highlightColor
          }
        ]
      },
      {
        name: 'textwithwordcycle', fields: [
          {
            "name": "text",
            "type": "string",
            "datatype": "text",
            "map": "props.text"
          },
          {
            "name": "cyclingWords",
            "type": "array",
            "datatype": "text",
            "map": "props.cyclingWords",
            "default": []
          },
          {
            "name": "variant",
            "type": "enum",
            "default": "headingLg"
          },
          {
            "name": "entranceAnimation",
            "type": "enum",
            "map": "props.entranceAnimation",
            "default": TextWithWordCycleDefaults.entranceAnimation
          },
          {
            "name": "holdDuration",
            "type": "number",
            "default": TextWithWordCycleDefaults.holdDuration
          },
          {
            "name": "transitionDuration",
            "type": "number",
            "default": TextWithWordCycleDefaults.transitionDuration
          },
          {
            "name": "textCycleTransition",
            "type": "enum",
            "default": TextWithWordCycleDefaults.textCycleTransition
          },
          {
            "name": "highlightStyle",
            "type": "enum",
            "default": TextWithWordCycleDefaults.highlightStyle
          },
          {
            "name": "highlightColor",
            "type": "string",
            "datatype": "color",
            "default": TextWithWordCycleDefaults.highlightColor
          }
        ]
      },
    ],
  }, {
    type: "component",
    name: 'mediaasset',
    fields: [
      {
        name: "src",
        type: "string",
        datatype: "media",
        map: "props.src"
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
      name: "src",
      type: "string"
    }
  ],
  description: 'Displays text with a image or video. Choose one of the filler component and its props in textComponentProps: texthighlight, textstagger, or textwithwordcycle.',
  celExpression: '"mediaasset" in props ? props.mediaasset._duration : 90',
};
