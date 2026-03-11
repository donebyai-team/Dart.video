'use client'

import { Check, Type } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StyleType } from '@coasterai/pb/coasterai/core/v1/video_pb'

interface StyleOption {
  value: StyleType
  label: string
  description: string
  icon: React.ReactNode
}

const STYLE_OPTIONS: StyleOption[] = [
  {
    value: StyleType.SIMPLE,
    label: 'Simple Text',
    description: 'Clean text overlays on video with minimal visual elements',
    icon: <Type className='w-6 h-6' />,
  },
]

interface StylePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedStyle: StyleType
  onSelect: (style: StyleType) => void
}

const StylePickerDialog = ({
  open,
  onOpenChange,
  selectedStyle,
  onSelect,
}: StylePickerDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Choose a style</DialogTitle>
        </DialogHeader>

        <div className='grid grid-cols-2 gap-3 pt-2'>
          {STYLE_OPTIONS.map(option => {
            const isSelected = selectedStyle === option.value
            return (
              <button
                key={option.value}
                onClick={() => {
                  onSelect(isSelected ? StyleType.UNDEFINED : option.value)
                  onOpenChange(false)
                }}
                className={`relative flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/40 ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background'
                }`}
              >
                {isSelected && (
                  <span className='absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                    <Check className='w-3 h-3' />
                  </span>
                )}
                <span className='text-muted-foreground'>{option.icon}</span>
                <div>
                  <p className='text-sm font-medium'>{option.label}</p>
                  <p className='text-xs text-muted-foreground mt-0.5 leading-snug'>
                    {option.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default StylePickerDialog
