'use client'

import { useEffect, useMemo, useState } from 'react'
import { create } from '@bufbuild/protobuf'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { portalClient } from '@/services/grpc'
import { useVideoStore } from '@/stores/video'
import { toast } from '@/hooks/use-toast'
import { getConnectError } from '@/utils/error'
import { IntegrationState, IntegrationType, MediaSlideContentSchema, type FigmaFrame, type FigmaIntegration } from '@coasterai/pb/coasterai/portal/v1/portal_pb'
import { MediaType, SlideType, type Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { ExternalLink, Figma, Loader2, RefreshCw, X } from 'lucide-react'

interface FigmaImportSettingsProps {
  onClose: () => void
}

const FigmaImportSettings = ({ onClose }: FigmaImportSettingsProps) => {
  const selectedSlide = useVideoStore(s => s.selectedSlide)
  const updateSlide = useVideoStore(s => s.updateSlide)
  const [isLoadingIntegration, setIsLoadingIntegration] = useState(true)
  const [integration, setIntegration] = useState<FigmaIntegration | null>(null)
  const [fileInput, setFileInput] = useState('')
  const [isLoadingFrames, setIsLoadingFrames] = useState(false)
  const [frames, setFrames] = useState<FigmaFrame[]>([])
  const [fileKey, setFileKey] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const mediaSlide = selectedSlide?.slide
  const canImport = mediaSlide?.type === SlideType.MEDIA

  const selectedFrame = useMemo(
    () => frames.find(frame => frame.nodeId === selectedNodeId) ?? null,
    [frames, selectedNodeId]
  )

  const refreshIntegration = async () => {
    setIsLoadingIntegration(true)
    try {
      const res = await portalClient.getIntegrations({})
      const figmaIntegration = res.integrations.find(
        item => item.type === IntegrationType.FIGMA && item.status === IntegrationState.ACTIVE
      )
      setIntegration(figmaIntegration?.details.case === 'figma' ? figmaIntegration.details.value : null)
    } catch (error) {
      toast({
        title: 'Failed to load integrations',
        description: getConnectError(error),
        variant: 'destructive'
      })
    } finally {
      setIsLoadingIntegration(false)
    }
  }

  useEffect(() => {
    refreshIntegration()
  }, [])

  const handleConnect = async () => {
    try {
      const res = await portalClient.oauthAuthorize({
        integrationType: IntegrationType.FIGMA,
        redirectUrl: window.location.pathname + window.location.search
      })
      window.open(res.authorizeUrl, '_self')
    } catch (error) {
      toast({
        title: 'Unable to start Figma connection',
        description: getConnectError(error),
        variant: 'destructive'
      })
    }
  }

  const handleListFrames = async () => {
    if (!fileInput.trim()) {
      toast({
        title: 'Figma file required',
        description: 'Paste a Figma file URL or file key first.',
        variant: 'destructive'
      })
      return
    }

    setIsLoadingFrames(true)
    try {
      const res = await portalClient.listFigmaFrames({ fileUrl: fileInput.trim() })
      setFrames(res.frames)
      setFileKey(res.fileKey)
      setSelectedNodeId(res.frames[0]?.nodeId ?? null)
    } catch (error) {
      toast({
        title: 'Failed to load Figma frames',
        description: getConnectError(error),
        variant: 'destructive'
      })
    } finally {
      setIsLoadingFrames(false)
    }
  }

  const handleImport = async () => {
    if (!selectedSlide?.slide || selectedSlide.slide.type !== SlideType.MEDIA || !fileKey || !selectedNodeId) {
      return
    }

    setIsImporting(true)
    try {
      const res = await portalClient.importFigmaFrame({
        fileKey,
        nodeId: selectedNodeId
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

  return (
    <div className='h-full flex flex-col bg-card'>
      <div className='flex items-center justify-between px-3 py-2 border-b border-border'>
        <div className='flex items-center gap-2'>
          <Figma className='w-3.5 h-3.5 text-muted-foreground' />
          <h3 className='font-medium text-xs'>Import from Figma</h3>
        </div>
        <Button variant='ghost' size='icon' className='h-6 w-6' onClick={onClose}>
          <X className='w-3.5 h-3.5' />
        </Button>
      </div>

      <div className='flex-1 overflow-hidden p-3 space-y-4'>
        {isLoadingIntegration ? (
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Loader2 className='w-3.5 h-3.5 animate-spin' />
            Checking Figma connection
          </div>
        ) : integration ? (
          <div className='space-y-3'>
            <div className='rounded-lg border border-border bg-background/60 p-3'>
              <p className='text-xs font-medium'>Connected account</p>
              <p className='text-xs text-muted-foreground'>
                {integration.handle || integration.email || integration.userId}
              </p>
            </div>

            <div className='space-y-2'>
              <label className='text-xs font-medium'>Figma file URL or key</label>
              <Input
                value={fileInput}
                onChange={e => setFileInput(e.target.value)}
                placeholder='https://www.figma.com/file/...'
              />
              <div className='flex gap-2'>
                <Button size='sm' className='flex-1' onClick={handleListFrames} disabled={isLoadingFrames}>
                  {isLoadingFrames ? <Loader2 className='w-4 h-4 animate-spin' /> : 'Load frames'}
                </Button>
                <Button size='sm' variant='outline' onClick={refreshIntegration} disabled={isLoadingIntegration}>
                  Refresh
                </Button>
              </div>
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <p className='text-xs font-medium'>Frames</p>
                {frames.length > 0 && <p className='text-[11px] text-muted-foreground'>{frames.length} found</p>}
              </div>
              <ScrollArea className='h-[320px] rounded-md border border-border'>
                <div className='grid grid-cols-1 gap-2 p-2'>
                  {frames.map(frame => (
                    <button
                      key={frame.nodeId}
                      type='button'
                      onClick={() => setSelectedNodeId(frame.nodeId)}
                      className={`rounded-lg border p-2 text-left transition-colors ${
                        selectedNodeId === frame.nodeId ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      {frame.thumbnailUrl ? (
                        <img src={frame.thumbnailUrl} alt={frame.name} className='mb-2 h-28 w-full rounded object-cover' />
                      ) : (
                        <div className='mb-2 flex h-28 items-center justify-center rounded bg-muted text-xs text-muted-foreground'>
                          Preview unavailable
                        </div>
                      )}
                      <p className='text-xs font-medium line-clamp-1'>{frame.name}</p>
                      <p className='text-[11px] text-muted-foreground'>
                        {Math.round(frame.width)} x {Math.round(frame.height)}
                      </p>
                    </button>
                  ))}
                  {!isLoadingFrames && frames.length === 0 && (
                    <div className='p-4 text-xs text-muted-foreground'>
                      Load a Figma file to choose a frame for this media slide.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <Button onClick={handleImport} disabled={!selectedFrame || isImporting || !canImport} className='w-full'>
              {isImporting ? <Loader2 className='w-4 h-4 animate-spin' /> : 'Import selected frame'}
            </Button>
          </div>
        ) : (
          <div className='rounded-lg border border-dashed border-border p-4 space-y-3'>
            <p className='text-sm font-medium'>Connect Figma to import product screens.</p>
            <p className='text-xs text-muted-foreground'>
              The editor will let you choose a frame and insert it into the selected media slide.
            </p>
            <Button onClick={handleConnect} className='w-full gap-2'>
              <ExternalLink className='w-4 h-4' />
              Connect Figma
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default FigmaImportSettings
