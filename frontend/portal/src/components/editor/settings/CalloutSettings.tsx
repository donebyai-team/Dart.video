import ColorPickerInput from '@/components/editor/ColorPickerInput'
import { Label } from '@/components/ui/label'
import DurationButtonRange from '../remotion/components/DurationChangeComponent'
import { CalloutEffect } from '@coasterai/pb/coasterai/core/v1/slide_pb'

interface CalloutSettingsProps {
  settings: Partial<CalloutEffect>
  onChange: (settings: Partial<CalloutEffect>) => void
  slideDuration?: number
  transitionDuration?: number
}

const CalloutSettings = ({ settings, onChange, slideDuration = 0, transitionDuration = 0 }: CalloutSettingsProps) => {
  const calloutStart = settings.startTime ?? 0
  const calloutEnd = settings.endTime ?? slideDuration
  return (
    <div className='space-y-2'>
      <Label className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
        Border color
      </Label>
      <ColorPickerInput value={settings.color || '#ef4444'} onChange={color => {
        settings.color = color;
        onChange(settings)
      }} />
      <div className='space-y-2'>
        <Label className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
          Timing (Slide: 0s - {slideDuration.toFixed(1)}s)
        </Label>
        <div className='flex items-center gap-2'>
          <Label className='text-xs w-16'>Start</Label>

          <DurationButtonRange
            value={calloutStart}
            onValueChange={val => {
              settings.startTime = val
              console.log(val, calloutEnd, "endstart")
              onChange(settings)
            }}
            // the max value of startTime will calloutEnd seconds - 0.1
            // it will ensure that the start and end time doesn't become same
            max={calloutEnd - 0.1}
            // If there is transition in slide it will make sure the startTime start from transitionDuration
            min={transitionDuration}
            // This step variable ensures the value will decrease/increase  by 0.1 only
            step={0.1}
          />
        </div>
        <div className='flex items-center gap-2'>
          <Label className='text-xs w-16'>End</Label>
          <DurationButtonRange
            value={calloutEnd}
            onValueChange={val => {
              settings.endTime = val
              onChange(settings)
            }}
            // If there is transition in slide it will make sure the endTime ends before transitionDuration
            max={slideDuration - transitionDuration}
            // the min value of endTime will calloutStart seconds + 0.1
            // it will ensure that the start and end time doesn't become same
            min={calloutStart + 0.1}
            // This step variable ensures the value will decrease/increase  by 0.1 only
            step={0.1}
          />
        </div>
        <p className='text-xs text-muted-foreground'>Duration: {(calloutEnd - calloutStart).toFixed(1)}s</p>
      </div>
    </div>
  )
}

export default CalloutSettings
