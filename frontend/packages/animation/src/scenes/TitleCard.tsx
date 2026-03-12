import React from 'react';
import { spring } from 'remotion';
import { useDurationCollector } from '../duration/DurationCollector';
import { useSpeedFactor, applySpeedFactor } from '../duration/speedFactor';
import { useStyleContext } from '../styles/StyleContext';
import { getSpringConfig } from '../styles/easingResolver';
import { TYPOGRAPHY_VARIANTS } from '../tokens/semantic';
import { FONT_SIZE_VALUES, FONT_WEIGHT_VALUES } from '../tokens/typography';

export interface TitleCardProps {
  frame: number;
  heading: string;
  subheading?: string;
  eyebrow?: string;
  delay?: number;
}

/**
 * Hero composition scene component.
 * All visual decisions are internal — LLM provides data and timing only.
 * Reads all visual values from StyleContext.
 */
export function TitleCard({
  frame,
  heading,
  subheading,
  eyebrow,
  delay = 0,
}: TitleCardProps): React.ReactElement {
  const styleConfig = useStyleContext();
  const speedFactor = useSpeedFactor();
  const registerEndFrame = useDurationCollector();

  const adjustedDelay = applySpeedFactor(delay, speedFactor);
  const eyebrowDuration = 20;
  const headingDuration = 25;
  const subheadingDuration = 20;
  const subheadingDelay = adjustedDelay + 15;
  const eyebrowAnimDelay = adjustedDelay;
  const headingAnimDelay = adjustedDelay + 8;

  const lastFrame = subheading
    ? subheadingDelay + subheadingDuration
    : headingAnimDelay + headingDuration;

  registerEndFrame(lastFrame);

  const springConfig = getSpringConfig(styleConfig.motion, 'entrance');
  const config = { damping: springConfig.damping, stiffness: springConfig.stiffness, mass: springConfig.mass ?? 1 };

  const eyebrowProgress = subheading !== undefined || eyebrow !== undefined
    ? Math.max(0, Math.min(1, spring({ frame: frame - eyebrowAnimDelay, fps: 30, config, durationInFrames: eyebrowDuration })))
    : 0;

  const headingProgress = Math.max(0, Math.min(1, spring({
    frame: frame - headingAnimDelay,
    fps: 30,
    config,
    durationInFrames: headingDuration,
  })));

  const subheadingProgress = subheading
    ? Math.max(0, Math.min(1, spring({ frame: frame - subheadingDelay, fps: 30, config, durationInFrames: subheadingDuration })))
    : 0;

  const headingVariant = TYPOGRAPHY_VARIANTS['display'];
  const subheadingVariant = TYPOGRAPHY_VARIANTS['subheading'];
  const eyebrowVariant = TYPOGRAPHY_VARIANTS['label'];

  const fontFamilyMap: Record<string, string> = {
    sans: 'system-ui, sans-serif',
    serif: 'Georgia, serif',
    mono: 'monospace',
    handwritten: 'cursive',
  };
  const fontFamily = fontFamilyMap[styleConfig.type.family] ?? fontFamilyMap['sans'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {eyebrow && (
        <span
          style={{
            fontSize: FONT_SIZE_VALUES[eyebrowVariant.fontSize],
            fontWeight: FONT_WEIGHT_VALUES[eyebrowVariant.fontWeight],
            lineHeight: eyebrowVariant.lineHeight,
            fontFamily,
            textTransform: styleConfig.type.transform === 'none' ? undefined : styleConfig.type.transform,
            opacity: eyebrowProgress,
            transform: `translateY(${(1 - eyebrowProgress) * 20}px)`,
          }}
        >
          {eyebrow}
        </span>
      )}
      <span
        style={{
          fontSize: FONT_SIZE_VALUES[headingVariant.fontSize],
          fontWeight: FONT_WEIGHT_VALUES[headingVariant.fontWeight],
          lineHeight: headingVariant.lineHeight,
          fontFamily,
          textTransform: styleConfig.type.transform === 'none' ? undefined : styleConfig.type.transform,
          opacity: headingProgress,
          transform: `translateY(${(1 - headingProgress) * 30}px)`,
        }}
      >
        {heading}
      </span>
      {subheading && (
        <span
          style={{
            fontSize: FONT_SIZE_VALUES[subheadingVariant.fontSize],
            fontWeight: FONT_WEIGHT_VALUES[subheadingVariant.fontWeight],
            lineHeight: subheadingVariant.lineHeight,
            fontFamily,
            opacity: subheadingProgress,
            transform: `translateY(${(1 - subheadingProgress) * 20}px)`,
          }}
        >
          {subheading}
        </span>
      )}
    </div>
  );
}
