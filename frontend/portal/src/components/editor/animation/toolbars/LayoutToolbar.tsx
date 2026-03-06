/**
 * LayoutToolbar
 *
 * Shown for container / structural elements that have no text, asset, or icon.
 * (e.g. a div, AbsoluteFill, background layer)
 *
 * Controls (only rendered if the property exists in staticStyle):
 *  - Background color (color swatch)
 *  - Border radius (number stepper)
 *  - Opacity (slider 0–1)
 */

import React from 'react'
import type { RegistryEntry } from '@coasterai/renderer'
import type { ElementEdit } from '@coasterai/renderer/src/types/ast'
import { Sep, ColorSwatch, NumberStepper, SliderInput, LowConfidenceDot } from './shared'

interface LayoutToolbarProps {
  eid: string
  registry: Record<string, RegistryEntry>
  editStore: Record<string, ElementEdit>
  onEdit: (eid: string, patch: Partial<ElementEdit>) => void
}

export function LayoutToolbar({ eid, registry, editStore, onEdit }: LayoutToolbarProps) {
  const entry = registry[eid]
  if (!entry) return null

  const merged  = { ...entry.staticStyle, ...(editStore[eid]?.style ?? {}) }
  const lowConf = new Set(entry.lowConfidence ?? [])

  function setStyle(prop: string, value: string | number) {
    console.log('[LayoutToolbar] setStyle', { eid, prop, value })
    onEdit(eid, { style: { [prop]: value } })
  }

  const hasBg    = 'background' in merged || 'backgroundColor' in merged
  const bgColor  = (merged.background ?? merged.backgroundColor) as string | undefined
  const bgProp   = 'background' in merged ? 'background' : 'backgroundColor'

  const hasRadius = 'borderRadius' in merged
  const radius    = parseFloat(String(merged.borderRadius ?? 0)) || 0

  const hasOpacity = 'opacity' in merged
  const opacity    = parseFloat(String(merged.opacity ?? 1))

  // Nothing to show — return null so no empty toolbar appears
  if (!hasBg && !hasRadius && !hasOpacity) return null

  return (
    <>
      {/* ── Background color ────────────────────────────────────────────── */}
      {hasBg && (
        <div className="flex items-center gap-1">
          <ColorSwatch
            color={bgColor}
            label="▨"
            title="Background color"
            onChange={v => setStyle(bgProp, v)}
          />
          {(lowConf.has('background') || lowConf.has('backgroundColor')) && <LowConfidenceDot />}
        </div>
      )}

      {hasBg && (hasRadius || hasOpacity) && <Sep />}

      {/* ── Border radius ───────────────────────────────────────────────── */}
      {hasRadius && (
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground text-xs">⬡</span>
          <NumberStepper
            value={radius}
            onChange={v => setStyle('borderRadius', v)}
            min={0}
            step={1}
            unit="px"
            inputWidth="w-10"
          />
          {lowConf.has('borderRadius') && <LowConfidenceDot />}
        </div>
      )}

      {hasRadius && hasOpacity && <Sep />}

      {/* ── Opacity ─────────────────────────────────────────────────────── */}
      {hasOpacity && (
        <div className="flex items-center gap-1">
          <SliderInput
            value={isNaN(opacity) ? 1 : opacity}
            onChange={v => setStyle('opacity', v)}
            min={0}
            max={1}
            step={0.01}
            label="◎"
          />
          {lowConf.has('opacity') && <LowConfidenceDot />}
        </div>
      )}
    </>
  )
}
