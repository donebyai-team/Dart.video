import { TransitionDirection, TransitionType } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { clockWipe } from '@remotion/transitions/clock-wipe'
import { fade } from '@remotion/transitions/fade'
import { flip } from '@remotion/transitions/flip'
import { iris } from '@remotion/transitions/iris'
import { none } from '@remotion/transitions/none'
import { slide } from '@remotion/transitions/slide'
import { wipe } from '@remotion/transitions/wipe'
import { RemotionTransitionDirection, protoDirectionToRemotion } from './config'

const getDirection = (
  direction?: TransitionDirection
): RemotionTransitionDirection | undefined => {
  // If slide has an explicit direction, it wins.
  const mapped = protoDirectionToRemotion(direction)
  if (mapped) {
    return mapped
  }
  return undefined
}

export const getTransitionPresentation = (
  transitionType: TransitionType = TransitionType.TRANSITION_NONE,
  direction?: TransitionDirection,
  width: number = 1920,
  height: number = 1080
) => {
  const resolvedDirection = getDirection(direction)

  switch (transitionType) {
    case TransitionType.TRANSITION_FADE:
      return fade()
    case TransitionType.TRANSITION_SLIDE_LEFT:
    case TransitionType.TRANSITION_SLIDE_RIGHT:
    case TransitionType.TRANSITION_SLIDE_UP:
    case TransitionType.TRANSITION_SLIDE_DOWN:
      return slide({ direction: resolvedDirection || 'from-right' })
    case TransitionType.TRANSITION_WIPE_LEFT:
    case TransitionType.TRANSITION_WIPE_RIGHT:
    case TransitionType.TRANSITION_WIPE_UP:
    case TransitionType.TRANSITION_WIPE_DOWN:
      return wipe({ direction: resolvedDirection || 'from-right' })
    case TransitionType.TRANSITION_FLIP_LEFT:
    case TransitionType.TRANSITION_FLIP_RIGHT:
    case TransitionType.TRANSITION_FLIP_UP:
    case TransitionType.TRANSITION_FLIP_DOWN:
    case TransitionType.TRANSITION_FLIP_HORIZONTAL:
    case TransitionType.TRANSITION_FLIP_VERTICAL:
      return flip({ direction: resolvedDirection || 'from-left' })
    case TransitionType.TRANSITION_CLOCK_WIPE:
      return clockWipe({ width, height })
    case TransitionType.TRANSITION_IRIS:
      return iris({ width, height })
    case TransitionType.TRANSITION_NONE:
      return none()
    default:
      return fade()
  }
}
