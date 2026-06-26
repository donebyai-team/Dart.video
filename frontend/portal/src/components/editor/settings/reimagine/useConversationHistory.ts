import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConversationMessage } from '@coasterai/pb/coasterai/core/v1/chat_pb'
import { useClientsContext } from '@coasterai/ui-core/context/ClientContext'
import { useVideoStore } from '@/stores/video'
import { getConnectError } from '@/utils/error'
import toast from 'react-hot-toast'
import { getCheckpointSlideUpdate } from './checkpointSlide'

interface UseConversationHistoryOptions {
  videoId?: string
  enabled: boolean
}

export const useConversationHistory = ({ videoId, enabled }: UseConversationHistoryOptions) => {
  const { portalClient } = useClientsContext()
  const selectedSlide = useVideoStore(s => s.selectedSlide)
  const videoVersion = useVideoStore(s => s.videoConfig?.version ?? (0 as unknown as bigint))
  const selectedSlideId = selectedSlide?.id
  const updateSlideById = useVideoStore(s => s.updateSlideById)
  const requestIdRef = useRef(0)
  const selectedSlideRef = useRef(selectedSlide)
  const videoVersionRef = useRef(videoVersion)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    selectedSlideRef.current = selectedSlide
  }, [selectedSlide])

  useEffect(() => {
    videoVersionRef.current = videoVersion
  }, [videoVersion])

  const loadConversationHistory = useCallback(async (checkpointMessage?: ConversationMessage) => {
    const slideId = selectedSlideRef.current?.id

    if (!videoId || !slideId) {
      requestIdRef.current += 1
      setMessages([])
      setIsLoading(false)
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    try {
      setIsLoading(true)
      const response = await portalClient.getConversationHistory({
        videoId,
        slideId,
        checkpoint: checkpointMessage?.id,
        videoVersion: videoVersionRef.current,
      })

      if (requestId !== requestIdRef.current) {
        return
      }

      if (checkpointMessage) {
        const currentSelectedSlide = selectedSlideRef.current
        updateSlideById(slideId, getCheckpointSlideUpdate(currentSelectedSlide ?? undefined, checkpointMessage))
      }

      setMessages(response.messages)
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return
      }

      setMessages([])
      toast.error(getConnectError(error))
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [portalClient, updateSlideById, videoId])

  useEffect(() => {
    if (!enabled) {
      return
    }

    void loadConversationHistory()
  }, [enabled, loadConversationHistory, selectedSlideId])

  return {
    messages,
    isLoading,
    refreshConversationHistory: () => loadConversationHistory(),
    revertToCheckpoint: (checkpointMessage: ConversationMessage) => loadConversationHistory(checkpointMessage),
    isRevertingCheckpoint: isLoading,
  }
}
