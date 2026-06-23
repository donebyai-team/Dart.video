import { useMemo } from 'react'
import { Player } from '@remotion/player'
import type { ConversationMessage } from '@coasterai/pb/coasterai/core/v1/chat_pb'
import { brandingToTheme, SingleSlidePreview } from '@coasterai/renderer'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useVideoStore } from '@/stores/video'
import { getCheckpointPreviewSlide } from './checkpointSlide'

interface SlideScenePreviewProps {
  checkpointMessage: ConversationMessage | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRevert: () => void
  isReverting: boolean
}

export default function SlideScenePreview({ checkpointMessage, open, onOpenChange, onRevert, isReverting }: SlideScenePreviewProps) {
  const selectedSlide = useVideoStore(s => s.selectedSlide)
  const getSlideWithBackground = useVideoStore(s => s.getSlideWithBackground)
  const resolution = useVideoStore(s => s.videoConfig?.metadata?.resolution)
  const fps = useVideoStore(s => s.videoConfig?.metadata?.fps) ?? 30
  const generatedBranding = useVideoStore(s => s.videoConfig?.metadata?.generatedBranding)

  const selectedSlideWithBackground = useMemo(
    () => selectedSlide
      ? ({
        ...selectedSlide,
        backgroundStyle: getSlideWithBackground(selectedSlide),
      })
      : null,
    [getSlideWithBackground, selectedSlide],
  )

  const previewSlide = useMemo(
    () => checkpointMessage ? getCheckpointPreviewSlide(selectedSlideWithBackground ?? undefined, checkpointMessage) : null,
    [checkpointMessage, selectedSlideWithBackground],
  )

  const theme = useMemo(
    () => brandingToTheme(generatedBranding),
    [generatedBranding],
  )

  const aspectRatio = resolution ? `${resolution.width} / ${resolution.height}` : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-5xl overflow-hidden p-0'>
        <div className='flex flex-col'>
          <DialogHeader className='px-6 pt-6'>
            {/* <DialogDescription>Review this scene before reverting.</DialogDescription> */}
          </DialogHeader>

          <div className='px-6 pb-6'>
            <div className='mx-auto mt-4 w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-background' style={aspectRatio ? { aspectRatio } : undefined}>
              {previewSlide && resolution ? (
                <Player
                  component={SingleSlidePreview as any}
                  inputProps={{ slide: previewSlide, theme, isEditing: false }}
                  durationInFrames={Math.max(1, previewSlide.durationInFrames)}
                  compositionWidth={resolution.width}
                  compositionHeight={resolution.height}
                  fps={fps}
                  style={{ width: '100%', height: '100%' }}
                  controls={false}
                  autoPlay
                  loop
                />
              ) : (
                <div className='flex h-full min-h-[320px] items-center justify-center text-sm text-muted-foreground'>Unable to preview this checkpoint.</div>
              )}
            </div>

            <DialogFooter className='mt-4'>
              <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={isReverting}>Cancel</Button>
              <Button type='button' onClick={onRevert} disabled={!previewSlide || isReverting}>{isReverting ? 'Reverting...' : 'Revert'}</Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
