import React, { useRef, useState } from 'react'
import { ImageUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadMedia } from '@/services/utils'
import { NumberStepper, SelectInput } from './shared'

const OBJECT_FIT_OPTIONS = [
  { label: 'Contain', value: 'contain' },
  { label: 'Cover', value: 'cover' },
  { label: 'Fill', value: 'fill' },
]

function CtrlGroup({ icon, tooltip, children }: {
  icon: React.ReactNode
  tooltip: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-1.5 shrink-0" title={tooltip}>
      <span className="text-muted-foreground shrink-0">{icon}</span>
      {children}
    </div>
  )
}

function Div() {
  return <div className="w-px h-5 bg-border/60 mx-0.5 shrink-0" />
}

interface MediaToolbarProps {
  currentProps: Record<string, unknown>
  styleOverride: Record<string, string | number>
  onValuePatch: (prop: string, value: unknown) => void
  onStyleOverride: (style: Record<string, string | number>) => void
}

export function MediaToolbar({
  currentProps,
  styleOverride,
  onValuePatch,
  onStyleOverride,
}: MediaToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleUpload = async (file: File) => {
    try {
      setIsUploading(true)
      const asset = await uploadMedia(file)
      onValuePatch('src', asset.url)
    } catch (error) {
      console.error('Failed to upload media for animation toolbar', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload media')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background/95 backdrop-blur-lg border border-border shadow-xl text-sm select-none max-w-[700px]">
      <CtrlGroup icon={<ImageUp size={13} />} tooltip="Upload a replacement image">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="h-7 px-2.5 rounded-md border border-border bg-muted hover:bg-accent disabled:opacity-50 text-xs transition-colors"
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (file) {
              await handleUpload(file)
              e.target.value = ''
            }
          }}
        />
      </CtrlGroup>

      <Div />

      <CtrlGroup icon={<span className="text-xs font-medium leading-none">W</span>} tooltip="Width">
        <NumberStepper
          value={typeof currentProps.width === 'number' ? currentProps.width : 0}
          onChange={value => onValuePatch('width', value)}
          min={0}
          step={10}
          inputWidth="w-14"
        />
      </CtrlGroup>

      <CtrlGroup icon={<span className="text-xs font-medium leading-none">H</span>} tooltip="Height">
        <NumberStepper
          value={typeof currentProps.height === 'number' ? currentProps.height : 0}
          onChange={value => onValuePatch('height', value)}
          min={0}
          step={10}
          inputWidth="w-14"
        />
      </CtrlGroup>

      <Div />

      <CtrlGroup icon={<ImageUp size={13} />} tooltip="How the image fits inside its box">
        <SelectInput
          value={typeof styleOverride.objectFit === 'string' ? styleOverride.objectFit as 'contain' | 'cover' | 'fill' : 'contain'}
          options={OBJECT_FIT_OPTIONS}
          onChange={value => onStyleOverride({ objectFit: value })}
          width="w-24"
        />
      </CtrlGroup>

      {/* TODO: Add explicit reset actions once patch removal helpers exist so
          src/width/height/objectFit can revert to component defaults. */}
    </div>
  )
}
