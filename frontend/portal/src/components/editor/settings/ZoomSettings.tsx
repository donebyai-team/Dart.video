import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Pause, Play } from 'lucide-react'
import { ZoomEffect } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import DurationChangeComponent from '../toolbar/DurationChangeComponent'

interface ZoomSettingsProps {
  settings: Partial<ZoomEffect>
  onChange: (settings: Partial<ZoomEffect>) => void
  slideDurationInFrames?: number
  slideStartFrame?: number // Global frame where this slide starts
  transitionDurationInFrames?: number
  fps?: number
  onPlay?: () => void
  isPreviewPlaying?: boolean
}

const ZoomSettings = ({
  settings,
  onChange,
  slideDurationInFrames = 150,
  slideStartFrame = 0,
  transitionDurationInFrames = 0,
  fps = 30,
  onPlay,
  isPreviewPlaying = false,
}: ZoomSettingsProps) => {
  // Convert to global timeline seconds for display
  const slideStartSec = slideStartFrame / fps
  const slideEndSec = (slideStartFrame + slideDurationInFrames) / fps
  const transitionDurationSec = transitionDurationInFrames / fps
  
  // Get current values as global timeline seconds
  const zoomStartSec = slideStartSec + (settings.startFrame ?? 0) / fps
  const zoomEndSec = slideStartSec + (settings.endFrame ?? slideDurationInFrames) / fps
  const zoomLevel = settings.zoomLevel ?? 2

  // Debug: log values to check for NaN
  console.log('ZoomSettings values:', {
    slideStartFrame, slideDurationInFrames, fps, transitionDurationInFrames,
    slideStartSec, slideEndSec, transitionDurationSec,
    zoomStartSec, zoomEndSec, zoomLevel,
    settingsStartFrame: settings.startFrame,
    settingsEndFrame: settings.endFrame,
  })

  return (
    <div className='space-y-4'>
      {/* Zoom Level */}
      <div className='space-y-2'>
        <Label className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>Zoom</Label>
        <div className='flex items-center gap-2'>
          <Label className='text-xs w-16'>Level</Label>
          <Slider
            value={[zoomLevel]}
            onValueChange={values => {
              console.log('ZoomSettings: changing zoomLevel to', values[0])
              onChange({ zoomLevel: values[0] })
            }}
            min={1.2}
            max={5}
            step={0.1}
            className='flex-1'
          />
          <span className='text-xs text-muted-foreground w-10'>{zoomLevel.toFixed(1)}x</span>
        </div>
      </div>

      {/* Timing Section - shows global timeline time */}
      <div className='space-y-2'>
        <Label className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
          Timing (Slide: {slideStartSec.toFixed(1)}s - {slideEndSec.toFixed(1)}s)
        </Label>
        <div className='flex items-center gap-2'>
          <Label className='text-xs w-16'>Start</Label>
          <DurationChangeComponent
            value={zoomStartSec}
            onValueChange={val => {
              // Convert global seconds back to slide-relative frames
              const slideRelativeSec = val - slideStartSec
              onChange({ startFrame: Math.round(slideRelativeSec * fps) })
            }}
            max={zoomEndSec - 0.1}
            min={slideStartSec + transitionDurationSec}
            step={0.1}
          />
        </div>
        <div className='flex items-center gap-2'>
          <Label className='text-xs w-16'>End</Label>
          <DurationChangeComponent
            value={zoomEndSec}
            onValueChange={val => {
              // Convert global seconds back to slide-relative frames
              const slideRelativeSec = val - slideStartSec
              onChange({ endFrame: Math.round(slideRelativeSec * fps) })
            }}
            max={slideEndSec - transitionDurationSec}
            min={zoomStartSec + 0.1}
            step={0.1}
          />
        </div>
        <p className='text-xs text-muted-foreground'>Duration: {(zoomEndSec - zoomStartSec).toFixed(1)}s</p>
      </div>

      {/* Preview */}
      <div className='pt-2'>
        <Button variant='default' size='sm' className='w-full gap-2' onClick={onPlay}>
          {isPreviewPlaying ? <Pause className='w-3.5 h-3.5' /> : <Play className='w-3.5 h-3.5' />}
          {isPreviewPlaying ? 'Stop Preview' : 'Preview'}
        </Button>
      </div>
    </div>
  )
}

export default ZoomSettings
