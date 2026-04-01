/**
 * CounterToolbar
 *
 * Shown for: Counter
 *
 * Controls:
 *  - From value (number stepper)
 *  - To value (number stepper)
 *  - Prefix (text input)
 *  - Suffix (text input)
 */

import React from 'react'
import { Hash } from 'lucide-react'
import type { ToolbarProps } from './types'
import { NumberStepper, Sep } from './TextToolbar'

export function CounterToolbar({
  currentProps,
  onValuePatch,
}: ToolbarProps) {
  const from = Number(currentProps.from ?? 0)
  const to = Number(currentProps.to ?? 100)
  const prefix = String(currentProps.prefix ?? '')
  const suffix = String(currentProps.suffix ?? '')

  return (
    <>
      <Hash size={13} className="text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground shrink-0">From</span>
      <NumberStepper
        value={from}
        onChange={v => onValuePatch('from', v)}
        step={1}
        inputWidth="w-14"
      />
      <span className="text-xs text-muted-foreground shrink-0">to</span>
      <NumberStepper
        value={to}
        onChange={v => onValuePatch('to', v)}
        step={1}
        inputWidth="w-14"
      />

      {/* Prefix / Suffix */}
      <Sep />
      <input
        type="text"
        value={prefix}
        onChange={e => onValuePatch('prefix', e.target.value || undefined)}
        placeholder="Prefix"
        title="Prefix"
        className="h-7 w-14 px-1.5 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
      />
      <input
        type="text"
        value={suffix}
        onChange={e => onValuePatch('suffix', e.target.value || undefined)}
        placeholder="Suffix"
        title="Suffix"
        className="h-7 w-14 px-1.5 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
      />
    </>
  )
}
