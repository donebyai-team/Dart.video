/**
 * IconToolbar
 *
 * Shown when registry[eid].assetType === 'icon'.
 *
 * Controls:
 *  - Icon name (read-only display for now; grid picker is a future enhancement)
 *  - Color (color swatch)
 *  - Size (number stepper — maps to fontSize on SVG icons)
 */

import React from 'react'
import type { RegistryEntry } from '@coasterai/renderer'
import type { ElementEdit } from '@coasterai/renderer/src/types/ast'
import { Sep, ColorSwatch, NumberStepper } from './shared'

interface IconToolbarProps {
  eid: string
  registry: Record<string, RegistryEntry>
  editStore: Record<string, ElementEdit>
  onEdit: (eid: string, patch: Partial<ElementEdit>) => void
}

export function IconToolbar({ eid, registry, editStore, onEdit }: IconToolbarProps) {
  const entry = registry[eid]
  if (!entry) return null

  const merged = { ...entry.staticStyle, ...(editStore[eid]?.style ?? {}) }

  function setStyle(prop: string, value: string | number) {
    console.log('[IconToolbar] setStyle', { eid, prop, value })
    onEdit(eid, { style: { [prop]: value } })
  }

  // Current icon name (from editStore override or registry)
  const iconName  = editStore[eid]?.icon ?? entry.iconName ?? '—'
  const iconColor = merged.color
  const iconSize  = parseFloat(String(merged.fontSize ?? merged.width ?? 24)) || 24

  return (
    <>
      {/* ── Icon name (read-only) ───────────────────────────────────────── */}
      <span
        className="text-xs text-foreground/70 font-mono px-1.5 py-1 rounded bg-muted border border-border max-w-[120px] truncate"
        title={iconName}
      >
        {iconName}
      </span>

      <Sep />

      {/* ── Color ──────────────────────────────────────────────────────── */}
      <ColorSwatch
        color={iconColor}
        label="Color"
        title="Icon color"
        onChange={v => setStyle('color', v)}
      />

      <Sep />

      {/* ── Size ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground text-xs">Size</span>
        <NumberStepper
          value={iconSize}
          onChange={v => setStyle('fontSize', v)}
          min={8}
          max={200}
          step={1}
          unit="px"
          inputWidth="w-10"
        />
      </div>
    </>
  )
}
