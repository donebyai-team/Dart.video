import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useSpeedFactor, applySpeedFactor } from '../../../duration/speedFactor';
import { usePatchedProp } from '../../../patches/PatchContext';
import { useStyleContext } from '../../../styles/StyleContext';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { TYPOGRAPHY_VARIANTS } from '../../../tokens/semantic';
import { FONT_SIZE_VALUES, FONT_WEIGHT_VALUES } from '../../../tokens/typography';

export interface TitleCardProps {
  startAt?: number;
  heading: string;
  subheading?: string;
  eyebrow?: string;
  id?: string;
}

/**
 * Hero composition scene component.
 * All visual decisions are internal — LLM provides data and timing only.
 */
export function TitleCard({
  startAt = 0,
  heading,
  subheading,
  eyebrow,
  id,
}: TitleCardProps): React.ReactElement {
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();
  const speedFactor = useSpeedFactor();
  const adjustedStartAt = applySpeedFactor(startAt, speedFactor);

  const patchedHeading = usePatchedProp(id, 'heading', heading);
  const patchedSubheading = usePatchedProp(id, 'subheading', subheading);
  const patchedEyebrow = usePatchedProp(id, 'eyebrow', eyebrow);

  const eyebrowDuration = 20;
  const headingDuration = 25;
  const subheadingDuration = 20;
  const headingAnimStart = adjustedStartAt + 8;
  const subheadingStart = adjustedStartAt + 15;


  const easing = styleConfig.motion.entrance;

  const eyebrowProgress = (patchedSubheading !== undefined || patchedEyebrow !== undefined)
    ? interpolateWithEasing(frame, [adjustedStartAt, adjustedStartAt + eyebrowDuration], [0, 1], easing)
    : 0;

  const headingProgress = interpolateWithEasing(
    frame,
    [headingAnimStart, headingAnimStart + headingDuration],
    [0, 1],
    easing,
  );

  const subheadingProgress = patchedSubheading
    ? interpolateWithEasing(frame, [subheadingStart, subheadingStart + subheadingDuration], [0, 1], easing)
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
      {patchedEyebrow && (
        <span style={{
          fontSize: FONT_SIZE_VALUES[eyebrowVariant.fontSize],
          fontWeight: FONT_WEIGHT_VALUES[eyebrowVariant.fontWeight],
          lineHeight: eyebrowVariant.lineHeight,
          fontFamily,
          textTransform: styleConfig.type.transform === 'none' ? undefined : styleConfig.type.transform,
          opacity: eyebrowProgress,
          transform: `translateY(${(1 - eyebrowProgress) * 20}px)`,
        }}>
          {patchedEyebrow}
        </span>
      )}
      <span style={{
        fontSize: FONT_SIZE_VALUES[headingVariant.fontSize],
        fontWeight: FONT_WEIGHT_VALUES[headingVariant.fontWeight],
        lineHeight: headingVariant.lineHeight,
        fontFamily,
        textTransform: styleConfig.type.transform === 'none' ? undefined : styleConfig.type.transform,
        opacity: headingProgress,
        transform: `translateY(${(1 - headingProgress) * 30}px)`,
      }}>
        {patchedHeading}
      </span>
      {patchedSubheading && (
        <span style={{
          fontSize: FONT_SIZE_VALUES[subheadingVariant.fontSize],
          fontWeight: FONT_WEIGHT_VALUES[subheadingVariant.fontWeight],
          lineHeight: subheadingVariant.lineHeight,
          fontFamily,
          opacity: subheadingProgress,
          transform: `translateY(${(1 - subheadingProgress) * 20}px)`,
        }}>
          {patchedSubheading}
        </span>
      )}
    </div>
  );
}
