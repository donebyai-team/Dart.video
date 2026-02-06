import ColorPickerInput from '@/components/editor/ColorPickerInput'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CanvasObject } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import DurationButtonRange from '../remotion/components/DurationChangeComponent'

interface CalloutSettingsProps {
  settings: Partial<CanvasObject>
  onChange: <K extends keyof CanvasObject>(key: K, value: CanvasObject[K]) => void
  slideDuration?: number
  transitionDuration?: number
}

const CalloutSettings = ({ settings, onChange, slideDuration = 0, transitionDuration = 0 }: CalloutSettingsProps) => {
  const spotlightStart = settings.startTime ?? 0
  const spotlightEnd = settings.endTime ?? slideDuration
  return (
    <div className='space-y-2'>
       <Label className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
          Border color
        </Label>
      <ColorPickerInput value={settings.color || '#ef4444'} onChange={color => onChange('color', color)} />
      <div className='space-y-2'>
        <Label className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
          Timing (Slide: 0s - {slideDuration.toFixed(1)}s)
        </Label>
        <div className='flex items-center gap-2'>
          <Label className='text-xs w-16'>Start</Label>

          <DurationButtonRange
            value={spotlightStart}
            onValueChange={val => {
              onChange('startTime', val)
            }}
            // the max value of startTime will spotlightEnd seconds - 0.1
            // it will ensure that the start and end time doesn't become same
            max={spotlightEnd - 0.1}
            // If there is transition in slide it will make sure the startTime start from transitionDuration
            min={transitionDuration}
            // This step variable ensures the value will decrease/increase  by 0.1 only
            step={0.1}
          />
        </div>
        <div className='flex items-center gap-2'>
          <Label className='text-xs w-16'>End</Label>
          <DurationButtonRange
            value={spotlightEnd}
            onValueChange={val => {
              onChange('endTime', val)
            }}
            // If there is transition in slide it will make sure the endTime ends before transitionDuration
            max={slideDuration - transitionDuration}
            // the min value of endTime will spotlightStart seconds + 0.1
            // it will ensure that the start and end time doesn't become same
            min={spotlightStart + 0.1}
            // This step variable ensures the value will decrease/increase  by 0.1 only
            step={0.1}
          />
        </div>
        <p className='text-xs text-muted-foreground'>Duration: {(spotlightEnd - spotlightStart).toFixed(1)}s</p>
      </div>

      <Select
        value={settings.calloutStyle}
        onValueChange={value => onChange('calloutStyle', value as 'pointer' | 'circle' | 'box' | 'numbered')}
      >
        <SelectTrigger className='h-8 text-xs hidden'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='pointer'>Pointer</SelectItem>
          <SelectItem value='circle'>Circle</SelectItem>
          <SelectItem value='box'>Box</SelectItem>
          <SelectItem value='numbered'>Numbered</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

export default CalloutSettings
