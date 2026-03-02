import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Pause, Play } from 'lucide-react'
import { ZoomEffect } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import DurationChangeComponent from '../remotion/components/DurationChangeComponent'

interface ZoomSettingsProps {
  settings: Partial<ZoomEffect>
  onChange: (settings: Partial<ZoomEffect>) => void
  slideDuration?: number
  transitionDuration?: number
  onPlay?: () => void
  isPreviewPlaying?: boolean
}

const ZoomSettings = ({
  settings,
  onChange,
  slideDuration = 5,
  transitionDuration = 0,
  onPlay,
  isPreviewPlaying = false,
}: ZoomSettingsProps) => {
  const zoomStart = settings.startTime ?? 0
  const zoomEnd = settings.endTime ?? slideDuration
  const zoomLevel = settings.zoomLevel ?? 2

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
              settings.zoomLevel = values[0]
              onChange(settings)
            }}
            min={1.2}
            max={5}
            step={0.1}
            className='flex-1'
          />
          <span className='text-xs text-muted-foreground w-10'>{zoomLevel.toFixed(1)}x</span>
        </div>
      </div>

      {/* Timing Section */}
      <div className='space-y-2'>
        <Label className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
          Timing (Slide: 0s - {slideDuration.toFixed(1)}s)
        </Label>
        <div className='flex items-center gap-2'>
          <Label className='text-xs w-16'>Start</Label>
          <DurationChangeComponent
            value={zoomStart}
            onValueChange={val => {
              settings.startTime = val
              onChange(settings)
            }}
            max={zoomEnd - 0.1}
            min={transitionDuration}
            step={0.1}
          />
        </div>
        <div className='flex items-center gap-2'>
          <Label className='text-xs w-16'>End</Label>
          <DurationChangeComponent
            value={zoomEnd}
            onValueChange={val => {
              settings.endTime = val
              onChange(settings)
            }}
            max={slideDuration - transitionDuration}
            min={zoomStart + 0.1}
            step={0.1}
          />
        </div>
        <p className='text-xs text-muted-foreground'>Duration: {(zoomEnd - zoomStart).toFixed(1)}s</p>
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
