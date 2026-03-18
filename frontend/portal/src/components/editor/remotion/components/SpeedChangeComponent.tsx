import { Button } from '@/components/ui/button'
import { Minus, Plus } from 'lucide-react'

interface Props {
  baseFrames: number
  durationInFrames: number
  onChange: (value: number) => void
  max: number
  min: number
  step: number
}

const SpeedChangeComponent = ({
  baseFrames,
  durationInFrames,
  onChange,
  max,
  min,
  step,
}: Props) => {
  // Derived speed
  const speed = baseFrames / durationInFrames
  const speedDisplay = speed.toFixed(1)

  const handleChange = (delta: number) => {
    const next = durationInFrames + delta   
    console.log("change", next) 
    onChange(Math.round(next))
  }

  return (
    <div className='flex items-center gap-2'>
      <Button
        variant='ghost'
        size='sm'
        className='h-7 w-7 p-0'
        onClick={() => handleChange(step)} // slower → +frames
        disabled={durationInFrames >= max}
      >
        <Minus className='w-3 h-3' />
      </Button>

      <div className='h-5 text-center text-sm w-12'>
        {speedDisplay}x
      </div>

      <Button
        variant='ghost'
        size='sm'
        className='h-7 w-7 p-0'
        onClick={() => handleChange(-step)} // faster → -frames
        disabled={durationInFrames <= min}
      >
        <Plus className='w-3 h-3' />
      </Button>
    </div>
  )
}

export default SpeedChangeComponent