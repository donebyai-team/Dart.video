import React from 'react';
import { useCurrentFrame } from 'remotion';
import { MediaAsset } from '../../../core/assets';
import type { MediaAssetProps } from '../../../core/assets';
import type { ComponentRegistration } from '../../../registry/registry';
import { useElement } from '../../../patches';
import { useAspectPreset } from '../../../styles';
import { MediaMotionPreset, getMotionTransform } from '../../../core/animation_preset/MediaMotionPreset';
import { AnimationPresetName } from '../../../core/animation_preset/AnimationPreset';
import { DEFAULT_MEDIA_FRAME_STYLE } from './TextWithMediaScene';
import { AnimatedText, AnimatedTextDefaults } from '../text';

const DEFAULT_SCENE_DURATION = 90;
const DEFAULT_MOTION_PRESET = 'zoomTiltReveal' as const;

const ANIMATED_MEDIA_DEFAULTS = {
    ...AnimatedTextDefaults,
    id: 'animatedtext',
    text: '',
    variant: 'headingLg' as const,
    splitBy: 'word' as const,
    entranceAnimation: 'scaleIn' as AnimationPresetName,
};

type TimedMediaAssetProps = MediaAssetProps & {
  _duration?: number;
  motionPreset?: MediaMotionPreset;
};

const mediaDefaults: TimedMediaAssetProps = {
  src: undefined,
  motionPreset: DEFAULT_MOTION_PRESET,
};

export function AnimatedMedia(): React.ReactElement {
  const frame = useCurrentFrame();
  const preset = useAspectPreset();
  const { props: textProps } = useElement('animatedtext', ANIMATED_MEDIA_DEFAULTS);
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
      <div
        style={{
          transform: mediaMotion.transform,
          opacity: mediaMotion.opacity,
          transformOrigin: 'center',
        }}
      >
        <MediaAsset
          id="mediaasset"
          src={mediaProps.src}
          width={mediaWidth}
          height={mediaHeight}
          style={DEFAULT_MEDIA_FRAME_STYLE}
        />
      </div>

      <div
        style={{
          position: 'absolute',  
          maxWidth: '60%'        
        }}
      >
        <AnimatedText {...textProps} id="animatedtext" />
      </div>
    </div>
  );
}

export const AnimatedMediaDescriptor: ComponentRegistration = {
  name: 'AnimatedMedia',
  type: 'scene',
  description: 'An animated media element (image or video) with text overlay.',
  schema: [
    {
      type: 'component',
      name: 'animatedtext',
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
        "default": ANIMATED_MEDIA_DEFAULTS.variant
    },
    {
        "name": "staggerDelay",
        "type": "number",
        "map": "props.staggerDelay",
        "default": ANIMATED_MEDIA_DEFAULTS.staggerDelay
    },
    {
        "name": "entranceAnimation",
        "type": "enum",
        "map": "props.entranceAnimation",
        "default": ANIMATED_MEDIA_DEFAULTS.entranceAnimation
    },
    {
        "name": "duration",
        "type": "number",
        "map": "props.duration",
        "default": ANIMATED_MEDIA_DEFAULTS.duration
    },
    {
        "name": "splitBy",
        "type": "enum",
        "map": "props.splitBy",
        "default": ANIMATED_MEDIA_DEFAULTS.splitBy
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
          default: mediaDefaults.motionPreset,
        },
      ],
    },
  ],
  llmSchema: [    
    {
      name: 'text',
      type: 'string',
      required: false,
      hint: 'one liner text to specity what feature is being demonstrated',
    },
    {
      name: 'src',
      type: 'string',
    },
  ],
  celExpression: '"mediaasset" in props ? props.mediaasset._duration : 90',
};
