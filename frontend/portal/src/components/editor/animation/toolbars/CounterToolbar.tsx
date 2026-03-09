/**
 * CounterToolbar
 *
 * Shown when registry[eid].textType === 'counter'.
 *
 * Controls:
 *  - Start value (number stepper)
 *  - End value (number stepper)
 */

import React from 'react'
import { Hash } from 'lucide-react'
import type { RegistryEntry } from '@coasterai/renderer'
import type { ElementEdit } from '@coasterai/renderer/src/types/ast'
import { NumberStepper } from './shared'

interface CounterToolbarProps {
  eid: string       // registry key — for entry lookup only
  editEid?: string  // DOM eid — for onEdit and editStore reads (defaults to eid)
  registry: Record<string, RegistryEntry>
  editStore: Record<string, ElementEdit>
  onEdit: (eid: string, patch: Partial<ElementEdit>) => void
}

export function CounterToolbar({ eid, editEid, registry, editStore, onEdit }: CounterToolbarProps) {
  const entry = registry[eid]
  if (!entry) return null

  const eeid           = editEid ?? eid
  const currentCounter = editStore[eeid]?.counter ?? {}
  const start = currentCounter.start ?? entry.counterStart ?? 0
  const end   = currentCounter.end   ?? entry.counterEnd   ?? 100

  function setStart(v: number) {
    console.log('[CounterToolbar] setStart', { eeid, v })
    onEdit(eeid, { counter: { start: v, end } })
  }

  function setEnd(v: number) {
    console.log('[CounterToolbar] setEnd', { eeid, v })
    onEdit(eeid, { counter: { start, end: v } })
  }

  return (
    <>
      <Hash size={13} className="text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground shrink-0">From</span>
      <NumberStepper
        value={start}
        onChange={setStart}
        step={1}
        inputWidth="w-14"
      />
      <span className="text-xs text-muted-foreground shrink-0">to</span>
      <NumberStepper
        value={end}
        onChange={setEnd}
        step={1}
        inputWidth="w-14"
      />
    </>
  )
}
