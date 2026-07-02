'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '@/components/ui/dialog'

interface AssetPreviewDialogProps {
  title: string
  subtitle?: string
  previewUrl?: string
  mediaKind: 'image' | 'video' | 'pdf'
  width?: number
  height?: number
  open: boolean
  note: string
  noteLabel?: string
  notePlaceholder?: string
  selectLabel?: string
  onOpenChange: (open: boolean) => void
  onNoteChange: (value: string) => void
  onSelect: () => void
}

const AssetPreviewDialog = ({
  title,
  subtitle,
  previewUrl,
  mediaKind,
  width,
  height,
  open,
  note,
  noteLabel = 'How should this asset be used?',
  notePlaceholder,
  selectLabel = 'Use this asset',
  onOpenChange,
  onNoteChange,
  onSelect
}: AssetPreviewDialogProps) => {
  const isVideo = mediaKind === 'video'
  const isPdf = mediaKind === 'pdf'
  const minNoteLength = 20
  // const isNoteValid = !isVideo || note.trim().length >= minNoteLength
  const isNoteValid = true
  const defaultPlaceholder =
    'Tell us in which part of the script, AI should use this. Eg. Use it to show feature 1'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-5xl overflow-hidden p-0'>
        <div className='grid min-h-[400px] grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)]'>
          <div className='border-b border-border p-6 md:border-b-0 md:border-r'>
            <DialogHeader className='text-left'>
              {/* <DialogTitle className='text-base'>{title}</DialogTitle> */}
              <DialogDescription>
                {subtitle || 'Add an optional note for how this should be used.'}
              </DialogDescription>
            </DialogHeader>

            <div className='mt-6 space-y-4'>
              {(width || height) && (
                <div className='rounded-lg border border-border bg-muted/20 p-3'>
                  <p className='text-xs font-medium text-foreground'>Asset size</p>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {Math.round(width || 0)} x {Math.round(height || 0)}
                  </p>
                </div>
              )}
              <div className='space-y-4'>
                <label htmlFor='asset-preview-note' className='text-xs font-medium'>
                  {noteLabel}{isVideo && <span className='text-destructive'> *</span>}
                </label>
                <textarea
                  id='asset-preview-note'
                  value={note}
                  onChange={e => onNoteChange(e.target.value)}
                  rows={3}
                  placeholder={notePlaceholder || defaultPlaceholder}
                  className='min-h-[96px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                />
              </div>
            </div>

            <div className='mt-6 flex justify-end'>
              <Button onClick={onSelect} disabled={!isNoteValid}>{selectLabel}</Button>
            </div>
          </div>

          <div className='bg-muted/20 p-6'>
            <div className='flex h-full items-center justify-center rounded-xl border border-border bg-background p-4'>
              {isVideo ? (
                <video
                  src={previewUrl}
                  controls
                  className='max-h-full max-w-full rounded-lg'
                />
              ) : isPdf ? (
                <iframe
                  src={previewUrl}
                  title={title}
                  className='h-[70vh] w-full rounded-lg'
                />
              ) : (
                <img src={previewUrl} style={{ objectFit: 'contain' }} />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AssetPreviewDialog
