'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/hooks/use-toast'
import { portalClient } from '@/services/grpc'
import { uploadMedia } from '@/services/utils'
import { getConnectError } from '@/utils/error'
import AssetPreviewDialog from '@/components/assets/AssetPreviewDialog'
import { ImagePlus, Loader2, Upload, Video, X } from 'lucide-react'
import type { MediaAsset } from '@coasterai/pb/coasterai/core/v1/slide_pb'

export interface ManualMediaConfirmPayload {
  asset: MediaAsset
  sectionNote?: string
}

interface ManualMediaImportPanelProps {
  onClose: () => void
  onConfirm: (payload: ManualMediaConfirmPayload) => Promise<void> | void
  canConfirm?: boolean
}

const isVideoAsset = (asset: MediaAsset) => asset.mimeType.startsWith('video/')

const ManualMediaImportPanel = ({
  onClose,
  onConfirm,
  canConfirm = true
}: ManualMediaImportPanelProps) => {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [isLoadingAssets, setIsLoadingAssets] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [selectedSectionNote, setSelectedSectionNote] = useState('')
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null)
  const [previewSectionNote, setPreviewSectionNote] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const selectedAsset = useMemo(
    () => assets.find(asset => asset.id === selectedAssetId) ?? null,
    [assets, selectedAssetId]
  )
  const previewAsset = useMemo(
    () => assets.find(asset => asset.id === previewAssetId) ?? null,
    [assets, previewAssetId]
  )

  const loadAssets = async () => {
    setIsLoadingAssets(true)
    try {
      const res = await portalClient.getMediaAssets({})
      setAssets(res.assets)
      setSelectedAssetId(res.assets[0]?.id ?? null)
    } catch (error) {
      toast({
        title: 'Failed to load media assets',
        description: getConnectError(error),
        variant: 'destructive'
      })
    } finally {
      setIsLoadingAssets(false)
    }
  }

  useEffect(() => {
    loadAssets()
  }, [])

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }

    setIsUploading(true)
    try {
      const uploaded: MediaAsset[] = []
      for (const file of Array.from(files)) {
        uploaded.push(await uploadMedia(file))
      }

      setAssets(current => [...uploaded, ...current])
      setSelectedAssetId(uploaded[0]?.id ?? selectedAssetId)
      toast({
        title: 'Media uploaded',
        description: `${uploaded.length} asset${uploaded.length > 1 ? 's' : ''} uploaded successfully.`
      })
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: getConnectError(error),
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const handleOpenPreview = (asset: MediaAsset) => {
    setPreviewAssetId(asset.id)
    setPreviewSectionNote(asset.id === selectedAssetId ? selectedSectionNote : '')
  }

  const handleSelectPreviewAsset = async () => {
    if (!previewAsset) {
      return
    }

    setSelectedAssetId(previewAsset.id)
    setSelectedSectionNote(previewSectionNote.trim())
    setPreviewAssetId(null)

    if (!canConfirm) {
      return
    }

    await onConfirm({
      asset: previewAsset,
      sectionNote: previewSectionNote.trim() || undefined
    })
  }

  return (
    <div className='h-full flex flex-col bg-card'>
      <AssetPreviewDialog
        title={previewAsset?.fileName || 'Selected asset'}
        previewUrl={previewAsset?.url}
        mediaKind={previewAsset && isVideoAsset(previewAsset) ? 'video' : 'image'}
        width={previewAsset?.width}
        height={previewAsset?.height}
        open={!!previewAsset}
        note={previewSectionNote}
        onOpenChange={open => {
          if (!open) setPreviewAssetId(null)
        }}
        onNoteChange={setPreviewSectionNote}
        onSelect={handleSelectPreviewAsset}
      />

      <div className='flex items-center justify-between px-3 py-2 border-b border-border'>
        <div className='flex items-center gap-2'>
          <ImagePlus className='w-3.5 h-3.5 text-muted-foreground' />
          <h3 className='font-medium text-xs'>Upload Media</h3>
        </div>
        <Button variant='ghost' size='icon' className='h-6 w-6' onClick={onClose}>
          <X className='w-3.5 h-3.5' />
        </Button>
      </div>

      <div className='flex-1 overflow-hidden p-3 space-y-4'>
        {isLoadingAssets ? (
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Loader2 className='w-3.5 h-3.5 animate-spin' />
            Loading uploaded media
          </div>
        ) : (
          <div className='space-y-3'>
            <div className='flex gap-2'>
              <input
                ref={inputRef}
                type='file'
                accept='image/*,video/*'
                multiple
                className='hidden'
                onChange={e => void handleUploadFiles(e.target.files)}
              />
              <Button
                size='sm'
                className='w-full gap-2'
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className='w-4 h-4 animate-spin' /> : <Upload className='w-4 h-4' />}
                Upload media
              </Button>
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <p className='text-xs font-medium'>Assets</p>
                {assets.length > 0 && <p className='text-[11px] text-muted-foreground'>{assets.length} found</p>}
              </div>
              <ScrollArea className='h-[320px] rounded-md border border-border'>
                <div className='grid grid-cols-2 gap-2 p-2'>
                  {assets.map(asset => (
                    <button
                      key={asset.id}
                      type='button'
                      onClick={() => handleOpenPreview(asset)}
                      className={`rounded-lg border p-2 text-left transition-colors ${
                        selectedAssetId === asset.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      {isVideoAsset(asset) ? (
                        <div className='mb-2 flex h-28 w-full items-center justify-center rounded bg-muted text-xs text-muted-foreground'>
                          <Video className='mr-2 h-4 w-4' />
                          Video
                        </div>
                      ) : asset.url ? (
                        <img src={asset.thumbnailUrl || asset.url} alt={asset.fileName} className='mb-2 h-28 w-full rounded object-cover' />
                      ) : (
                        <div className='mb-2 flex h-28 items-center justify-center rounded bg-muted text-xs text-muted-foreground'>
                          Preview unavailable
                        </div>
                      )}
                      <p className='text-xs font-medium line-clamp-1'>{asset.fileName || asset.id}</p>
                      <p className='text-[11px] text-muted-foreground'>
                        {Math.round(asset.width)} x {Math.round(asset.height)}
                      </p>
                    </button>
                  ))}
                  {!isLoadingAssets && assets.length === 0 && (
                    <div className='col-span-2 p-4 text-xs text-muted-foreground'>
                      Upload media or select from your existing library.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

export default ManualMediaImportPanel
