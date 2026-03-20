'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { buildAppUrl } from '@/app/routes'
import { toast } from '@/hooks/use-toast'
import { portalClient } from '@/services/grpc'
import { getConnectError } from '@/utils/error'
import FigmaFramePreviewDialog from '@/components/figma/FigmaFramePreviewDialog'
import { routes } from '@coasterai/ui-core/routing'
import { ExternalLink, Figma, Loader2, RefreshCw, X } from 'lucide-react'
import { type FigmaFrame, type FigmaPage } from '@coasterai/pb/coasterai/core/v1/figma_pb'
import {
  IntegrationState,
  IntegrationType,
  type FigmaIntegration
} from '@coasterai/pb/coasterai/portal/v1/portal_pb'
import {
  FIGMA_OAUTH_POPUP_MESSAGE_TYPE,
  isFigmaOAuthPopupMessage
} from '@/components/figma/oauth'

export interface ConfirmPayload {
  fileKey: string
  selectedFrame: FigmaFrame
  sectionNote?: string
}

interface FigmaImportPanelProps {
  onClose: () => void
  onConfirm: (payload: ConfirmPayload) => Promise<void> | void
  confirmLabel?: string
  isConfirming?: boolean
  canConfirm?: boolean
}

const POPUP_POLL_INTERVAL_MS = 500
const POPUP_WIDTH = 640
const POPUP_HEIGHT = 800

