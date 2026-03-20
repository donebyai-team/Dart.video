'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import {
  ASPECT_PRESETS,
  AspectPresetProvider,
  createEmptyPatchOverlay,
  ImageAsset,
  PatchContextProvider
} from '../../../../packages/animation/src'
import { FigmaFrame } from '@coasterai/pb/coasterai/core/v1/figma_pb'

interface FigmaFramePreviewDialogProps {
  frame: FigmaFrame | null
  open: boolean
  sectionNote: string
  onOpenChange: (open: boolean) => void
  onSectionNoteChange: (value: string) => void
  onSelect: () => void
}

const previewOverlay = createEmptyPatchOverlay()

const FigmaFramePreviewDialog = ({
  frame,
  open,
  sectionNote,
  onOpenChange,
  onSectionNoteChange,
  onSelect
}: FigmaFramePreviewDialogProps) => {
  if (!frame) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-5xl overflow-hidden p-0'>
        <div className='grid min-h-[560px] grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)]'>
          <div className='border-b border-border p-6 md:border-b-0 md:border-r'>
            <DialogHeader className='text-left'>
              <DialogTitle className='text-base'>{frame.name}</DialogTitle>
              <DialogDescription>
                Add an optional note for where this frame should appear.
              </DialogDescription>
            </DialogHeader>

            <div className='mt-6 space-y-4'>
              <div className='rounded-lg border border-border bg-muted/20 p-3'>
                <p className='text-xs font-medium text-foreground'>Frame size</p>
                <p className='mt-1 text-xs text-muted-foreground'>
                  {Math.round(frame.width)} x {Math.round(frame.height)}
                </p>
              </div>

              <div className='space-y-4'>
                <label htmlFor='figma-frame-note' className='text-xs font-medium'>
                  How should this frame be used?
                </label>
                <textarea
                  id='figma-frame-note'
                  value={sectionNote}
                  onChange={e => onSectionNoteChange(e.target.value)}
                  rows={3}
                  placeholder='Optional: use it inside the section product explainer...'
                  className='min-h-[96px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                />
              </div>
            </div>

            <div className='mt-6 flex justify-end'>
              <Button onClick={onSelect}>Use this frame</Button>
            </div>
          </div>

          <div className='bg-muted/20 p-6'>
            <div className='flex h-full items-center justify-center rounded-xl border border-border bg-background p-4'>
              <AspectPresetProvider preset={ASPECT_PRESETS.web}>
                <PatchContextProvider overlay={previewOverlay}>
                  <ImageAsset
                    src={frame.thumbnailUrl}
                    // width={Math.min(Math.max(frame.width, 320), 880)}
                    // height={Math.min(Math.max(frame.height, 220), 640)}
                    style={{ objectFit: 'contain' }}
                  />
                </PatchContextProvider>
              </AspectPresetProvider>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FigmaFramePreviewDialog
