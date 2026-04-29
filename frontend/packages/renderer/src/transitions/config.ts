import {
  Slide,
  TransitionDirection,
  TransitionType
} from '@coasterai/pb/coasterai/core/v1/slide_pb'

export type RemotionTransitionDirection =
  | 'from-left'
  | 'from-right'
  | 'from-top'
  | 'from-bottom'

export interface TransitionOptionConfig {
  id: TransitionType
  name: string
  preview: string
  supportsDirection: boolean
  defaultDirection?: RemotionTransitionDirection
}

export const TRANSITION_OPTIONS: TransitionOptionConfig[] = [
  {
    id: TransitionType.TRANSITION_NONE,
    name: 'None',
    preview: 'bg-muted',
    supportsDirection: false
  },
  {
    id: TransitionType.TRANSITION_STRIPPED_SLAM,
    name: 'Striped Slam',
    preview: 'bg-gradient-to-br from-muted via-primary/20 to-transparent',
    supportsDirection: false
  },
  {
    id: TransitionType.TRANSITION_FADE,
    name: 'Fade',
    preview: 'bg-gradient-to-r from-muted to-transparent',
    supportsDirection: false
  },
  {
    id: TransitionType.TRANSITION_SLIDE_LEFT,
    name: 'Slide',
    preview: 'bg-gradient-to-l from-muted via-primary/20 to-transparent',
    supportsDirection: true,
    defaultDirection: 'from-right'
  },
  {
    id: TransitionType.TRANSITION_WIPE_LEFT,
    name: 'Wipe',
    preview: 'bg-gradient-to-l from-muted via-primary/20 to-transparent',
    supportsDirection: true,
    defaultDirection: 'from-right'
  },
  {
    id: TransitionType.TRANSITION_FLIP_LEFT,
    name: 'Flip',
    preview: 'bg-gradient-to-l from-muted via-primary/20 to-transparent',
    supportsDirection: true,
    defaultDirection: 'from-left'
  },
  {
    id: TransitionType.TRANSITION_CLOCK_WIPE,
    name: 'Clock Wipe',
    preview: 'bg-gradient-to-br from-muted via-primary/20 to-transparent',
    supportsDirection: false
  },
  {
    id: TransitionType.TRANSITION_IRIS,
    name: 'Iris',
    preview: 'bg-gradient-to-br from-muted via-primary/20 to-transparent',
    supportsDirection: false
  }
]

export const TRANSITION_DIRECTION_OPTIONS: Array<{
  id: TransitionDirection
  label: string
}> = [
    { id: TransitionDirection.FROM_LEFT, label: 'From Left' },
    { id: TransitionDirection.FROM_RIGHT, label: 'From Right' },
    { id: TransitionDirection.FROM_TOP, label: 'From Top' },
    { id: TransitionDirection.FROM_BOTTOM, label: 'From Bottom' }
  ]

export const transitionOptionById = new Map(
  TRANSITION_OPTIONS.map(option => [option.id, option])
)

export const isDirectionSupportedTransition = (transitionType: TransitionType): boolean =>
  transitionOptionById.get(transitionType)?.supportsDirection ?? false

export const protoDirectionToRemotion = (
  direction?: TransitionDirection
): RemotionTransitionDirection | undefined => {
  switch (direction) {
    case TransitionDirection.FROM_LEFT:
      return 'from-left'
    case TransitionDirection.FROM_RIGHT:
      return 'from-right'
    case TransitionDirection.FROM_TOP:
      return 'from-top'
    case TransitionDirection.FROM_BOTTOM:
      return 'from-bottom'
    default:
      return undefined
  }
}

export const remotionDirectionToProto = (
  direction?: RemotionTransitionDirection
): TransitionDirection | undefined => {
  switch (direction) {
    case 'from-left':
      return TransitionDirection.FROM_LEFT
    case 'from-right':
      return TransitionDirection.FROM_RIGHT
    case 'from-top':
      return TransitionDirection.FROM_TOP
    case 'from-bottom':
      return TransitionDirection.FROM_BOTTOM
    default:
      return undefined
  }
}

export const getSlideTransitionDirectionValue = (
  slide?: Slide
): TransitionDirection | undefined => {
  if (!slide) {
    return undefined
  }

  if (slide.direction !== undefined) {
    return slide.direction
  }

  const planDirection = (slide.plan as Record<string, unknown> | undefined)?.transition_direction
  if (typeof planDirection === 'number') {
    return planDirection as TransitionDirection
  }

  return undefined
}
