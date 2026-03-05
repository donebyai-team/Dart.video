import React, { useRef, useState } from 'react'
import { ImageIcon, Upload } from 'lucide-react'
import type { ElementEdit } from '../AnimationToolbar'
import type { RegistryEntry } from '@coasterai/renderer'
import { Sep } from './shared'
import { uploadMedia } from '@/services/utils'

interface ImageToolbarProps {
  eid: string
  registry: Record<string, RegistryEntry>
  editStore: Record<string, ElementEdit>
  onEdit: (eid: string, patch: Partial<ElementEdit>) => void
}

export function ImageToolbar({
  eid,
  registry,
  editStore,
  onEdit,
}: ImageToolbarProps) {

  const entry = registry[eid]
  if (!entry) return null

  const merged = { ...entry.staticStyle, ...(editStore[eid]?.style ?? {}) }

  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  function setStyle(prop: string, value: string | number) {
    onEdit(eid, { style: { [prop]: value } })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const asset = await uploadMedia(file)
      onEdit(eid, { asset: asset.url })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <>
      {/* IMAGE UPLOAD */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="h-8 px-3 flex items-center gap-2 rounded-md border border-border bg-background hover:bg-muted transition text-xs disabled:opacity-50"
      >
        {uploading ? (
          <Upload size={14} className="animate-pulse" />
        ) : (
          <ImageIcon size={14} />
        )}

        {uploading ? 'Uploading…' : 'Replace'}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <Sep />

      {/* SIZE CONTROLS */}
      <div className="flex items-center gap-2">

        {/* WIDTH */}
        <NumberField
          label="W"
          value={merged.width}
          placeholder="auto"
          onChange={(v) => setStyle('width', v)}
        />

        {/* HEIGHT */}
        <NumberField
          label="H"
          value={merged.height}
          placeholder="auto"
          onChange={(v) => setStyle('height', v)}
        />

      </div>
    </>
  )
}

function NumberField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: unknown
  placeholder?: string
  onChange: (v: number) => void
}) {

  const parsed =
    typeof value === 'number'
      ? value
      : parseFloat(String(value || ''))

  return (
    <div className="flex items-center gap-1">

      <span className="text-muted-foreground text-xs w-3 text-center">
        {label}
      </span>

      <input
        type="number"
        value={Number.isFinite(parsed) ? parsed : ''}
        placeholder={placeholder}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-16 text-center rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        min={1}
      />

    </div>
  )
}