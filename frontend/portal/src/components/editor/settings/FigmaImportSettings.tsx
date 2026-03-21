'use client'

import { useState } from 'react'
import { create } from '@bufbuild/protobuf'
import FigmaImportPanel from '@/components/figma/FigmaImportPanel'
import { portalClient } from '@/services/grpc'
import { useVideoStore } from '@/stores/video'
import { toast } from '@/hooks/use-toast'
import { getConnectError } from '@/utils/error'
import { type FigmaFrame } from '@coasterai/pb/coasterai/portal/v1/portal_pb'
import { MediaSlideContentSchema, MediaType, SlideType, type Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'

interface FigmaImportSettingsProps {
  onClose: () => void
}

const FigmaImportSettings = ({ onClose }: FigmaImportSettingsProps) => {
  const selectedSlide = useVideoStore(s => s.selectedSlide)
  const updateSlide = useVideoStore(s => s.updateSlide)
  const [isImporting, setIsImporting] = useState(false)

  const mediaSlide = selectedSlide?.slide
  const canImport = mediaSlide?.type === SlideType.MEDIA

  const handleImport = async ({ fileKey, selectedFrame }: { fileKey: string; selectedFrame: FigmaFrame; sectionNote?: string }) => {
    if (!selectedSlide?.slide || selectedSlide.slide.type !== SlideType.MEDIA) {
      return
    }

    setIsImporting(true)
    try {
      const res = await portalClient.importFigmaFrame({
        fileKey,
        nodeId: selectedFrame.nodeId
      })

      const currentSlide = selectedSlide.slide
      const currentContent = currentSlide.content.case === 'media' ? currentSlide.content.value : undefined
      const nextContent = create(MediaSlideContentSchema, {
        meta: currentContent?.meta,
        src: res.asset?.url ?? selectedFrame?.thumbnailUrl ?? '',
        style: currentContent?.style ?? {},
        mediaType: res.asset?.mediaType ?? MediaType.IMAGE,
        uploadedMedia: res.asset,
        plan: currentContent?.plan
      })

      updateSlide({
        content: {
          case: 'media',
          value: nextContent
        }
      } as Partial<Slide>)

      toast({
        title: 'Imported from Figma',
        description: selectedFrame ? `${selectedFrame.name} was added to the slide.` : 'Frame imported successfully.'
      })
      onClose()
    } catch (error) {
      toast({
        title: 'Failed to import frame',
        description: getConnectError(error),
        variant: 'destructive'
      })
    } finally {
      setIsImporting(false)
    }
  }

  return <FigmaImportPanel onClose={onClose} onConfirm={handleImport} isConfirming={isImporting} canConfirm={canImport} />
}

export default FigmaImportSettings
