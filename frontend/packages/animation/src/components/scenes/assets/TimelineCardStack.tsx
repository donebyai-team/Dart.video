import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { ArrayItem } from '../../../core/assets/ArrayItem';
import { CardAsset, ClippedText, TextProps } from '../../../core/assets';
import { useArrayPatch, useElement } from '../../../patches';
import type { ComponentRegistration } from '../../../registry/registry';
import { useAspectPreset } from '../../../styles';
import { useTheme } from '../../../theme';

const CARD_ENTRANCE_DURATION = 22;
const CARD_TRANSITION_DURATION = 18;
const CARD_HOLD_FRAMES = 14;
const CARD_ENTRY_OFFSET_Y = 240;
const MIN_CONNECTOR_HEIGHT = 120;
const CONNECTOR_PADDING = 0;
const DEFAULT_CARD_BG = 'rgba(36,36,36,0.94)';
const DEFAULT_CARD_BORDER = 'rgba(255,255,255,0.12)';
const DEFAULT_TEXT_COLOR = '#F5F5F5';
const DEFAULT_TEXT_PROPS: TextProps = {
  text: '',
  variant: 'display',
};

type CardVisualState = {
  index: number;
  translateY: number;
  scale: number;
  opacity: number;
  textTranslateY: number;
  zIndex: number;
};

