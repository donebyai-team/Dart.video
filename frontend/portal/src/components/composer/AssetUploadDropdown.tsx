'use client'

import { Paperclip } from 'lucide-react'

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
    <button
      type='button'
      disabled={disabled}
      onClick={() => onOpenAssetPicker('upload')}
      className={triggerClassName || 'flex items-center gap-1.5 flex-shrink-0 hover:text-foreground rounded px-1.5 py-1 hover:bg-muted/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'}
    >
      <Paperclip className='w-4 h-4' />
      {showLabel && <span>Attach</span>}
    </button>
  )
}

export default AssetUploadDropdown
