/**
 * WordCycleToolbar
 *
 * Shown when registry[eid].textType === 'word-cycle'.
 *
 * Controls:
 *  - Editable word chips (click × to remove)
 *  - Input + add button to append new words
 */

import React, { useState } from 'react'
import { X, Plus } from 'lucide-react'
import type { RegistryEntry } from '@coasterai/renderer'
import type { ElementEdit } from '@coasterai/renderer/src/types/ast'

interface WordCycleToolbarProps {
  eid: string       // registry key — for entry lookup only
  editEid?: string  // DOM eid — for onEdit and editStore reads (defaults to eid)
  registry: Record<string, RegistryEntry>
  editStore: Record<string, ElementEdit>
  onEdit: (eid: string, patch: Partial<ElementEdit>) => void
}

export function WordCycleToolbar({ eid, editEid, registry, editStore, onEdit }: WordCycleToolbarProps) {
  const entry = registry[eid]
  if (!entry) return null

  const eeid  = editEid ?? eid
  const words: string[] = editStore[eeid]?.words ?? entry.words ?? []
  const [draft, setDraft] = useState('')

  function removeWord(i: number) {
    console.log('[WordCycleToolbar] removeWord', { eeid, i })
    onEdit(eeid, { words: words.filter((_: string, idx: number) => idx !== i) })
  }

  function addWord() {
    const w = draft.trim()
    if (!w) return
    console.log('[WordCycleToolbar] addWord', { eeid, w })
    onEdit(eeid, { words: [...words, w] })
    setDraft('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') addWord()
  }

  return (
    <>
      {/* ── Word chips ──────────────────────────────────────────────────── */}
      {words.map((w: string, i: number) => (
        <span
          key={i}
          className="flex items-center gap-0.5 h-6 px-2 rounded-full bg-muted border border-border text-xs text-foreground/80 shrink-0"
        >
          {w}
          <button
            onClick={() => removeWord(i)}
            className="ml-1 hover:text-foreground text-foreground/50 transition-colors"
            title="Remove word"
          >
            <X size={10} />
          </button>
        </span>
      ))}

      {/* ── Add word input ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add word…"
          className="h-7 w-24 px-2 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
        />
        <button
          onClick={addWord}
          disabled={!draft.trim()}
          title="Add word"
          className="h-7 w-7 flex items-center justify-center rounded-md border border-border bg-muted hover:bg-accent disabled:opacity-40 transition-colors"
        >
          <Plus size={12} />
        </button>
      </div>
    </>
  )
}
