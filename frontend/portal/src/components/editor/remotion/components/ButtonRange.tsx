import { Button } from '@/components/ui/button'
import { Minus, Plus } from 'lucide-react'

interface Props {
  value: number
  onValueChange: (value: number) => void
  max: number
  min: number
  step:number
}

const ButtonRange = ({ value, onValueChange, max, min, step }: Props) => {
  const handleValueChange = (val: number) => {
    onValueChange(value + val)
  }
  return (
    <div className='flex items-center gap-1'>
      <Button
        variant='ghost'
        size='sm'
        className='h-7 w-7 p-0'
        onClick={() => {
          handleValueChange(-step)
        }}
        disabled={value <= min}
      >
        <Minus className='w-3 h-3' />
      </Button>

      <div className='h-7 w-16 text-center text-sm'>{value.toFixed(1)}</div>

      <Button
        variant='ghost'
        size='sm'
        className='h-7 w-7 p-0'
        onClick={() => {
          handleValueChange(+step)
        }}
        disabled={value >= max}
      >
        <Plus className='w-3 h-3' />
      </Button>
    </div>
  )
}

export default ButtonRange
