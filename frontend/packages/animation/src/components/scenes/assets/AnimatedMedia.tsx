import React from 'react';
import { useCurrentFrame } from 'remotion';
import { MediaAsset } from '../../../core/assets';
import type { MediaAssetProps } from '../../../core/assets';
import type { ComponentRegistration } from '../../../registry/registry';
import { useElement } from '../../../patches';
import { useAspectPreset } from '../../../styles';
import { TextStagger, TextStaggerDefaults } from '../text/TextStagger';
import { MediaMotionPreset, getMotionTransform } from '../../../core/assets/MediaMotionPreset';

const DEFAULT_SCENE_DURATION = 60;
const DEFAULT_MOTION_PRESET = 'zoomTiltReveal' as const;
const DEFAULT_VARIANT = 'headingLg' as const;

type TimedMediaAssetProps = MediaAssetProps & {
  _duration?: number;
  motionPreset?: MediaMotionPreset;
};

const textDefaults = {
  ...TextStaggerDefaults,
  variant: DEFAULT_VARIANT,
  text: 'Your headline here',
};

const mediaDefaults: TimedMediaAssetProps = {
  src: undefined,
  motionPreset: DEFAULT_MOTION_PRESET,
};

export function AnimatedMedia(): React.ReactElement {
  const frame = useCurrentFrame();
  const preset = useAspectPreset();
  const { props: textProps } = useElement('textstagger', textDefaults);
  const { props: mediaProps } = useElement<TimedMediaAssetProps>('mediaasset', mediaDefaults);

  const motionPreset = mediaProps.motionPreset ?? DEFAULT_MOTION_PRESET;
  const sceneDuration = mediaProps._duration && mediaProps._duration > 0 ? mediaProps._duration : DEFAULT_SCENE_DURATION;


  const mediaWidth = Math.round(preset.width * 0.8);
  const mediaHeight = Math.round(preset.height * 0.8);

  const mediaMotion = getMotionTransform(
    motionPreset,
    frame,
    sceneDuration,
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MediaAsset
        id="mediaasset"
        src={mediaProps.src}
        width={mediaWidth}
        height={mediaHeight}
        style={{
          transform: mediaMotion.transform,
          opacity: mediaMotion.opacity,
          transformOrigin: 'center',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '70%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}
      >
        <TextStagger {...textProps} id="textstagger" />
      </div>
    </div>
  );
}

export const AnimatedMediaDescriptor: ComponentRegistration = {
  name: 'AnimatedMedia',
  type: 'scene',
  tags: ['Product UI'],
  description: 'An animated media element (image or video) with text overlay.',
  schema: [
    {
      type: 'component',
      name: 'textstagger',
      fields: [{
        "name": "text",
        "type": "string",
        "datatype": "text",
        "map": "props.text"
    },
    {
        "name": "variant",
        "type": "enum",
        "map": "props.variant",
        "default": DEFAULT_VARIANT
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
        "name": "splitBy",
        "type": "enum",
        "map": "props.splitBy",
        "default": "line"
    }],
    },
    {
      type: 'component',
      name: 'mediaasset',
      fields: [
        {
          name: 'src',
          type: 'string',
          datatype: 'media',
          map: 'props.src',
        },
        {
          name: 'motionPreset',
          type: 'enum',
          default: DEFAULT_MOTION_PRESET,
        },
      ],
    },
  ],
  llmSchema: [    
    {
      name: 'text',
      type: 'string',
    },
    {
      name: 'src',
      type: 'string',
    },
  ],
  celExpression: '"mediaasset" in props ? props.mediaasset._duration : 90',
};
