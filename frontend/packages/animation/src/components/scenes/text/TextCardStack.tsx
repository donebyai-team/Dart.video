import React from 'react';
import { useCurrentFrame } from 'remotion';
import { composeTransforms, usePatchedProps, useStyleOverride } from '../../../patches';
import { interpolateWithEasing } from '../../../styles/easingResolver';
import { useStyleContext } from '../../../styles/StyleContext';
import { useAspectPreset } from '../../../styles/AspectPresetContext';
import { useTheme } from '../../../theme/ThemeContext';
import type { TypographyVariant } from '../../../tokens/semantic';
import { resolveTypography } from '../../../tokens/resolveTypography';
import type { ComponentRegistration } from '../../../registry/registry';
import { buildDepthShadow } from '../../../styles';
import { DEFAULT_SPEED_PERCENTAGE, getSpeed, MIN_SPEED_PERCENTAGE, scaleTiming } from '../../../speed/timings';
import { CardAsset } from '../../../core/assets';

const BASE_ENTRY_DURATION = 22;
const BASE_SETTLE_DURATION = 0;
const BASE_HOLD_DURATION = 14;
const BASE_EXIT_DURATION = 10;
const BASE_CARD_GAP = 1;
const MIN_VISIBLE_PROGRESS = 0.08;


export const TextCardStackDefaults = {
  id: 'textcardstack',
  startAt: 0,
  texts: [
    'Long onboarding calls slow every handoff.',
    'Context gets lost between tools and teams.',
    'Follow-ups keep slipping through the cracks.',
  ],
  variant: 'heading' as TypographyVariant,
  speed: DEFAULT_SPEED_PERCENTAGE,
  className: undefined as string | undefined,
  style: undefined as React.CSSProperties | undefined,
};

export type TextCardStackProps = Partial<typeof TextCardStackDefaults>;

