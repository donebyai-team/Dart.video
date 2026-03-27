'use client'

import { useEffect, useState } from 'react'
import { Loader2, Trash2, Upload, Video } from 'lucide-react'

import AssetPreviewDialog from '@/components/assets/AssetPreviewDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useClientsContext } from '@coasterai/ui-core/context/ClientContext'
import { type MediaAsset, type SelectedMediaAsset } from '@coasterai/pb/coasterai/core/v1/media_asset_pb'
import { getConnectError } from '@/utils/error'
import toast from 'react-hot-toast'

interface SelectedAssetsDialogProps {
  open: boolean
  selectedAssets: SelectedAssetWithPreview[]
  onOpenChange: (open: boolean) => void
  onHydrateAssets: (assets: MediaAsset[]) => void
  onRemoveAsset: (assetId: string) => void
  onUpdateAssetNote: (assetId: string, note?: string) => void
  onOpenUpload: () => void
}

export interface SelectedAssetWithPreview {
  asset?: MediaAsset
  selection: SelectedMediaAsset
}

type PreviewState = {
  asset: MediaAsset
  note: string
} | null

const isVideoAsset = (asset: MediaAsset) => asset.mimeType.startsWith('video/')

const SelectedAssetsDialog = ({
  open,
  selectedAssets,
  onOpenChange,
  onHydrateAssets,
  onRemoveAsset,
  onUpdateAssetNote,
  onOpenUpload
}: SelectedAssetsDialogProps) => {
  const { portalClient } = useClientsContext()
  const [previewState, setPreviewState] = useState<PreviewState>(null)
  const [isHydratingAssets, setIsHydratingAssets] = useState(false)

  useEffect(() => {
    if (!open || !portalClient) return

    const missingAssetIDs = selectedAssets
      .filter(asset => !asset.asset)
      .map(asset => asset.selection.assetID)

    if (missingAssetIDs.length === 0) return

    const hydrateAssets = async () => {
      setIsHydratingAssets(true)
      try {
        const res = await portalClient.getMediaAssetsByID({
          assetsIDs: missingAssetIDs
        })
        onHydrateAssets(res.assets)
      } catch (err) {
        console.error('Failed to hydrate selected assets', err)
        toast.error(getConnectError(err))
      } finally {
        setIsHydratingAssets(false)
      }
    }

    void hydrateAssets()
  }, [open, onHydrateAssets, portalClient, selectedAssets])

  const handleOpenPreview = (asset: MediaAsset, note?: string) => {
    setPreviewState({
      asset,
      note: note ?? ''
    })
  }

  const handleSavePreview = () => {
    if (!previewState) return

    onUpdateAssetNote(previewState.asset.id, previewState.note.trim() || undefined)
    setPreviewState(null)
  }

  return (
    <>
      <AssetPreviewDialog
        title={previewState?.asset.fileName || 'Selected asset'}
        previewUrl={previewState?.asset.url}
        mediaKind={previewState?.asset && isVideoAsset(previewState.asset) ? 'video' : 'image'}
        width={previewState?.asset.width}
        height={previewState?.asset.height}
        open={!!previewState}
        note={previewState?.note ?? ''}
        selectLabel='Save note'
        onOpenChange={nextOpen => {
          if (!nextOpen) setPreviewState(null)
        }}
        onNoteChange={value => {
          setPreviewState(current => current ? { ...current, note: value } : current)
        }}
        onSelect={handleSavePreview}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <DialogTitle>Selected assets</DialogTitle>
            <DialogDescription>
              Review your selected assets, update the note, remove anything you don&apos;t need, or upload more.
            </DialogDescription>
          </DialogHeader>

          {isHydratingAssets && (
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <Loader2 className='h-4 w-4 animate-spin' />
              Loading missing previews
            </div>
          )}

          {selectedAssets.length === 0 ? (
            <div className='rounded-lg border border-dashed p-6 text-sm text-muted-foreground'>
              No assets selected yet.
            </div>
          ) : (
            <ScrollArea className='h-[420px] rounded-md border border-border'>
              <div className='grid grid-cols-1 gap-3 p-3 sm:grid-cols-2'>
                {selectedAssets.map(({ selection, asset }) => (
                  <div
                    key={selection.assetID}
                    className='rounded-lg border border-border bg-background p-3'
                  >
                    <button
                      type='button'
                      className='w-full text-left'
                      onClick={() => asset && handleOpenPreview(asset, selection.note)}
                      disabled={!asset}
                    >
                      {asset ? (
                        isVideoAsset(asset) ? (
                          <video
                            src={asset.thumbnailUrl || asset.url}
                            className='mb-3 h-32 w-full rounded object-cover'
                            preload='metadata'
                            muted
                          />
                        ) : (
                          <img
                            src={asset.thumbnailUrl || asset.url}
                            alt={asset.fileName}
                            className='mb-3 h-32 w-full rounded object-cover'
                          />
                        )
                      ) : (
                        <div className='mb-3 flex h-32 items-center justify-center rounded bg-muted text-xs text-muted-foreground'>
                          Preview unavailable
                        </div>
                      )}

                      <div className='space-y-1'>
                        <p className='text-sm font-medium line-clamp-1'>
                          {asset?.fileName || selection.assetID}
                        </p>
                        <p className='text-xs text-muted-foreground line-clamp-3'>
                          {selection.note?.trim() || 'No note added'}
                        </p>
                      </div>
                    </button>

                    <div className='mt-3 flex items-center justify-between gap-2'>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='px-2'
                        onClick={() => asset && handleOpenPreview(asset, selection.note)}
                        disabled={!asset}
                      >
                        {asset && isVideoAsset(asset) ? <Video className='h-4 w-4' /> : null}
                        Preview
                      </Button>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='px-2 text-destructive hover:text-destructive'
                        onClick={() => onRemoveAsset(selection.assetID)}
                      >
                        <Trash2 className='h-4 w-4' />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className='flex justify-end border-t border-border pt-4'>
            <Button
              type='button'
              className='gap-2'
              onClick={() => {
                onOpenChange(false)
                onOpenUpload()
              }}
            >
              <Upload className='h-4 w-4' />
              Upload media
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default SelectedAssetsDialog
