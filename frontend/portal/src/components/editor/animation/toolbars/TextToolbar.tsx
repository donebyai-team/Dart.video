/**
 * TextToolbar
 *
 * Shown when registry[eid].textType === 'static'.
 *
 * Controls:
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
  eid: string
  registry: Record<string, RegistryEntry>
  editStore: Record<string, ElementEdit>
  onEdit: (eid: string, patch: Partial<ElementEdit>) => void
}

export function TextToolbar({ eid, registry, editStore, onEdit }: TextToolbarProps) {
  const entry = registry[eid]
  if (!entry) return null

  // Merge static style with any user overrides — overrides take precedence
  const merged = { ...entry.staticStyle, ...(editStore[eid]?.style ?? {}) }

  // Low-confidence props (came from spread / ternary in the source AST)
  const lowConf = new Set(entry.lowConfidence ?? [])

  function setStyle(prop: string, value: string | number) {
    console.log('[TextToolbar] setStyle', { eid, prop, value })
    onEdit(eid, { style: { [prop]: value } })
  }

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
