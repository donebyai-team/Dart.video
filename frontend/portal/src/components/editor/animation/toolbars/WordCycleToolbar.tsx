/**
 * WordCycleToolbar
 *
 * Shown for: WordCycle
 *
 * Controls:
 *  - Editable word chips (click × to remove)
 *  - Input + add button to append new words
 *  - Transition type dropdown
 */

import React, { useState } from 'react'
import { X, Plus } from 'lucide-react'
import type { ToolbarProps } from './types'
import { Sep, SelectInput } from './TextToolbar'

const TRANSITION_OPTIONS = [
  { label: 'Fade Swap', value: 'fadeSwap' },
  { label: 'Slide Up', value: 'slideUp' },
  { label: 'Flip Y', value: 'flipY' },
]

export function WordCycleToolbar({
  currentProps,
  onValuePatch,
}: ToolbarProps) {
  const words: string[] = Array.isArray(currentProps.words) ? currentProps.words as string[] : []
  const transition = String(currentProps.transition ?? 'fadeSwap')
  const [draft, setDraft] = useState('')

  function removeWord(i: number) {
    onValuePatch('words', words.filter((_: string, idx: number) => idx !== i))
  }

  function addWord() {
    const w = draft.trim()
    if (!w) return
    onValuePatch('words', [...words, w])
    setDraft('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') addWord()
  }

  return (
    <>
      {/* Word chips */}
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

      {/* Add word input */}
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

      <Sep />

      {/* Transition type */}
      <SelectInput
        value={transition}
        options={TRANSITION_OPTIONS}
        onChange={v => onValuePatch('transition', v)}
        width="w-24"
      />
    </>
  )
}