export const TextCardStack: React.FC<TextCardStackProps> = (initProps) => {
  const frame = useCurrentFrame();
  const styleConfig = useStyleContext();
  const theme = useTheme();
  const preset = useAspectPreset();
  const defaultProps = { ...TextCardStackDefaults, ...initProps };
  const id = defaultProps.id;
  const props = usePatchedProps(id, defaultProps);

  const styleOverride = useStyleOverride(id);
  const { transform: _ignoredOverrideTransform, ...styleOverrideWithoutTransform } = styleOverride;
  const { transform: _ignoredPropStyleTransform, ...propStyleWithoutTransform } = props.style ?? {};
  const typographyStyle = resolveTypography(props.variant, styleConfig, theme, preset);

  const speed = getSpeed(props.speed);
  const entryDuration = scaleTiming(BASE_ENTRY_DURATION, speed);
  const settleDuration = scaleTiming(BASE_SETTLE_DURATION, speed);
  const holdDuration = scaleTiming(BASE_HOLD_DURATION, speed);
  const exitDuration = scaleTiming(BASE_EXIT_DURATION, speed);
  const cardGap = scaleTiming(BASE_CARD_GAP, speed);

  const cardCycleDuration = entryDuration + settleDuration + holdDuration + exitDuration + cardGap;
  const texts = props.texts.filter((text): text is string => Boolean(text && text.trim()));
  const cardWidth = Math.min(preset.width * 0.78, 920);
  const cardMinHeight = Math.min(preset.height * 0.34, 340);
  const cardPaddingX = Math.max(40, Math.round(cardWidth * 0.065));
  const cardPaddingY = Math.max(30, Math.round(cardMinHeight * 0.16));
  const cardRadius = Math.max(28, Math.round(cardWidth * 0.055));
  const bodyFontSize = typeof typographyStyle.fontSize === 'number'
    ? typographyStyle.fontSize
    : Number.parseFloat(String(typographyStyle.fontSize ?? 64)) || 64;
  const textStyleOverrides: React.CSSProperties = {
    ...propStyleWithoutTransform,
    ...styleOverrideWithoutTransform,
  };

  if (texts.length === 0) {
    return null;
  }

  const activeIndex = Math.min(Math.floor(Math.max(0, frame - props.startAt) / cardCycleDuration), texts.length - 1);

  return (
    <div
      className={props.className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        perspective: 1800,
        transformStyle: 'preserve-3d',
      }}
    >
      {texts.map((text, index) => {
        const localFrame = frame - props.startAt - index * cardCycleDuration;
        const isPast = index < activeIndex;
        if (localFrame < 0 || isPast || index > activeIndex) {
          return null;
        }

        const direction = index % 2 === 0 ? -1 : 1;
        const usesRotateX = index % 2 === 1;
        const holdStart = entryDuration + settleDuration;
        const motionEnd = holdStart + holdDuration;
        const exitStart = motionEnd;
        // Timeline phases: enter -> hold -> exit.
        const entryProgress = interpolateWithEasing(
          localFrame,
          [0, Math.max(1, entryDuration)],
          [0, 1],
          'ease-out',
        );
        const exitProgress = interpolateWithEasing(
          localFrame,
          [exitStart, exitStart + exitDuration],
          [0, 1],
          'ease-in',
        );
        const phase = localFrame < holdStart ? 'entry' : localFrame < exitStart ? 'hold' : 'exit';

        if (entryProgress <= 0.001 && phase === 'entry') {
          return null;
        }

        const opacity = phase === 'entry'
          ? Math.max(MIN_VISIBLE_PROGRESS, entryProgress)
          : phase === 'hold'
            ? 1
            : Math.max(0, 1 - exitProgress);

        if (opacity <= 0) {
          return null;
        }

        // Hold pose: the card stays readable before the playful exit begins.
        const holdRotateY = direction * 9;
        const holdRotateZ = direction * 1.25;
        const rotateAxis = phase === 'entry'
          ? direction * (58 - entryProgress * 49)
          : phase === 'hold'
            ? holdRotateY
            : holdRotateY + exitProgress * direction * 24;
        const rotateZ = phase === 'entry'
          ? direction * (18 - entryProgress * 16.75)
          : phase === 'hold'
            ? holdRotateZ
            : holdRotateZ + exitProgress * direction * 12;
        const scale = phase === 'entry'
          ? 0.34 + entryProgress * 0.66
          : phase === 'hold'
            ? 1
            : 1 - exitProgress * 0.26;
        const entryTravelX = direction * (preset.width * 0.42 - entryProgress * preset.width * 0.42);
        const entryTravelY = 58 - entryProgress * 58;
        const exitTravelX = exitProgress * direction * (preset.width * 0.42);
        const exitTravelY = exitProgress * -52;
        const translateX = usesRotateX
          ? phase === 'entry'
            ? direction * 18
            : phase === 'hold'
              ? 0
              : exitProgress * direction * 28
          : phase === 'entry'
            ? entryTravelX
            : phase === 'hold'
              ? 0
              : exitTravelX;
        const translateY = usesRotateX
          ? phase === 'entry'
            ? direction * (preset.height * 0.34 - entryProgress * preset.height * 0.34)
            : phase === 'hold'
              ? 0
              : exitProgress * direction * (preset.height * 0.34)
          : phase === 'entry'
            ? entryTravelY
            : phase === 'hold'
              ? 0
              : exitTravelY;
        const translateZ = phase === 'entry'
          ? -300 + entryProgress * 300
          : phase === 'hold'
            ? 0
            : exitProgress * -260;
        const rotateX = usesRotateX ? rotateAxis : 0;
        const rotateY = usesRotateX ? 0 : rotateAxis;
        // Axis mix: alternate cards travel with either X-tilt or Y-tilt motion.

        return (
          <div
            key={`${id}-${index}`}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            <CardAsset
              id="container"
              style={{
                width: cardWidth,
                minHeight: cardMinHeight,
                boxShadow: buildDepthShadow(3),
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                transformStyle: 'preserve-3d',
                transformOrigin: '50% 50%',
                opacity,
                transform: composeTransforms(
                  // Entry / hold / exit travel lives here so the whole card moves as one piece.
                  'perspective(2200px)',
                  `translate3d(${translateX}px, ${translateY}px, ${translateZ}px)`,
                  `rotateX(${rotateX}deg)`,
                  `rotateY(${rotateY}deg)`,
                  `rotateZ(${rotateZ}deg)`,
                  `scale(${scale})`,
                ),
                // Default styling, can we passed in the schema but not necessary
                padding: `${cardPaddingY}px ${cardPaddingX}px`,
                borderRadius: cardRadius,
                border: `4px solid ${theme.colors.foreground}`,
                gap: Math.max(16, Math.round(bodyFontSize * 0.18)),
              }}
            >
              <span
                style={{
                  ...typographyStyle,
                  // color: textStyleOverrides.color ?? theme.colors.cardForeground,
                  lineHeight: 1.08,
                  maxWidth: '96%',
                  // Text styling overrides should affect every card consistently.
                  ...textStyleOverrides,
                }}
              >
                {text}
              </span>
            </CardAsset>
          </div>
        );
      })}
    </div>
  );
};

export const TextCardStackSchemaFields = [
  {
    "name": "texts",
    "type": "array",
    "datatype": "text",
    "map": "props.texts"
  },
  {
    "name": "variant",
    "type": "enum",
    "default": TextCardStackDefaults.variant
  },
  {
    "name": "speed",
    "type": "number",
    "default": TextCardStackDefaults.speed
  }
];

// Here the container styling is applied to all cards in the stack
// and hence not creating separate onces
export const TextCardStackDescriptor: ComponentRegistration = {
  name: 'TextCardStack',
  type: 'content',
  tags: ['Problem', 'Solution', 'Pain Points'],
  schema: [{
    type: 'component',
    name: 'textcardstack',
    fields: TextCardStackSchemaFields,
  }, {
    type: 'component',
    name: 'container',
    fields: [{
      name: 'style',
      type: 'object',
      default: {},
    }],
  }],
  llmSchema: [
    {
      name: 'texts',
      type: 'array',
      items: {
        type: 'string',
      },
    },
  ],
  description: 'Displays problem or solution statements as playful stacked cards. Best for short descriptive phrases; avoid very brief (one- or two-word) content.',
  celExpression: `(((${BASE_ENTRY_DURATION} + ${BASE_SETTLE_DURATION} + ${BASE_HOLD_DURATION} + ${BASE_EXIT_DURATION} + ${BASE_CARD_GAP}) * size(props.textcardstack.texts)) * ${DEFAULT_SPEED_PERCENTAGE}) / max(${MIN_SPEED_PERCENTAGE}, props.textcardstack.speed)`,
};
