/**
 * shared.tsx
 *
 * Shared UI primitives for the animation toolbar system.
 * All toolbar sub-components (TextToolbar, ImageToolbar, etc.) import from here.
 */

import React from 'react'
import { HexColorPicker } from 'react-colorful'
import { useState } from 'react'
import { SUPPORTED_FONTS } from '@coasterai/renderer'

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
  max = 9999,
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
  const clamp = (n: number) => Math.min(max, Math.max(min, n))

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
        max={max}
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

// ─── Dual Color Picker ──────────────────────────────────────────────────────
// Single button that opens a popover with tabs for Text and Background color.

export function DualColorPicker({
  textColor,
  bgColor,
  onTextColor,
  onBgColor,
}: {
  textColor: string
  bgColor: string
  onTextColor: (v: string) => void
  onBgColor: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'text' | 'bg'>('text')

  const activeColor = tab === 'text' ? textColor : bgColor
  const onChangeActive = tab === 'text' ? onTextColor : onBgColor

  return (
    <div className="relative flex items-center">
      {/* Color button – rainbow gradient rectangle */}
      <button
        title="Colors"
        onClick={() => setOpen(!open)}
        className="w-8 h-7 rounded-md border border-border shadow-sm cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
        }}
      />

      {open && (
        <div className="absolute top-9 left-0 z-50 bg-background border border-border rounded-lg shadow-lg p-3 w-56 space-y-3">
          {/* Tabs */}
          <div className="flex rounded-md border border-border overflow-hidden text-xs">
            <button
              onClick={() => setTab('text')}
              className={`flex-1 py-1 transition-colors ${
                tab === 'text'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Text
            </button>
            <button
              onClick={() => setTab('bg')}
              className={`flex-1 py-1 transition-colors ${
                tab === 'bg'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Background
            </button>
          </div>

          <HexColorPicker color={activeColor} onChange={onChangeActive} />

          <input
            value={activeColor}
            onChange={(e) => onChangeActive(e.target.value)}
            className="w-full text-xs px-2 py-1 border border-border rounded bg-muted"
          />

          <div className="flex justify-end">
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

// ─── Font Family Select ──────────────────────────────────────────────────────

export function FontFamilySelect({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-7 w-24 px-2 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50 cursor-pointer"
    >
      <option value="">Default</option>
      {SUPPORTED_FONTS.map(f => (
        <option key={f} value={f}>
          {f}
        </option>
      ))}
    </select>
  )
}

// ─── Style Override Section ──────────────────────────────────────────────────
// Collapsible section that shows common style controls for any visual element.
// Always available for text-related components. Collapsed by default per spec.
//
// Token values sourced from @coasterai/animation/tokens:
//   FontWeightToken: thin=100, light=300, normal=400, medium=500, semibold=600, bold=700, extrabold=800
//   LetterSpacing:   tight=-0.025em, normal=0, wide=0.025em (maps to StyleConfig.type.tracking)

/** Font weight options matching animation token FontWeightToken values. */
const FONT_WEIGHT_OPTIONS = [
  { label: 'Thin', value: '100' },
  { label: 'Light', value: '300' },
  { label: 'Normal', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'Semibold', value: '600' },
  { label: 'Bold', value: '700' },
  { label: 'Extrabold', value: '800' },
]

/** Letter spacing options matching StyleConfig.type.tracking token. */
const LETTER_SPACING_OPTIONS = [
  { label: 'Tight', value: '-0.025em' },
  { label: 'Normal', value: '0em' },
  { label: 'Wide', value: '0.025em' },
]

export function TextToolbar({
  styleOverride,
  onStyleOverride,
}: {
  styleOverride: Record<string, string | number>
  onStyleOverride: (style: Record<string, string | number>) => void
  collapsible?: boolean
}) {

  const color = styleOverride.color as string | undefined
  const backgroundColor = styleOverride.backgroundColor as string | undefined
  const fontFamily = styleOverride.fontFamily as string | undefined
  const fontWeight = styleOverride.fontWeight as string | number | undefined
  const letterSpacing = styleOverride.letterSpacing as string | undefined
  const opacity = styleOverride.opacity as number | undefined

  return (
    <div className="flex items-center gap-3 whitespace-nowrap">
      {/* Colors – single picker with Text / Background tabs */}
      <DualColorPicker
        textColor={toHex(color ?? '#ffffff')}
        bgColor={toHex(backgroundColor ?? '#000000')}
        onTextColor={v => onStyleOverride({ color: v })}
        onBgColor={v => onStyleOverride({ backgroundColor: v })}
      />

      {/* Font */}
      <LabeledField label="Font">
        <FontFamilySelect
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
    </div>
  )
}

// ─── Labeled Field ──────────────────────────────────────────────────────────
// Wraps a control with a small top-aligned label so users know what each dropdown is.

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-medium select-none">
        {label}
      </span>
      {children}
    </div>
  )
}

// ─── Utility: toHex ─────────────────────────────────────────────────────────

export function toHex(color: unknown): string {
  if (!color || typeof color !== 'string') return '#ffffff'
    const c = color.trim()
    if (c.startsWith('#')) return c.slice(0, 7)
    const m = c.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (m)
      return (
        '#' +
        [m[1], m[2], m[3]]
          .map(n => parseInt(n).toString(16).padStart(2, '0'))
          .join('')
      )
    return '#ffffff'
  }
