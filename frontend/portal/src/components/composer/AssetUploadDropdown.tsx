'use client'

import { Figma, ImagePlus, ChevronDown } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface AssetUploadDropdownProps {
  disabled?: boolean
  onOpenAssetPicker: (mode: 'figma' | 'upload') => void
  triggerClassName?: string
  showLabel?: boolean
}

const AssetUploadDropdown = ({
  disabled = false,
  onOpenAssetPicker,
  triggerClassName = '',
  showLabel = true
}: AssetUploadDropdownProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={disabled}
          className={triggerClassName || 'flex items-center gap-1.5 flex-shrink-0 hover:text-foreground rounded px-1.5 py-1 hover:bg-muted/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'}
        >
          <ImagePlus className='w-4 h-4' />
          {showLabel && <span>Add Assets</span>}
          <ChevronDown className='w-3 h-3 opacity-60' />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onSelect={() => onOpenAssetPicker('figma')}>
          <Figma className='mr-2 h-4 w-4' />
          Import from Figma
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onOpenAssetPicker('upload')}>
          <ImagePlus className='mr-2 h-4 w-4' />
          Upload Media
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default AssetUploadDropdown
