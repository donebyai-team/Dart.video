import type { ConversationMessage } from '@coasterai/pb/coasterai/core/v1/chat_pb'
import type { Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'

export const getCheckpointSlideUpdate = (
  slide: Slide | undefined,
  checkpointMessage: ConversationMessage,
): Partial<Slide> => ({
  durationInFrames: checkpointMessage.durationInFrames ?? slide?.durationInFrames,
  content: {
    ...(slide?.content ?? {}),
    codeRegistry: {
      ...(slide?.content?.codeRegistry ?? {}),
      mUrl: checkpointMessage.codeSnapshot,
      defaults: checkpointMessage.defaultCodeData,
    },
  } as any,
})

export const getCheckpointPreviewSlide = (
  slide: Slide | undefined,
  checkpointMessage: ConversationMessage,
): Slide | null => {
  if (!slide) {
    return null
  }

  return {
    ...slide,
    ...getCheckpointSlideUpdate(slide, checkpointMessage),
  } as Slide
}
