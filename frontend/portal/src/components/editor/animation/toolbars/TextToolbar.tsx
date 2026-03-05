import React from 'react'
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import type { ElementEdit } from '../AnimationToolbar'
import type { RegistryEntry } from '@coasterai/renderer'
import { Sep, IconBtn, ColorSwatch } from './shared'

interface TextToolbarProps {
  eid: string
  registry: Record<string, RegistryEntry>
  editStore: Record<string, ElementEdit>
  onEdit: (eid: string, patch: Partial<ElementEdit>) => void
}

export function TextToolbar({ eid, registry, editStore, onEdit }: TextToolbarProps) {
  const entry = registry[eid]
  if (!entry) return null

  const merged = { ...entry.staticStyle, ...(editStore[eid]?.style ?? {}) }

  function setStyle(prop: string, value: string | number) {
    onEdit(eid, { style: { [prop]: value } })
  }

  const isBold = merged.fontWeight === 700 || merged.fontWeight === 'bold'
  const isItalic = merged.fontStyle === 'italic'

  return (
    <>
      {/* FONT FAMILY */}
      <select
        value={String(merged.fontFamily ?? 'Inter')}
        onChange={e => setStyle('fontFamily', e.target.value)}
        className="h-8 px-2 rounded-md border border-border bg-muted text-xs"
      >
        <option>Inter</option>
        <option>Arial</option>
        <option>Roboto</option>
        <option>Georgia</option>
        <option>Courier New</option>
      </select>

      {/* FONT SIZE */}
      {'fontSize' in merged && (
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={parseFloat(String(merged.fontSize)) || 16}
            onChange={e => setStyle('fontSize', Number(e.target.value))}
            className="h-8 w-14 text-center rounded-md border border-border bg-muted text-xs"
            min={8}
            max={300}
          />
          <span className="text-muted-foreground text-xs">px</span>
        </div>
      )}

      <Sep />

      <IconBtn active={isBold} onClick={() => setStyle('fontWeight', isBold ? 400 : 700)} title="Bold">
        <Bold size={14} />
      </IconBtn>

      <IconBtn
        active={isItalic}
        onClick={() => setStyle('fontStyle', isItalic ? 'normal' : 'italic')}
        title="Italic"
      >
        <Italic size={14} />
      </IconBtn>

      <Sep />

      <IconBtn active={merged.textAlign === 'left'} onClick={() => setStyle('textAlign', 'left')} title="Align left">
        <AlignLeft size={14} />
      </IconBtn>
      <IconBtn active={merged.textAlign === 'center'} onClick={() => setStyle('textAlign', 'center')} title="Align center">
        <AlignCenter size={14} />
      </IconBtn>
      <IconBtn active={merged.textAlign === 'right'} onClick={() => setStyle('textAlign', 'right')} title="Align right">
        <AlignRight size={14} />
      </IconBtn>

      <Sep />

      {'color' in merged && (
        <ColorSwatch color={merged.color} title="Text color" onChange={v => setStyle('color', v)} />
      )}
    </>
  )
}
