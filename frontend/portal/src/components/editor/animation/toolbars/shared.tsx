/**
 * shared.tsx
 *
 * Shared UI primitives for the animation toolbar system.
 * All toolbar sub-components (TextToolbar, ImageToolbar, etc.) import from here.
 */

import React from 'react'

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
// `label` is an optional text shown above the swatch (e.g. "A" for text color).

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
  const hex = toHex(color)

  return (
    <label className="relative cursor-pointer group flex flex-col items-center gap-0.5" title={title}>
      {label && (
        <span className="text-foreground text-xs font-medium leading-none select-none">
          {label}
        </span>
      )}
      {/* Color bar under label, or standalone swatch */}
      {label ? (
        <span
          className="w-5 h-1 rounded-sm block border border-border/40"
          style={{ background: hex }}
        />
      ) : (
        <span
          className="w-6 h-6 rounded-md border border-border shadow-sm block group-hover:ring-2 group-hover:ring-primary/30 transition-shadow"
          style={{ background: typeof color === 'string' ? color : '#fff' }}
        />
      )}
      <input
        type="color"
        value={hex}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
    </label>
  )
}

// ─── Font Family Select ──────────────────────────────────────────────────────

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Oswald',
  'Raleway',
  'Source Sans Pro',
  'Nunito',
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
]

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
      className="h-7 w-32 px-2 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50 cursor-pointer"
    >
      {FONT_OPTIONS.map(f => (
        <option key={f} value={f}>
          {f}
        </option>
      ))}
    </select>
  )
}

// ─── Low Confidence Indicator ─────────────────────────────────────────────────
// Shown as a small warning dot on a control when confidence is "low".

export function LowConfidenceDot() {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 align-super ml-0.5"
      title='Value may not reflect the original — came from a spread or conditional expression'
    />
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
