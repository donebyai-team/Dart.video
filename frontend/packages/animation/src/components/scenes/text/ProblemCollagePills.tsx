import React from 'react';
import { Sequence, useCurrentFrame } from 'remotion';
import { composeTransforms, useElement } from '../../../patches';
import type { ComponentRegistration } from '../../../registry/registry';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import type { TypographyVariant } from '../../../tokens/semantic';
import { CardAsset } from '../../../core/assets';
import { TYPEWRITER_TYPING_DURATION, Typewriter } from './Typewriter';

const BASE_FIRST_TYPING_DURATION = TYPEWRITER_TYPING_DURATION;
const BASE_OTHER_TYPING_DURATION = 14;
const BASE_REVEAL_DURATION = 10;
const BASE_REVEAL_STAGGER = 5;
const BASE_CAMERA_ZOOM_DURATION = 52;
const BASE_HOLD_DURATION = 20;
const BASE_OUTRO_DURATION = 30;
const MIN_VISIBLE_PROGRESS = 0.06;

type ScatterSlot = {
  x: number;
  y: number;
  rotate: number;
};

export const ProblemCollagePillsDefaults = {
  id: 'problemcollagepills',
  startAt: 0,
  texts: [
    'Add your text',
  ],
  variant: 'subheading' as TypographyVariant,
  className: undefined as string | undefined,
  style: undefined as React.CSSProperties | undefined,
};

export type ProblemCollagePillsProps = Partial<typeof ProblemCollagePillsDefaults>;

const TARGET_PILL_COUNT = 7;
const FILLER_TEXT = 'Add the text here';

function estimateLineCount(text: string, charsPerLine: number): number {
  return text.split('\n').reduce((total, line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return total + 1;
    }

    return total + Math.max(1, Math.ceil(trimmed.length / charsPerLine));
  }, 0);
}

function buildScatterSlots(
  count: number,
  width: number,
  height: number,
  slotWidth: number,
  slotHeight: number,
): ScatterSlot[] {
  if (count === 0) {
    return [];
  }

  const slots: ScatterSlot[] = [];
  const maxRadiusX = (width * 0.46) - (slotWidth / 2);
  const maxRadiusY = (height * 0.42) - (slotHeight / 2);
  let placed = 0;
  let ring = 0;

  while (placed < count) {
    const ringIndex = ring + 1;
    const ringCount = ring === 0 ? 6 : 6 + ring * 4;
    const radiusX = Math.min(maxRadiusX, ringIndex * slotWidth * 1.4);
    const radiusY = Math.min(maxRadiusY, ringIndex * slotHeight * 1.4);
    const angleOffset = ring % 2 === 0 ? -Math.PI / 2 : -Math.PI / 2 + (Math.PI / ringCount);

    for (let i = 0; i < ringCount && placed < count; i += 1) {
      const angle = angleOffset + (i / ringCount) * Math.PI * 2;
      slots.push({
        x: Math.cos(angle) * radiusX,
        y: Math.sin(angle) * radiusY,
        rotate: 0,
      });
      placed += 1;
    }

    if (radiusX >= maxRadiusX && radiusY >= maxRadiusY && placed < count) {
      const overflowCount = count - placed;
      for (let i = 0; i < overflowCount; i += 1) {
        const angle = (-Math.PI / 2) + (i / Math.max(overflowCount, 1)) * Math.PI * 2;
        slots.push({
          x: Math.cos(angle) * maxRadiusX,
          y: Math.sin(angle) * maxRadiusY,
          rotate: 0,
        });
      }
      break;
    }

    ring += 1;
  }

  return slots;
}