const buildPopupFeatures = () => {
  const left = window.screenX + Math.max(0, (window.outerWidth - POPUP_WIDTH) / 2)
  const top = window.screenY + Math.max(0, (window.outerHeight - POPUP_HEIGHT) / 2)

  return [
    `width=${POPUP_WIDTH}`,
    `height=${POPUP_HEIGHT}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
    'popup=yes',
    'resizable=yes',
    'scrollbars=yes'
  ].join(',')
}

const FigmaImportPanel = ({
  onClose,
  onConfirm,
  confirmLabel = 'Import selected frame',
  isConfirming = false,
  canConfirm = true
}: FigmaImportPanelProps) => {
  const [isLoadingIntegration, setIsLoadingIntegration] = useState(true)
  const [integration, setIntegration] = useState<FigmaIntegration | null>(null)
  const [fileInput, setFileInput] = useState('')
  const [isLoadingFrames, setIsLoadingFrames] = useState(false)
  const [frames, setFrames] = useState<FigmaFrame[]>([])
  const [pages, setPages] = useState<FigmaPage[]>([])
  const [framesByPage, setFramesByPage] = useState<Record<string, FigmaFrame[]>>({})
  const [activePageId, setActivePageId] = useState<string | null>(null)
  const [fileKey, setFileKey] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedSectionNote, setSelectedSectionNote] = useState('')
  const [previewNodeId, setPreviewNodeId] = useState<string | null>(null)
  const [previewSectionNote, setPreviewSectionNote] = useState('')
  const popupRef = useRef<Window | null>(null)
  const popupPollRef = useRef<number | null>(null)
  const [isWaitingForOAuth, setIsWaitingForOAuth] = useState(false)

  const selectedFrame = useMemo(
    () => frames.find(frame => frame.nodeId === selectedNodeId) ?? null,
    [frames, selectedNodeId]
  )
  const previewFrame = useMemo(
    () => frames.find(frame => frame.nodeId === previewNodeId) ?? null,
    [frames, previewNodeId]
  )

  const clearPopupPoll = () => {
    if (popupPollRef.current !== null) {
      window.clearInterval(popupPollRef.current)
      popupPollRef.current = null
    }
  }

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

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || !isFigmaOAuthPopupMessage(event.data)) {
        return
      }

      if (event.data.type !== FIGMA_OAUTH_POPUP_MESSAGE_TYPE) {
        return
      }

      clearPopupPoll()
      popupRef.current = null
      setIsWaitingForOAuth(false)

      if (event.data.status === 'success') {
        refreshIntegration()
        return
      }

      toast({
        title: 'Unable to connect Figma',
        description: event.data.error || 'The Figma connection was not completed.',
        variant: 'destructive'
      })
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
      clearPopupPoll()
    }
  }, [])

  const handleConnect = async () => {
    try {
      const res = await portalClient.oauthAuthorize({
        integrationType: IntegrationType.FIGMA,
        redirectUrl: buildAppUrl(routes.app.auth.callback)
      })

      const popup = window.open(res.authorizeUrl, 'figma-oauth', buildPopupFeatures())
      if (!popup) {
        toast({
          title: 'Popup blocked',
          description: 'Allow popups for this site to connect your Figma account.',
          variant: 'destructive'
        })
        return
      }

      popupRef.current = popup
      setIsWaitingForOAuth(true)
      clearPopupPoll()
      popupPollRef.current = window.setInterval(() => {
        if (!popupRef.current || popupRef.current.closed) {
          clearPopupPoll()
          popupRef.current = null
          setIsWaitingForOAuth(false)
        }
      }, POPUP_POLL_INTERVAL_MS)
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
      const initialPageId = res.pages[0]?.id ?? res.frames[0]?.pageId ?? null

      setPages(res.pages)
      setFrames(res.frames)
      setFramesByPage(initialPageId ? { [initialPageId]: res.frames } : {})
      setFileKey(res.fileKey)
      setActivePageId(initialPageId)
      setSelectedNodeId(res.frames[0]?.nodeId ?? null)
      setSelectedSectionNote('')
      setPreviewNodeId(null)
      setPreviewSectionNote('')
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

  const handlePageChange = async (pageId: string) => {
    setActivePageId(pageId)
    setSelectedNodeId(null)
    setSelectedSectionNote('')
    setPreviewNodeId(null)
    setPreviewSectionNote('')

    if (framesByPage[pageId]) {
      setFrames(framesByPage[pageId])
      setSelectedNodeId(framesByPage[pageId][0]?.nodeId ?? null)
      return
    }

    if (!fileInput.trim() && !fileKey) {
      return
    }

    setIsLoadingFrames(true)
    try {
      const res = await portalClient.listFigmaFrames({
        fileKey,
        fileUrl: fileInput.trim(),
        pageId
      })
      setFrames(res.frames)
      setFramesByPage(current => ({ ...current, [pageId]: res.frames }))
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

  const handleConfirm = async () => {
    if (!selectedFrame || !fileKey) {
      return
    }

    await onConfirm({
      fileKey,
      selectedFrame,
      sectionNote: selectedSectionNote.trim() || undefined
    })
  }

  const handleOpenPreview = (frame: FigmaFrame) => {
    setPreviewNodeId(frame.nodeId)
    setPreviewSectionNote(frame.nodeId === selectedNodeId ? selectedSectionNote : '')
  }

  const handleSelectPreviewFrame = () => {
    if (!previewFrame) {
      return
    }

    setSelectedNodeId(previewFrame.nodeId)
    setSelectedSectionNote(previewSectionNote.trim())
    setPreviewNodeId(null)
  }

  return (
    <div className='h-full flex flex-col bg-card'>
      <FigmaFramePreviewDialog
        frame={previewFrame}
        open={!!previewFrame}
        sectionNote={previewSectionNote}
        onOpenChange={open => {
          if (!open) {
            setPreviewNodeId(null)
          }
        }}
        onSectionNoteChange={setPreviewSectionNote}
        onSelect={handleSelectPreviewFrame}
      />

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
                  <RefreshCw className='w-4 h-4' />
                  Refresh
                </Button>
              </div>
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <p className='text-xs font-medium'>Frames</p>
                {frames.length > 0 && <p className='text-[11px] text-muted-foreground'>{frames.length} found</p>}
              </div>
              {pages.length > 0 && activePageId && (
                <Tabs value={activePageId} onValueChange={value => void handlePageChange(value)}>
                  <ScrollArea className='w-full whitespace-nowrap rounded-md border border-border'>
                    <TabsList className='h-auto w-max justify-start rounded-none bg-transparent p-1'>
                      {pages.map(page => (
                        <TabsTrigger
                          key={page.id}
                          value={page.id}
                          className='h-8 px-3 text-xs'
                          disabled={isLoadingFrames && activePageId !== page.id}
                        >
                          {page.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </ScrollArea>
                </Tabs>
              )}
              <ScrollArea className='h-[320px] rounded-md border border-border'>
                <div className='grid grid-cols-2 gap-2 p-2'>
                  {frames.map(frame => (
                    <button
                      key={frame.nodeId}
                      type='button'
                      onClick={() => handleOpenPreview(frame)}
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

            <Button onClick={handleConfirm} disabled={!selectedFrame || !canConfirm || isConfirming} className='w-full'>
              {isConfirming ? <Loader2 className='w-4 h-4 animate-spin' /> : confirmLabel}
            </Button>
          </div>
        ) : (
          <div className='rounded-lg border border-dashed border-border p-4 space-y-3'>
            <p className='text-sm font-medium'>Connect Figma to import product screens.</p>
            <p className='text-xs text-muted-foreground'>
              The editor will let you choose a frame and insert it into the selected media slide.
            </p>
            <Button onClick={handleConnect} className='w-full gap-2' disabled={isWaitingForOAuth}>
              {isWaitingForOAuth ? <Loader2 className='w-4 h-4 animate-spin' /> : <ExternalLink className='w-4 h-4' />}
              {isWaitingForOAuth ? 'Waiting for Figma connection' : 'Connect Figma'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default FigmaImportPanel