export function TimelineCardStack(): React.ReactElement {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const preset = useAspectPreset();
  const featureItems = useArrayPatch('features');
  const theme = useTheme();

  const cardWidth = Math.min(preset.width * 0.44, 1160);
  const cardMinHeight = Math.min(preset.height * 0.20, 240);
  const cardRadius = Math.max(36, Math.round(cardWidth * 0.052));
  const timelineTravelDistance = Math.max(
    cardMinHeight + MIN_CONNECTOR_HEIGHT + CONNECTOR_PADDING * 2,
    Math.round(preset.height * 0.56),
  );
  const persistentConnectorHeight = Math.max(
    MIN_CONNECTOR_HEIGHT,
    timelineTravelDistance - cardMinHeight - CONNECTOR_PADDING * 2,
  );

  const initialBlock = CARD_ENTRANCE_DURATION + CARD_HOLD_FRAMES;
  const perCardBlock = CARD_TRANSITION_DURATION + CARD_HOLD_FRAMES;
  const allTransitionsFrames = Math.max(0, featureItems.length - 1) * perCardBlock;
  const settledOnLastCard = frame >= initialBlock + allTransitionsFrames;

  let cardsToRender: CardVisualState[] = [];

  if (featureItems.length === 1) {
    const entryProgress = spring({
      fps,
      frame: Math.max(0, frame + 2),
      durationInFrames: CARD_ENTRANCE_DURATION,
      config: {
        damping: 14,
        stiffness: 110,
        mass: 0.9,
      },
    });

    cardsToRender = [
      {
        index: 0,
        translateY: (1 - entryProgress) * CARD_ENTRY_OFFSET_Y,
        scale: 0.96 + entryProgress * 0.04,
        opacity: Math.max(0.1, Math.min(1, entryProgress * 1.2)),
        textTranslateY: (1 - entryProgress) * Math.min(104, cardMinHeight * 0.5),
        zIndex: 3,
      },
    ];
  } else if (frame < initialBlock) {
    const entryProgress = spring({
      fps,
      frame: Math.max(0, frame + 2),
      durationInFrames: CARD_ENTRANCE_DURATION,
      config: {
        damping: 14,
        stiffness: 110,
        mass: 0.9,
      },
    });

    cardsToRender = [
      {
        index: 0,
        translateY: (1 - entryProgress) * CARD_ENTRY_OFFSET_Y,
        scale: 0.96 + entryProgress * 0.04,
        opacity: Math.max(0.1, Math.min(1, entryProgress * 1.2)),
        textTranslateY: (1 - entryProgress) * Math.min(104, cardMinHeight * 0.5),
        zIndex: 3,
      },
    ];
  } else if (settledOnLastCard) {
    cardsToRender = [
      {
        index: featureItems.length - 1,
        translateY: 0,
        scale: 1,
        opacity: 1,
        textTranslateY: 0,
        zIndex: 3,
      },
    ];
  } else {
    const afterInitial = frame - initialBlock;
    const blockIndex = Math.floor(afterInitial / perCardBlock);
    const blockFrame = afterInitial % perCardBlock;

    if (blockFrame < CARD_TRANSITION_DURATION) {
      const transitionFrame = blockFrame;
      const nextEntryProgress = spring({
        fps,
        frame: transitionFrame,
        durationInFrames: CARD_TRANSITION_DURATION,
        config: {
          damping: 15,
          stiffness: 120,
          mass: 0.95,
        },
      });

      const currentState: CardVisualState = {
        index: blockIndex,
        translateY: 0,
        scale: 1,
        opacity: 1,
        textTranslateY: 0,
        zIndex: 3,
      };

      const nextState: CardVisualState = {
        index: blockIndex + 1,
        translateY: (1 - nextEntryProgress) * CARD_ENTRY_OFFSET_Y,
        scale: 0.96 + nextEntryProgress * 0.04,
        opacity: Math.max(0.12, Math.min(1, nextEntryProgress * 1.2)),
        textTranslateY: (1 - nextEntryProgress) * Math.min(104, cardMinHeight * 0.5),
        zIndex: 2,
      };
      const sharedTransitionProgress = interpolate(
        transitionFrame,
        [0, CARD_TRANSITION_DURATION],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );

      currentState.translateY = -sharedTransitionProgress * timelineTravelDistance;
      currentState.scale = interpolate(sharedTransitionProgress, [0, 1], [1, 0.96], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      currentState.opacity = interpolate(sharedTransitionProgress, [0, 1], [1, 0.84], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      currentState.textTranslateY = interpolate(sharedTransitionProgress, [0, 1], [0, -28], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });

      nextState.translateY = (1 - sharedTransitionProgress) * timelineTravelDistance;
      nextState.scale = 0.96 + nextEntryProgress * 0.04;
      nextState.opacity = Math.max(0.16, Math.min(1, nextEntryProgress * 1.2));
      nextState.textTranslateY = (1 - nextEntryProgress) * Math.min(104, cardMinHeight * 0.5);

      cardsToRender = [currentState, nextState];
    } else {
      cardsToRender = [
        {
          index: blockIndex + 1,
          translateY: 0,
          scale: 1,
          opacity: 1,
          textTranslateY: 0,
          zIndex: 3,
        },
      ];
    }
  }

  const renderConnectorSegment = (direction: 'top' | 'bottom') => (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        width: 4,
        height: persistentConnectorHeight,
        transform: 'translateX(-50%)',
        borderRadius: 999,
        filter: 'drop-shadow(0 0 10px rgba(236,219,203,0.35))',
        backgroundImage: `repeating-linear-gradient(
          to bottom,
          ${theme.colors.foreground} 0px,
          ${theme.colors.foreground} 14px,
          transparent 14px,
          transparent 28px
        )`,
        backgroundPosition: `0 ${connectorDashOffset}px`,
        backgroundSize: '100% 28px',
        top: direction === 'top' ? -(persistentConnectorHeight + CONNECTOR_PADDING) : undefined,
        bottom: direction === 'bottom' ? -(persistentConnectorHeight + CONNECTOR_PADDING) : undefined,
        opacity: 1,
        zIndex: 5,
      }}
    />
  );

  const renderCard = ({ index, opacity, scale, textTranslateY, translateY, zIndex }: CardVisualState) => {
    const { props: textProps, style } = useElement<TextProps>(`text-features-${index}`, DEFAULT_TEXT_PROPS);
    const showTopConnector = index > 0;
    const showBottomConnector = index < featureItems.length - 1;

    return (
      <ArrayItem
        key={`feature-card-${index}`}
        index={index}
        source="features"
        removeControl="mid-left"
        addControl="mid-right"
        max={8}
        min={1}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: cardWidth,
          display: 'block',
          opacity,
          zIndex,
          transform: `translate(-50%, calc(-50% + ${translateY}px)) scale(${scale})`,
          overflow: 'visible',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            overflow: 'visible',
          }}
        >
          {showTopConnector ? renderConnectorSegment('top') : null}
          {showBottomConnector ? renderConnectorSegment('bottom') : null}

          <CardAsset
            id={`container-features-${index}`}
            style={{
              width: '100%',
              minHeight: cardMinHeight,
              padding: `${Math.max(34, Math.round(cardMinHeight * 0.2))}px ${Math.max(52, Math.round(cardWidth * 0.08))}px`,
              borderRadius: cardRadius,
              borderWidth: 4,
              borderColor: DEFAULT_CARD_BORDER,
              backgroundColor: DEFAULT_CARD_BG,
              boxShadow: '0 0 0 16px rgba(255,255,255,0.04), 0 30px 72px rgba(0,0,0,0.46)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >

            <ClippedText
              id={`text-features-${index}`}
              text={textProps.text ?? ''}
              variant={textProps.variant}
              style={{
                ...style,                
                color: DEFAULT_TEXT_COLOR,
                maxWidth: '100%',
              }}
              inline={false}
              clipStyle={{
                display: 'block',
                maxWidth: cardWidth - Math.max(72, Math.round(cardWidth * 0.14)),
                textAlign: 'center',
              }}
              contentStyle={{
                transform: `translateY(${textTranslateY}px)`,
              }}
            />
          </CardAsset>
        </div>
      </ArrayItem>
    );
  };
  const connectorDashOffset = -((frame * 0.35) % 28);

  return (
    <div
      style={{
        width: preset.width,
        height: preset.height,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {cardsToRender.map(renderCard)}
    </div>
  );
}

export const TimelineCardStackSchema = [
  {
    type: 'repeat',
    source: 'features',
    map: 'props.features',
    components: [
      {
        name: 'text',
        fields: [
          {
            name: 'text',
            type: 'string',
            datatype: 'text',
            map: 'item',
          },
          {
            name: 'variant',
            type: 'enum',
            default: DEFAULT_TEXT_PROPS.variant,
          },
        ],
      },
      {
        name: 'container',
        fields: [],
      },
    ],
  },
];

export const TimelineCardStackDescriptor: ComponentRegistration = {
  name: 'TimelineCardStack',
  type: 'scene',
  tags: ['Solution', 'Product Info', 'Features'],
  schema: TimelineCardStackSchema,
  llmSchema: [
    {
      name: 'features',
      type: 'array',
      items: {
        type: 'string',
      },
      range: 'min 2 short feature labels',
    },
  ],
  description: 'Timeline-style vertical sequence of feature cards. One card centers at a time, then hands off to the next with a dashed connector.',
  instructions: 'use it to show a list of features or emphasis words',
  celExpression: `${CARD_ENTRANCE_DURATION} + ${CARD_HOLD_FRAMES} + max(0, size(props.features) - 1) * (${CARD_TRANSITION_DURATION} + ${CARD_HOLD_FRAMES})`,
};