export const ProblemCollagePills: React.FC<ProblemCollagePillsProps> = (initProps) => {
  const frame = useCurrentFrame();
  const preset = useAspectPreset();
  const defaultProps = { ...ProblemCollagePillsDefaults, ...initProps };
  const id = defaultProps.id;
  const { props, style } = useElement(id, defaultProps);
  const inputTexts = props.texts.filter((text): text is string => Boolean(text && text.trim()));
  const texts = inputTexts.length >= TARGET_PILL_COUNT
    ? inputTexts
    : [
      ...inputTexts,
      ...Array.from({ length: TARGET_PILL_COUNT - inputTexts.length }, () => FILLER_TEXT),
    ];

  const firstTypingDuration = BASE_FIRST_TYPING_DURATION;
  const otherTypingDuration = BASE_OTHER_TYPING_DURATION;
  const revealDuration = BASE_REVEAL_DURATION;
  const revealStagger = BASE_REVEAL_STAGGER;
  const cameraZoomDuration = BASE_CAMERA_ZOOM_DURATION;
  const holdDuration = BASE_HOLD_DURATION;
  const outroDuration = BASE_OUTRO_DURATION;
  const zoomStart = firstTypingDuration;
  const outroStart = zoomStart + Math.max(0, texts.length - 1) * revealStagger + otherTypingDuration + holdDuration;
  const outroEnd = outroStart + outroDuration;
  const elapsed = Math.max(0, frame - props.startAt);
  const fontSize = style.fontSize as number;
  const baseLineHeight = typeof style.lineHeight === 'number' ? style.lineHeight : 1.1;
  const pillPaddingX = Math.max(22, Math.round(fontSize * 0.62));
  const pillPaddingY = Math.max(14, Math.round(fontSize * 0.34));
  const pillWidth = Math.min(Math.max(preset.width * 0.22, 300), 420);
  const textBoxWidth = pillWidth - (pillPaddingX * 2);
  const charsPerLine = Math.max(12, Math.floor(textBoxWidth / Math.max(fontSize * 0.58, 1)));
  const pillMinHeight = Math.max(72, Math.min(118, fontSize * 1.9));
  const pillRadius = Math.round(pillMinHeight * 0.56);
  const pillHeights = texts.map((text) => {
    const estimatedLines = estimateLineCount(text, charsPerLine);
    const wrappedTextHeight = estimatedLines * fontSize * baseLineHeight;

    return Math.max(pillMinHeight, wrappedTextHeight + (pillPaddingY * 2) + 8);
  });
  const maxPillHeight = Math.max(...pillHeights, pillMinHeight);
  const slotWidth = pillWidth + Math.max(140, preset.width * 0.11);
  const slotHeight = maxPillHeight + Math.max(86, preset.height * 0.09);
  const slots = buildScatterSlots(texts.length - 1, preset.width, preset.height, slotWidth, slotHeight);

  const cameraZoomProgress = interpolateWithEasing(
    elapsed,
    [zoomStart, zoomStart + cameraZoomDuration],
    [0, 1],
    'ease-out',
  );
  const outroProgress = interpolateWithEasing(
    elapsed,
    [outroStart, outroEnd],
    [0, 1],
    'ease-in-out',
  );
  const sceneOpacity = elapsed < outroStart ? 1 : Math.max(0, 1 - outroProgress);
  const sceneScale = 1 - (cameraZoomProgress * 0.16);
  const groupExitRotate = -20 * outroProgress;
  const centerTypingZoom = interpolateWithEasing(
    elapsed,
    [0, firstTypingDuration],
    [0.8, 1],
    'ease-out',
  );
  const centerText = texts[0];
  const outerTexts = texts.slice(1);

  return (
    <div
      className={props.className}
      style={{}}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: composeTransforms(`scale(${sceneScale})`),
          transformOrigin: '50% 50%',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: sceneOpacity,
            transform: composeTransforms(`rotate(${groupExitRotate}deg)`),
            transformOrigin: '50% 50%',
          }}
        >
        {outerTexts.map((text, index) => {
          const slot = slots[index];
          const revealStart = zoomStart + index * revealStagger;
          const typingStart = revealStart + Math.max(1, Math.floor(revealDuration * 0.25));
          const typingDuration = otherTypingDuration;
          const localFrame = elapsed - revealStart;
          const revealProgress = interpolateWithEasing(
            localFrame,
            [0, revealDuration],
            [0, 1],
            'ease-out',
          );

          if (revealProgress <= 0.001) {
            return null;
          }

          const anchorX = slot.x;
          const anchorY = slot.y;
          const rotate = slot.rotate;
          const revealOpacity = Math.max(MIN_VISIBLE_PROGRESS, revealProgress);
          const exitDriftProgress = elapsed < outroStart
            ? 0
            : interpolateWithEasing(
              elapsed,
              [outroStart, outroEnd],
              [0, 1],
              'ease-in',
            );
          const translateX = anchorX;
          const translateY = anchorY;
          const depth = 0;

          return (
            <div
              key={`${id}-outer-${index}`}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: composeTransforms(
                  'translate(-50%, -50%)',
                  `translate3d(${translateX}px, ${translateY}px, ${depth}px)`,
                  `rotate(${rotate}deg)`,
                  `scale(1)`,
                ),
                transformOrigin: '50% 50%',
                opacity: revealOpacity * (1 - exitDriftProgress),
              }}
            >
              <CardAsset
                id={`container-${index + 1}`}
                style={{
                  boxSizing: 'border-box',
                  width: pillWidth,
                  height: pillHeights[index + 1],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: `${pillPaddingY}px ${pillPaddingX}px`,
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  borderColor: style.color,
                  borderWidth: 5,
                  borderRadius: pillRadius,
                  boxShadow: '0 18px 36px rgba(0,0,0,0.08)',
                }}
              >
                <Sequence from={typingStart} layout="none">
                  <Typewriter
                    id={`typewriter-${index + 1}`}
                    text={text}
                    startAt={0}
                    pulse={false}
                    typingDuration={typingDuration}
                    variant={props.variant}
                    entranceAnimation="fadeIn"
                    className={undefined}
                    style={{
                      ...style,
                      boxSizing: 'border-box',
                      textAlign: 'center',
                      width: textBoxWidth,
                      whiteSpace: 'pre-wrap',
                      display: 'block',
                      // color: 'white',
                    }}
                  />
                </Sequence>
              </CardAsset>
            </div>
          );
        })}
        </div>
        {centerText ? (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: composeTransforms(
                'translate(-50%, -50%)',
                `translate3d(0px, ${-(preset.height * 0.035) * outroProgress}px, 0px)`,
                `scale(${centerTypingZoom + (outroProgress * 0.34)})`,
              ),
              transformOrigin: '50% 50%',
              opacity: 1 - outroProgress,
            }}
          >
            <CardAsset
              id="container-0"
              style={{
                boxSizing: 'border-box',
                width: pillWidth,
                height: pillHeights[0],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: `${pillPaddingY}px ${pillPaddingX}px`,
                backgroundColor: 'rgba(255,255,255,0.14)',
                borderColor: style.color,
                borderWidth: 5,
                borderRadius: pillRadius,
                boxShadow: '0 18px 36px rgba(0,0,0,0.08)',
              }}
            >
              <Sequence from={0} layout="none">
                <Typewriter
                  id="typewriter-0"
                  text={centerText}
                  startAt={0}
                  pulse={false}
                  typingDuration={firstTypingDuration}
                  variant={props.variant}
                  entranceAnimation="fadeIn"
                  className={undefined}
                  style={{
                    ...style,
                    boxSizing: 'border-box',
                    textAlign: 'center',
                    width: textBoxWidth,
                    whiteSpace: 'pre-wrap',
                    display: 'block',
                    // color: 'white',
                  }}
                />
              </Sequence>
            </CardAsset>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const ProblemCollagePillsSchemaFields = [
  {
    name: 'texts',
    type: 'array',
    datatype: 'text',
    map: 'props.texts',
  }
];

