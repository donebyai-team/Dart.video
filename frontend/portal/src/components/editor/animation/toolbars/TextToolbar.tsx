/**
 * shared.tsx
 *
 * Shared UI primitives for the animation toolbar system.
 * All toolbar sub-components (TextToolbar, ImageToolbar, etc.) import from here.
 */

import React, { useMemo, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { BrandAssetPriority } from '@coasterai/pb/coasterai/core/v1/brandkit_pb'
import {
  buildDepthTextShadow,
  DEPTH_STYLE_PROPERTY,
  MAX_ELEMENT_DEPTH,
  parseDepthFromShadow,
} from '@coasterai/renderer'
import { useVideoStore } from '@/stores/video'
import { DualColorPicker } from './stylers/DualColorPicker'
import { FontSelector } from './stylers/FontSelector'
import {
  FONT_WEIGHT_OPTIONS,
  LETTER_SPACING_OPTIONS,
  TEXT_ALIGN_OPTIONS,
  TEXT_TRANSFORM_OPTIONS,
  toHex,
} from './stylers/options'

/**
 * Reads computed styles from a DOM element by ID.
 * Returns undefined values if element not found.
 */
/**
 * Extracts the actual font name from a CSS font-family value.
 * Handles Next.js hashed names like "__Inter_93f1ff" -> "Inter"
 */
function extractFontName(rawFontFamily: string): string | undefined {
  const first = rawFontFamily.split(',')[0]?.trim().replace(/["']/g, '')
  if (!first) return undefined
  // Next.js font hash pattern: __FontName_hash or __Font_Name_hash
  const nextMatch = first.match(/^__([A-Za-z_]+)_[a-f0-9]+$/)
  if (nextMatch) {
    // Convert underscores to spaces for multi-word fonts, e.g. __Open_Sans_abc -> "Open Sans"
    return nextMatch[1].replace(/_/g, ' ')
  }
  return first
}

function useComputedStyles(elementId?: string) {
  return useMemo(() => {
    if (!elementId) return {}
    const el = document.getElementById(elementId)
    if (!el) return {}
    const computed = window.getComputedStyle(el)
    return {
      color: rgbaToHex(computed.color),
      backgroundColor: rgbaToHex(computed.backgroundColor),
      fontFamily: extractFontName(computed.fontFamily || ''),
      fontWeight: computed.fontWeight,
      letterSpacing: computed.letterSpacing,
      textAlign: computed.textAlign,
      textTransform: computed.textTransform,
      boxShadow: computed.boxShadow,
      textShadow: computed.textShadow,
      depth: Number(computed.getPropertyValue(DEPTH_STYLE_PROPERTY)) || undefined,
    }
  }, [elementId])
}

export function getDepthValue(
  styleOverride: Record<string, string | number>,
  computed: { boxShadow?: string; textShadow?: string; depth?: number },
  options?: { boxOnly?: boolean; fallbackDepth?: number },
): number {
  const { boxOnly = false, fallbackDepth = 0 } = options ?? {}
  const overrideDepth = Number(styleOverride[DEPTH_STYLE_PROPERTY])
  if (Number.isFinite(overrideDepth)) return overrideDepth

  if (!boxOnly && styleOverride.textShadow !== undefined) {
    return parseDepthFromShadow(styleOverride.textShadow)
  }

  if (styleOverride.boxShadow !== undefined) {
    return parseDepthFromShadow(styleOverride.boxShadow)
  }

  const parsedDepth = parseDepthFromShadow(boxOnly ? computed.boxShadow : (computed.textShadow ?? computed.boxShadow))
  if (parsedDepth > 0) return parsedDepth

  return computed.depth ?? fallbackDepth
}

/**
 * Converts rgba/rgb color string to hex.
 * e.g. "rgba(0, 0, 0, 0.87)" -> "#000000"
 */
export function rgbaToHex(color: string): string | undefined {
  if (!color) return undefined
  const m = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (m) {
    return (
      '#' +
      [m[1], m[2], m[3]]
        .map(n => parseInt(n).toString(16).padStart(2, '0'))
        .join('')
    )
  }
  return color.startsWith('#') ? color : undefined
}

// ─── Separator ─────────────────────────────────────────────────────────────

export function Sep() {
  return <div className="w-px h-5 bg-border/60 mx-1 shrink-0" />
}

// ─── Icon Button ────────────────────────────────────────────────────────────

export function IconBtn({
  children,
  active,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode
  active?: boolean
  onClick: () => void
  title?: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={[
        'h-7 w-7 flex items-center justify-center rounded-md transition-colors shrink-0',
        active
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-accent text-foreground/70 hover:text-foreground',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// ─── Number Stepper ─────────────────────────────────────────────────────────
// A compact number input. Clicking +/- steps the value; you can also type directly.

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  unit,
  inputWidth = 'w-12',
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  inputWidth?: string
}) {
  const clamp = (n: number) => {
    let v = n
    if (min !== undefined) v = Math.max(min, v)
    if (max !== undefined) v = Math.min(max, v)
    return v
  }

  return (
    <div className="flex items-center gap-0.5">
      {/* Step down */}
      <button
        className="h-7 w-5 flex items-center justify-center rounded-l-md border-y border-l border-border bg-muted hover:bg-accent text-foreground/60 hover:text-foreground text-xs transition-colors select-none"
        onClick={() => onChange(clamp(value - step))}
        tabIndex={-1}
      >
        −
      </button>

      {/* Input */}
      <input
        type="number"
        value={value}
        min={min}

        step={step}
        onChange={e => {
          const n = parseFloat(e.target.value)
          if (!isNaN(n)) onChange(clamp(n))
        }}
        className={`h-7 ${inputWidth} text-center border-y border-border bg-muted text-xs focus:outline-none focus:bg-background [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      />

      {/* Step up */}
      <button
        className="h-7 w-5 flex items-center justify-center rounded-r-md border-y border-r border-border bg-muted hover:bg-accent text-foreground/60 hover:text-foreground text-xs transition-colors select-none"
        onClick={() => onChange(clamp(value + step))}
        tabIndex={-1}
      >
        +
      </button>

      {unit && (
        <span className="text-muted-foreground text-xs ml-1 shrink-0">{unit}</span>
      )}
    </div>
  )
}

// ─── Select Input ────────────────────────────────────────────────────────────

export function SelectInput<T extends string>({
  value,
  options,
  onChange,
  width = 'w-auto',
}: {
  value: T
  options: { label: string; value: T }[]
  onChange: (v: T) => void
  width?: string
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as T)}
      className={`h-7 ${width} px-2 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50 cursor-pointer`}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

// ─── Slider Input ────────────────────────────────────────────────────────────

export function SliderInput({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  label,
  width = 'w-20',
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  width?: string
}) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-muted-foreground text-xs shrink-0">{label}</span>}
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(parseFloat(e.target.value))}
        className={`${width} h-1.5 appearance-none rounded-full bg-border cursor-pointer accent-primary`}
      />
      <span className="text-muted-foreground text-xs w-8 text-right shrink-0">
        {value.toFixed(2)}
      </span>
    </div>
  )
}

// ─── Color Swatch ────────────────────────────────────────────────────────────
// Shows a colored square. Clicking opens the native color picker.

export function ColorSwatch({
  color,
  title,
  label,
  onChange,
}: {
  color: unknown
  title?: string
  label?: string
  onChange: (v: string) => void
}) {
  const initial = toHex(color)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(initial)

  const update = (v: string) => {
    setValue(v)
    onChange(v)
  }

  const reset = () => {
    setValue(initial)
    onChange(initial)
  }

  return (
    <div className="relative flex flex-col items-center gap-1">
      {label && (
        <span className="text-foreground text-xs font-medium select-none">
          {label}
        </span>
      )}

      <button
        title={title}
        onClick={() => setOpen(!open)}
        className="w-6 h-6 rounded-md border border-border shadow-sm"
        style={{ background: value }}
      />

      {open && (
        <div className="absolute top-8 z-50 bg-background border border-border rounded-lg shadow-lg p-3 w-56 space-y-3">
          <HexColorPicker color={value} onChange={update} />

          <input
            value={value}
            onChange={(e) => update(e.target.value)}
            className="w-full text-xs px-2 py-1 border rounded"
          />

          <div className="flex justify-between">
            <button
              onClick={reset}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </button>

            <button
              onClick={() => setOpen(false)}
              className="text-xs font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function TextToolbar({
  styleOverride,
  onStyleOverride,
  selectedElementId,
}: {
  styleOverride: Record<string, string | number>
  onStyleOverride: (style: Record<string, string | number>) => void
  selectedElementId?: string
  collapsible?: boolean
}) {
  const updateGeneratedBrandingColor = useVideoStore(s => s.updateGeneratedBrandingColor)
  const computed = useComputedStyles(selectedElementId)

  const color = (styleOverride.color ?? computed.color) as string | undefined
  const backgroundColor = (styleOverride.backgroundColor ?? computed.backgroundColor) as string | undefined
  const fontFamily = (styleOverride.fontFamily ?? computed.fontFamily) as string | undefined
  const fontWeight = (styleOverride.fontWeight ?? computed.fontWeight) as string | number | undefined
  const letterSpacing = (styleOverride.letterSpacing ?? computed.letterSpacing) as string | undefined
  const textAlign = (styleOverride.textAlign ?? computed.textAlign) as string | undefined
  const textTransform = (styleOverride.textTransform ?? computed.textTransform) as string | undefined
  const depth = getDepthValue(styleOverride, computed)

  return (
    <div className="flex max-w-full flex-wrap items-center gap-3">
      {/* Colors – single picker with Text / Background tabs */}
      <DualColorPicker
        primaryColor={toHex(color ?? '#ffffff')}
        secondaryColor={toHex(backgroundColor ?? 'transparent')}
        onPrimaryColor={v => onStyleOverride({ color: v })}
        onSecondaryColor={v => onStyleOverride({ backgroundColor: v })}
        onApplyPrimaryToAllScenes={v => updateGeneratedBrandingColor(BrandAssetPriority.TEXT_PRIMARY, v)}
        primaryLabel="Text"
        secondaryLabel="Background"
      />

      {/* Font */}
      <LabeledField label="Font">
        <FontSelector
          value={fontFamily ?? ''}
          onChange={v => onStyleOverride({ fontFamily: v })}
        />
      </LabeledField>

      {/* Weight */}
      <LabeledField label="Weight">
        <SelectInput
          value={String(fontWeight ?? '400')}
          options={FONT_WEIGHT_OPTIONS}
          onChange={v => onStyleOverride({ fontWeight: parseInt(v) })}
          width="w-24"
        />
      </LabeledField>

      {/* Spacing */}
      <LabeledField label="Spacing">
        <SelectInput
          value={String(letterSpacing ?? '0em')}
          options={LETTER_SPACING_OPTIONS}
          onChange={v => onStyleOverride({ letterSpacing: v })}
          width="w-20"
        />
      </LabeledField>

      {/* Align */}
      <LabeledField label="Align">
        <SelectInput
          value={String(textAlign ?? 'left')}
          options={TEXT_ALIGN_OPTIONS}
          onChange={v => onStyleOverride({ textAlign: v })}
          width="w-20"
        />
      </LabeledField>

      <LabeledField label="Case">
        <SelectInput
          value={String(textTransform ?? 'none')}
          options={TEXT_TRANSFORM_OPTIONS}
          onChange={v => onStyleOverride({ textTransform: v })}
          width="w-28"
        />
      </LabeledField>

      <LabeledField label="Depth">
        <SliderInput
          value={depth}
          onChange={value => onStyleOverride({
            [DEPTH_STYLE_PROPERTY]: value,
            boxShadow: 'none',
            textShadow: buildDepthTextShadow(value),
          })}
          min={0}
          max={MAX_ELEMENT_DEPTH}
          step={1}
          width="w-24"
        />
      </LabeledField>
    </div>
  )
}

// ─── Labeled Field ──────────────────────────────────────────────────────────
// Wraps a control with a small top-aligned label so users know what each dropdown is.

export function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-medium select-none">
        {label}
      </span>
      {children}
    </div>
  )
}
