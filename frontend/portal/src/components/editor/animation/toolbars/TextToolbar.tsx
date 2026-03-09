/**
 * TextToolbar
 *
 * Shown when registry[eid].textType is 'static', 'letter-cascade', or 'typewriter'.
 *
 * Controls:
 *  - Text content input (editable text / source text)
 *  - Font family (dropdown)
 *  - Font size (number stepper)
 *  - Bold / Italic / Underline / Strikethrough toggles
 *  - Text color (color swatch with "A" label)
 *  - Background color (color swatch with "▨" label)
 */

import React from 'react'
import { Bold, Italic, Underline, Strikethrough } from 'lucide-react'
import type { RegistryEntry } from '@coasterai/renderer'
import type { ElementEdit } from '@coasterai/renderer/src/types/ast'
import {
  Sep,
  IconBtn,
  ColorSwatch,
  NumberStepper,
  FontFamilySelect,
  LowConfidenceDot,
} from './shared'

interface TextToolbarProps {
  eid: string       // registry key — for entry lookup only
  editEid?: string  // DOM eid — for onEdit and editStore reads (defaults to eid)
  registry: Record<string, RegistryEntry>
  editStore: Record<string, ElementEdit>
  onEdit: (eid: string, patch: Partial<ElementEdit>) => void
}

export function TextToolbar({ eid, editEid, registry, editStore, onEdit }: TextToolbarProps) {
  const entry = registry[eid]
  if (!entry) return null

  const eeid = editEid ?? eid

  // Merge static style with any user overrides — overrides take precedence
  const merged = { ...entry.staticStyle, ...(editStore[eeid]?.style ?? {}) }

  // Low-confidence props (came from spread / ternary in the source AST)
  const lowConf = new Set(entry.lowConfidence ?? [])

  function setStyle(prop: string, value: string | number) {
    console.log('[TextToolbar] setStyle', { eeid, prop, value })
    onEdit(eeid, { style: { [prop]: value } })
  }

  // ── Text content (static / letter-cascade / typewriter) ─────────────────
  const textType = entry.textType
  const hasTextContent = textType === 'static' || textType === 'letter-cascade' || textType === 'typewriter'
  const contentLabel   = textType === 'typewriter' ? 'Source text' : 'Text'
  const currentText    = editStore[eeid]?.text ?? entry.sourceText ?? entry.staticText ?? ''

  // ── Derive toggle states ─────────────────────────────────────────────────
  const isBold      = merged.fontWeight === 700 || merged.fontWeight === '700' || merged.fontWeight === 'bold'
  const isItalic    = merged.fontStyle === 'italic'
  const isUnderline = String(merged.textDecoration ?? '').includes('underline')
  const isStrike    = String(merged.textDecoration ?? '').includes('line-through')

  function toggleDecoration(token: 'underline' | 'line-through') {
    // textDecoration can hold multiple tokens: "underline line-through"
    const current = String(merged.textDecoration ?? '')
    const parts   = current.split(' ').filter(Boolean)
    const has     = parts.includes(token)
    const next    = has ? parts.filter(p => p !== token) : [...parts, token]
    setStyle('textDecoration', next.join(' ') || 'none')
  }

  const fontFamily = String(merged.fontFamily ?? 'Inter')
  const fontSize   = parseFloat(String(merged.fontSize ?? 16)) || 16

  return (
    <>
      {/* ── Text content ────────────────────────────────────────────────── */}
      {hasTextContent && (
        <>
          <input
            type="text"
            value={currentText}
            onChange={e => onEdit(eeid, { text: e.target.value })}
            placeholder={contentLabel}
            title={contentLabel}
            className="h-7 w-28 px-2 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
          />
          <Sep />
        </>
      )}

      {/* ── Font family ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        <FontFamilySelect value={fontFamily} onChange={v => setStyle('fontFamily', v)} />
        {lowConf.has('fontFamily') && <LowConfidenceDot />}
      </div>

      {/* ── Font size ───────────────────────────────────────────────────── */}
      {'fontSize' in merged && (
        <div className="flex items-center gap-1">
          <NumberStepper
            value={fontSize}
            onChange={v => setStyle('fontSize', v)}
            min={8}
            max={300}
            step={1}
            unit="px"
            inputWidth="w-10"
          />
          {lowConf.has('fontSize') && <LowConfidenceDot />}
        </div>
      )}

      <Sep />

      {/* ── Decoration toggles ──────────────────────────────────────────── */}
      <IconBtn active={isBold}      onClick={() => setStyle('fontWeight', isBold ? 400 : 700)} title="Bold">
        <Bold size={13} strokeWidth={isBold ? 3 : 2} />
      </IconBtn>

      <IconBtn active={isItalic}    onClick={() => setStyle('fontStyle', isItalic ? 'normal' : 'italic')} title="Italic">
        <Italic size={13} />
      </IconBtn>

      <IconBtn active={isUnderline} onClick={() => toggleDecoration('underline')} title="Underline">
        <Underline size={13} />
      </IconBtn>

      <IconBtn active={isStrike}    onClick={() => toggleDecoration('line-through')} title="Strikethrough">
        <Strikethrough size={13} />
      </IconBtn>

      <Sep />

      {/* ── Text color ──────────────────────────────────────────────────── */}
      {'color' in merged && (
        <div className="flex items-center gap-1">
          <ColorSwatch
            color={merged.color}
            label="A"
            title="Text color"
            onChange={v => setStyle('color', v)}
          />
          {lowConf.has('color') && <LowConfidenceDot />}
        </div>
      )}

      {/* ── Background color ────────────────────────────────────────────── */}
      {'background' in merged && (
        <div className="flex items-center gap-1">
          <ColorSwatch
            color={merged.background}
            label="▨"
            title="Background color"
            onChange={v => setStyle('background', v)}
          />
          {lowConf.has('background') && <LowConfidenceDot />}
        </div>
      )}


    </>
  )
}
