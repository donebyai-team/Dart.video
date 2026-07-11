'use client'

import type { DragEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/hooks/use-toast'
import { portalClient } from '@/services/grpc'
import { uploadMedia } from '@/services/utils'
import { getConnectError } from '@/utils/error'
import AssetPreviewDialog from '@/components/assets/AssetPreviewDialog'
import { FileText, ImagePlus, Loader2, Upload, X } from 'lucide-react'
import { MediaAsset } from '@coasterai/pb/coasterai/core/v1/media_asset_pb'

export interface ManualMediaConfirmPayload {
  asset: MediaAsset
  sectionNote?: string
}

interface ManualMediaImportPanelProps {
  onClose: () => void
  onConfirm: (payload: ManualMediaConfirmPayload) => Promise<void> | void
  canConfirm?: boolean
  showPreview?: boolean
  allowMultipleSelection?: boolean
  mediaType?: 'image' | 'video' | 'file'
}

const isVideoAsset = (asset: MediaAsset) => asset.mimeType.startsWith('video/')
const isPdfAsset = (asset: MediaAsset) => asset.mimeType === 'application/pdf'
const getAssetPreviewKind = (asset: MediaAsset): 'image' | 'video' | 'pdf' => {
  if (isVideoAsset(asset)) {
    return 'video'
  }

  if (isPdfAsset(asset)) {
    return 'pdf'
  }

  return 'image'
}
const MAX_UPLOAD_FILES = 5

const ManualMediaImportPanel = ({
  onClose,
  onConfirm,
  canConfirm = true,
  showPreview = true,
  allowMultipleSelection = false,
  mediaType
}: ManualMediaImportPanelProps) => {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [isLoadingAssets, setIsLoadingAssets] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
  const [selectedSectionNote, setSelectedSectionNote] = useState('')
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null)
  const [previewSectionNote, setPreviewSectionNote] = useState('')
  const [isDragActive, setIsDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const isMultiSelectMode = !showPreview && allowMultipleSelection
  const acceptValue = mediaType === 'file' ? 'application/pdf,.pdf' : mediaType ? `${mediaType}/*` : 'image/*,video/*,application/pdf,.pdf'

  const selectedAsset = useMemo(
    () => assets.find(asset => asset.id === selectedAssetId) ?? null,
    [assets, selectedAssetId]
  )
  const selectedAssets = useMemo(
    () => selectedAssetIds.map(assetId => assets.find(asset => asset.id === assetId)).filter((asset): asset is MediaAsset => !!asset),
    [assets, selectedAssetIds]
  )
  const previewAsset = useMemo(
    () => assets.find(asset => asset.id === previewAssetId) ?? null,
    [assets, previewAssetId]
  )

  const loadAssets = async () => {
    setIsLoadingAssets(true)
    try {
      const res = await portalClient.getMediaAssets({})
      if (mediaType) {
        setAssets(
          res.assets.filter((asset: MediaAsset) => {
            if (mediaType === 'file') {
              return isPdfAsset(asset)
            }

            return asset.mimeType.startsWith(mediaType)
          })
        )
      } else {
        setAssets(res.assets)
      }
      if (isMultiSelectMode) {
        setSelectedAssetIds(current => current.filter(assetId => res.assets.some(asset => asset.id === assetId)))
        setSelectedAssetId(null)
      } else {
        setSelectedAssetId(res.assets[0]?.id ?? null)
      }
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

  const handleUploadFiles = async (fileList: FileList | File[] | null) => {
    const files = fileList ? Array.from(fileList) : []
    if (files.length === 0) {
      return
    }

    if (files.length > MAX_UPLOAD_FILES) {
      toast({
        title: 'Too many files',
        description: `You can upload up to ${MAX_UPLOAD_FILES} files at a time.`,
        variant: 'destructive'
      })
      return
    }

    const invalidFile = files.find(file => {
      if (mediaType === 'image') {
        return !file.type.startsWith('image/')
      }

      if (mediaType === 'video') {
        return !file.type.startsWith('video/')
      }

      if (mediaType === 'file') {
        return file.type !== 'application/pdf'
      }

      return !file.type.startsWith('image/') && !file.type.startsWith('video/') && file.type !== 'application/pdf'
    })

    if (invalidFile) {
      const expectedLabel = mediaType === 'file' ? 'PDF files' : mediaType ? `${mediaType}s` : 'images, videos, or PDF files'
      toast({
        title: 'Unsupported file type',
        description: `Please upload only ${expectedLabel}.`,
        variant: 'destructive'
      })
      return
    }

    setIsUploading(true)
    try {
      const uploaded: MediaAsset[] = []
      for (const file of files) {
        uploaded.push(await uploadMedia(file))
      }

      setAssets(current => [...uploaded, ...current])
      if (isMultiSelectMode) {
        setSelectedAssetIds(current => Array.from(new Set([...uploaded.map(asset => asset.id), ...current])))
      } else {
        setSelectedAssetId(uploaded[0]?.id ?? selectedAssetId)
      }
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

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!isUploading) {
      setIsDragActive(true)
    }
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return
    }
    setIsDragActive(false)
  }

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragActive(false)
    if (isUploading) {
      return
    }
    await handleUploadFiles(event.dataTransfer.files)
  }

  const handleSelectAsset = async (asset: MediaAsset) => {
    if (showPreview) {
      handleOpenPreview(asset)
    } else if (isMultiSelectMode) {
      setSelectedAssetIds(current =>
        current.includes(asset.id)
          ? current.filter(assetId => assetId !== asset.id)
          : [...current, asset.id]
      )
    } else {
      setSelectedAssetId(asset.id)
      setSelectedSectionNote('')

      if (!canConfirm) {
        return
      }

      await onConfirm({
        asset,
        sectionNote: undefined
      })
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

  const handleConfirmSelectedAssets = async () => {
    if (!canConfirm || selectedAssets.length === 0) {
      return
    }

    for (const asset of selectedAssets) {
      await onConfirm({
        asset,
        sectionNote: undefined
      })
    }
  }

  return (
    <div className='h-full flex flex-col bg-card'>
      <AssetPreviewDialog
        title={previewAsset?.fileName || 'Selected asset'}
        previewUrl={previewAsset?.url}
        mediaKind={previewAsset ? getAssetPreviewKind(previewAsset) : 'image'}
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
                accept={acceptValue}
                multiple
                className='hidden'
                onChange={e => void handleUploadFiles(e.target.files)}
              />
              <div
                className={`w-full rounded-lg border border-dashed p-3 transition-colors ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-border'
                } ${isUploading ? 'opacity-60' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={e => void handleDrop(e)}
              >
                <Button
                  size='sm'
                  className='w-full gap-2'
                  onClick={() => inputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className='w-4 h-4 animate-spin' /> : <Upload className='w-4 h-4' />}
                  Upload media
                </Button>
                <p className='mt-2 text-center text-[11px] text-muted-foreground'>
                  Drag and drop up to {MAX_UPLOAD_FILES} {mediaType === 'file' ? 'PDF files' : mediaType ? `${mediaType}s` : 'images, videos, or PDF files'}, or click to browse.
                </p>
              </div>
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <p className='text-xs font-medium'>Assets</p>
                {assets.length > 0 && (
                  <p className='text-[11px] text-muted-foreground'>
                    {assets.length} found{isMultiSelectMode ? ` • ${selectedAssetIds.length} selected` : ''}
                  </p>
                )}
              </div>
              <ScrollArea className='h-[320px] rounded-md border border-border'>
                <div className='grid grid-cols-2 gap-2 p-2'>
                  {assets.map(asset => (
                    <button
                      key={asset.id}
                      type='button'
                      onClick={() => handleSelectAsset(asset)}
                      className={`rounded-lg border p-2 text-left transition-colors ${(isMultiSelectMode ? selectedAssetIds.includes(asset.id) : selectedAssetId === asset.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                        }`}
                    >
                      {isVideoAsset(asset) ? (
                        <video
                          src={asset.thumbnailUrl || asset.url}
                          className="mb-2 h-28 w-full rounded object-cover"
                          preload="metadata"
                          muted
                        />
                      ) : isPdfAsset(asset) ? (
                        <div className='mb-2 flex h-28 w-full flex-col items-center justify-center rounded border bg-muted/40 text-muted-foreground'>
                          <FileText className='mb-2 h-8 w-8' />
                          <span className='text-[11px] font-medium'>PDF</span>
                        </div>
                      ) : asset.url ? (
                        <img src={asset.thumbnailUrl || asset.url} alt={asset.fileName} className='mb-2 h-28 w-full rounded object-cover' />
                      ) : (
                        <div className='mb-2 flex h-28 items-center justify-center rounded bg-muted text-xs text-muted-foreground'>
                          Preview unavailable
                        </div>
                      )}
                      <p className='text-xs font-medium line-clamp-1'>{asset.fileName || asset.id}</p>
                      {/* <p className='text-[11px] text-muted-foreground'>
                        {Math.round(asset.width)} x {Math.round(asset.height)}
                      </p> */}
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

        {isMultiSelectMode && (
          <div className='flex items-center justify-between border-t border-border px-3 py-2'>
            <p className='text-xs text-muted-foreground'>
              Select one or more assets to add.
            </p>
            <Button
              size='sm'
              onClick={() => void handleConfirmSelectedAssets()}
              disabled={!canConfirm || selectedAssetIds.length === 0}
            >
              Add selected{selectedAssetIds.length > 0 ? ` (${selectedAssetIds.length})` : ''}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ManualMediaImportPanel
