/**
 * ImageToolbar
 *
 * Shown when registry[eid].assetType === 'image'.
 *
 * Controls:
 *  - Replace image (file upload → CDN → edit.asset)
 *  - Width / Height (number steppers)
 *  - Object fit (cover / contain / fill / none)
 */

import React, { useRef, useState } from 'react'
import { ImageIcon, Upload } from 'lucide-react'
import type { RegistryEntry } from '@coasterai/renderer'
import type { ElementEdit } from '@coasterai/renderer/src/types/ast'
import { Sep, NumberStepper, SelectInput } from './shared'
import { uploadMedia } from '@/services/utils'

interface ImageToolbarProps {
  eid: string       // registry key — for entry lookup only
  editEid?: string  // DOM eid — for onEdit and editStore reads (defaults to eid)
  registry: Record<string, RegistryEntry>
  editStore: Record<string, ElementEdit>
  onEdit: (eid: string, patch: Partial<ElementEdit>) => void
}

type ObjectFit = 'cover' | 'contain' | 'fill' | 'none'

const OBJECT_FIT_OPTIONS: { label: string; value: ObjectFit }[] = [
  { label: 'Cover',   value: 'cover'   },
  { label: 'Contain', value: 'contain' },
  { label: 'Fill',    value: 'fill'    },
  { label: 'None',    value: 'none'    },
]

export function ImageToolbar({ eid, editEid, registry, editStore, onEdit }: ImageToolbarProps) {
  const entry = registry[eid]
  if (!entry) return null

  const eeid   = editEid ?? eid
  const merged = { ...entry.staticStyle, ...(editStore[eeid]?.style ?? {}) }

  const fileRef   = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  function setStyle(prop: string, value: string | number) {
    console.log('[ImageToolbar] setStyle', { eeid, prop, value })
    onEdit(eeid, { style: { [prop]: value } })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    console.log('[ImageToolbar] Uploading image:', file.name)
    setUploading(true)
    try {
      const asset = await uploadMedia(file)
      console.log('[ImageToolbar] Upload complete:', asset.url)
      onEdit(eeid, { asset: asset.url })
    } catch (err) {
      console.error('[ImageToolbar] Upload failed:', err)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // Parse dimension values (may be numbers or strings like "200px")
  function parseDim(v: unknown): number {
    if (typeof v === 'number') return v
    const n = parseFloat(String(v ?? ''))
    return isNaN(n) ? 0 : n
  }

  const width     = parseDim(merged.width)
  const height    = parseDim(merged.height)
  const objectFit = (merged.objectFit as ObjectFit) ?? 'cover'

  return (
    <>
      {/* ── Replace button ─────────────────────────────────────────────── */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="h-7 px-2.5 flex items-center gap-1.5 rounded-md border border-border bg-background hover:bg-muted transition-colors text-xs disabled:opacity-50"
      >
        {uploading
          ? <Upload size={13} className="animate-bounce" />
          : <ImageIcon size={13} />
        }
        {uploading ? 'Uploading…' : 'Replace image'}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <Sep />

      {/* ── Width ──────────────────────────────────────────────────────── */}
      {'width' in merged && (
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground text-xs w-3">W</span>
          <NumberStepper
            value={width}
            onChange={v => setStyle('width', v)}
            min={1}
            step={1}
            unit="px"
            inputWidth="w-12"
          />
        </div>
      )}

      {/* ── Height ─────────────────────────────────────────────────────── */}
      {'height' in merged && (
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground text-xs w-3">H</span>
          <NumberStepper
            value={height}
            onChange={v => setStyle('height', v)}
            min={1}
            step={1}
            unit="px"
            inputWidth="w-12"
          />
        </div>
      )}

      {/* ── Object fit ─────────────────────────────────────────────────── */}
      {'objectFit' in merged && (
        <>
          <Sep />
          <SelectInput
            value={objectFit}
            options={OBJECT_FIT_OPTIONS}
            onChange={v => setStyle('objectFit', v)}
            width="w-24"
          />
        </>
      )}
    </>
  )
}
