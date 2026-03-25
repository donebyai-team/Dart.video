'use client'

import { Wand2, ChevronDown } from 'lucide-react'
import { StyleType } from '@coasterai/pb/coasterai/core/v1/video_pb'

const STYLE_LABELS: Record<number, string> = {
  1: 'Simple Text',
}

interface StyleSelectorProps {
  selectedStyle: StyleType
  onOpenDialog: () => void
  disabled?: boolean
}

const StyleSelector = ({ selectedStyle, onOpenDialog, disabled = false }: StyleSelectorProps) => {
  return (
    <button
      onClick={onOpenDialog}
      disabled={disabled}
      className='flex items-center gap-1.5 flex-shrink-0 hover:text-foreground rounded px-1.5 py-1 hover:bg-muted/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
    >
      <Wand2 className='w-3.5 h-3.5' />
      <span>{STYLE_LABELS[selectedStyle] ?? 'Style'}</span>
      <ChevronDown className='w-3 h-3 opacity-60' />
    </button>
  )
}

export default StyleSelector
