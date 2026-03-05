import React from 'react'
import type { ElementEdit } from '../AnimationToolbar'
import type { RegistryEntry } from '@coasterai/renderer'
import { Sep, ColorSwatch } from './shared'

interface IconToolbarProps {
  eid: string
  registry: Record<string, RegistryEntry>
  editStore: Record<string, ElementEdit>
  onEdit: (eid: string, patch: Partial<ElementEdit>) => void
}

export function IconToolbar({
  eid,
  registry,
  editStore,
  onEdit,
}: IconToolbarProps) {

  const entry = registry[eid]
  if (!entry) return null

  const merged = { ...entry.staticStyle, ...(editStore[eid]?.style ?? {}) }

  function setStyle(prop: string, value: string | number) {
    onEdit(eid, { style: { [prop]: value } })
  }

  const hasBg = 'backgroundColor' in merged || 'background' in merged

  return (
    <>
      {/* ICON COLOR */}
      <Control label="Color">
        <ColorSwatch
          color={merged.color}
          title="Icon color"
          onChange={(v) => setStyle('color', v)}
        />
      </Control>

      <Sep />

      {/* SIZE */}
      <div className="flex items-center gap-2">

        <NumberField
          label="W"
          value={merged.width}
          placeholder="auto"
          onChange={(v) => setStyle('width', v)}
        />

        <NumberField
          label="H"
          value={merged.height}
          placeholder="auto"
          onChange={(v) => setStyle('height', v)}
        />

      </div>

      {hasBg && (
        <>
          <Sep />

          {/* BACKGROUND COLOR */}
          <Control label="BG">
            <ColorSwatch
              color={merged.backgroundColor ?? merged.background}
              title="Background color"
              onChange={(v) => setStyle('backgroundColor', v)}
            />
          </Control>
        </>
      )}
    </>
  )
}

/* ---------- Shared UI ---------- */

function Control({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-xs min-w-[28px]">
        {label}
      </span>
      {children}
    </div>
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