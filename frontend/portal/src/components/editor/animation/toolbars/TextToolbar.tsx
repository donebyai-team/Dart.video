/**
 * TextToolbar
 *
 * Shown for: Text, Typewriter, TitleCard
 *
 * Controls:
 *  - Text content input
 *  - Variant dropdown (for Text/Typewriter)
 *  - Heading/subheading/eyebrow (for TitleCard)
 *  - Style overrides: color
 */

import React from 'react'
import type { ToolbarProps } from './types'
import { Sep, SelectInput } from './shared'

const VARIANT_OPTIONS = [
  { label: 'Caption', value: 'caption' },
  { label: 'Label', value: 'label' },
  { label: 'Body', value: 'body' },
  { label: 'Subheading', value: 'subheading' },
  { label: 'Heading', value: 'heading' },
  { label: 'Display', value: 'display' },
]

export function TextToolbar({
  componentName,
  currentProps,
  styleOverride,
  onValuePatch,
  onStyleOverride,
}: ToolbarProps) {
  // ── TitleCard ──────────────────────────────────────────────────────────
  if (componentName === 'TitleCard') {
    const heading = String(currentProps.heading ?? '')
    const subheading = String(currentProps.subheading ?? '')
    const eyebrow = String(currentProps.eyebrow ?? '')

    return (
      <>
        <input
          type="text"
          value={heading}
          onChange={e => onValuePatch('heading', e.target.value)}
          placeholder="Heading"
          title="Heading"
          className="h-7 w-36 px-2 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
        />
        <input
          type="text"
          value={subheading}
          onChange={e => onValuePatch('subheading', e.target.value || undefined)}
          placeholder="Subheading"
          title="Subheading"
          className="h-7 w-28 px-2 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
        />
        <input
          type="text"
          value={eyebrow}
          onChange={e => onValuePatch('eyebrow', e.target.value || undefined)}
          placeholder="Eyebrow"
          title="Eyebrow"
          className="h-7 w-24 px-2 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
        />
      </>
    )
  }

  // ── Text / Typewriter ──────────────────────────────────────────────────
  const isTypewriter = componentName === 'Typewriter'
  const textProp = isTypewriter ? 'text' : 'children'
  const currentText = String(currentProps[textProp] ?? '')
  const currentVariant = String(currentProps.variant ?? 'body')

  return (
    <>
      {/* Text content */}
      <input
        type="text"
        value={currentText}
        onChange={e => onValuePatch(textProp, e.target.value)}
        placeholder={isTypewriter ? 'Source text' : 'Text'}
        title={isTypewriter ? 'Source text' : 'Text'}
        className="h-7 w-28 px-2 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
      />

      <Sep />

      {/* Variant */}
      <SelectInput
        value={currentVariant}
        options={VARIANT_OPTIONS}
        onChange={v => onValuePatch('variant', v)}
        width="w-24"
      />

      {/* Typewriter mode */}
      {isTypewriter && (
        <>
          <Sep />
          <SelectInput
            value={String(currentProps.mode ?? 'char')}
            options={[
              { label: 'Char', value: 'char' },
              { label: 'Word', value: 'word' },
              { label: 'Line', value: 'line' },
            ]}
            onChange={v => onValuePatch('mode', v)}
            width="w-16"
          />
        </>
      )}
    </>
  )
}
