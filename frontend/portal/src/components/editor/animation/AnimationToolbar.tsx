/**
 * AnimationToolbar
 *
 * Router component: reads the selected element's registry entry and renders
 * the appropriate sub-toolbar (Text / Image / Icon / Layout).
 *
 * Also appends a nonEditable "prompt-hint" section if the element has
 * properties that can only be changed via the AI prompt.
 *
 * Props:
 *  - selectedEid       — currently selected element id (null = nothing selected)
 *  - registry          — full element registry from the renderer
 *  - editStore         — current edit overrides keyed by eid
 *  - onEdit            — write a patch to the edit store
 *  - onDeselect        — close selection
 */

import React from 'react'
import type { RegistryEntry } from '@coasterai/renderer'
import type { ElementEdit } from '@coasterai/renderer/src/types/ast'
import { TextToolbar }   from './toolbars/TextToolbar'
import { ImageToolbar }  from './toolbars/ImageToolbar'
import { IconToolbar }   from './toolbars/IconToolbar'
import { LayoutToolbar } from './toolbars/LayoutToolbar'
import { Sep }           from './toolbars/shared'
import { AlertTriangle, MessageSquarePlus } from 'lucide-react'

interface AnimationToolbarProps {
  selectedEid: string | null
  registry: Record<string, RegistryEntry>
  editStore: Record<string, ElementEdit>
  onEdit: (eid: string, patch: Partial<ElementEdit>) => void
  onDeselect: () => void
}

export function AnimationToolbar({
  selectedEid,
  registry,
  editStore,
  onEdit,
  onDeselect: _onDeselect,
}: AnimationToolbarProps) {
  if (!selectedEid) return null

  const entry = registry[selectedEid]
  if (!entry) {
    console.warn('[AnimationToolbar] No registry entry for eid:', selectedEid)
    return null
  }

  const isText    = entry.textType === 'static'
  const isImage   = entry.assetType === 'image'
  const isIcon    = entry.assetType === 'icon'
  const isLayout  = !isText && !isImage && !isIcon

  // Set to true to show the "Use prompt" hint for non-editable animated properties
  const SHOW_PROMPT_HINT = false

  const hasNonEditable = SHOW_PROMPT_HINT && entry.nonEditable.length > 0


  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/95 backdrop-blur-lg border border-border shadow-xl text-sm select-none">

      {/* ── Sub-toolbar for this element type ──────────────────────────── */}
      {isText && (
        <TextToolbar
          eid={selectedEid}
          registry={registry}
          editStore={editStore}
          onEdit={onEdit}
        />
      )}

      {isImage && (
        <ImageToolbar
          eid={selectedEid}
          registry={registry}
          editStore={editStore}
          onEdit={onEdit}
        />
      )}

      {isIcon && (
        <IconToolbar
          eid={selectedEid}
          registry={registry}
          editStore={editStore}
          onEdit={onEdit}
        />
      )}

      {isLayout && (
        <LayoutToolbar
          eid={selectedEid}
          registry={registry}
          editStore={editStore}
          onEdit={onEdit}
        />
      )}

      {/* ── NonEditable prompt-hint ─────────────────────────────────────── */}
      {hasNonEditable && (
        <>
          <Sep />
          <PromptHint props={entry.nonEditable} />
        </>
      )}
    </div>
  )
}

// ─── Prompt Hint ─────────────────────────────────────────────────────────────
// Lists props that are animated / non-editable, with a "Use prompt" button.

function PromptHint({ props }: { props: string[] }) {
  function handleClick() {
    // TODO: open the prompt input scoped to the selected element
    console.log('[AnimationToolbar] Prompt hint clicked — non-editable props:', props)
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <AlertTriangle size={12} className="text-yellow-400 shrink-0" />
      <span className="text-muted-foreground/80 max-w-[140px] truncate" title={props.join(', ')}>
        {props.join(' · ')}
      </span>
      <button
        onClick={handleClick}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted hover:bg-accent text-foreground/70 hover:text-foreground transition-colors"
        title="Open prompt input to edit these properties"
      >
        <MessageSquarePlus size={11} />
        Use prompt
      </button>
    </div>
  )
}