export const ProblemCollagePillsDescriptor: ComponentRegistration = {
  name: 'ProblemCollagePills',
  type: 'content',
  tags: ['PROBLEM', 'FRAGMENTATION'],
  schema: [
    {
      type: 'component',
      name: 'problemcollagepills',
      fields: ProblemCollagePillsSchemaFields,
    },
    {
      type: 'component',
      name: 'container',
      fields: [
        {
          name: 'style',
          type: 'object',
          default: {},
        },
      ],
    },
  ],
  llmSchema: [
    {
      name: 'texts',
      type: 'array',
      items: {
        type: 'string',
      },
      range: '7 short phrases, 3-4 word per phrase',
    },
  ],
  description: 'Starts with one typed pill in the center, then zooms out into a scattered field of typing data pills.',
  instructions: "Best used to show problems, scattered data, fragmented workflows, multiple blockers, or disconnected context. Infer exactly 7 short signals from the script even if not explicitly stated.",
  celExpression: `(${BASE_FIRST_TYPING_DURATION} + (max(size(props.problemcollagepills.texts) - 1, 0) * ${BASE_REVEAL_STAGGER}) + ${BASE_OTHER_TYPING_DURATION} + ${BASE_HOLD_DURATION} + ${BASE_OUTRO_DURATION})`,
};
