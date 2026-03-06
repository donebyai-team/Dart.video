/**
 * AnimationEditLayer
 *
 * Portal-based overlay (position:fixed) over the Remotion canvas.
 *
 * Responsibilities:
 *  - Intercept pointer events on the canvas to select elements.
 *  - Show a dashed selection highlight around the selected element.
 *  - For text elements: immediately activate inline editing on click.
 *  - Show the context-sensitive AnimationToolbar above the player.
 *
 * Coordinate system: all positions are in fixed viewport coordinates.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimationToolbar } from './AnimationToolbar'
import type { RegistryEntry } from '@coasterai/renderer'
import { TextEditOverlay } from './TextEditOverlay'
import { ElementEdit } from '@coasterai/renderer/src/types/ast'

interface FRect { left: number; top: number; width: number; height: number }

interface AnimationEditLayerProps {
  playerRef: React.RefObject<HTMLDivElement>
  selectedEid: string | null
  registry: Record<string, RegistryEntry>
  editStore: Record<string, ElementEdit>
  animEditVersion?: number
  onSelectElement: (eid: string | null) => void
  onEdit: (eid: string, patch: Partial<ElementEdit>) => void
  onTextCommit?: () => void
}

export function AnimationEditLayer({
  playerRef,
  selectedEid,
  registry,
  editStore,
  animEditVersion,
  onSelectElement,
  onEdit,
  onTextCommit,
}: AnimationEditLayerProps) {
  const toolbarRef = useRef<HTMLDivElement>(null)
  // Tracks the actual DOM data-eid (may include loop index, e.g. "el-11-1")
  // separately from the registry key (e.g. "el-11") stored in selectedEid.
  const domEidRef = useRef<string | null>(null)

  const [canvasRect, setCanvasRect] = useState<FRect | null>(null)
  const [elementRect, setElementRect] = useState<FRect | null>(null)
  const [isInlineEditing, setIsInlineEditing] = useState(false)
  const [editorHeight, setEditorHeight] = useState(0)
  const inlineInitTextRef = useRef('')

  // ── Track canvas fixed position ─────────────────────────────────────────────
  useEffect(() => {
    if (!playerRef.current) return
    const update = () => {
      if (!playerRef.current) return
      const r = playerRef.current.getBoundingClientRect()
      setCanvasRect({ left: r.left, top: r.top, width: r.width, height: r.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(playerRef.current)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [playerRef])

  // ── Recompute element rect after edits ──────────────────────────────────────
  useEffect(() => {
    if (!selectedEid || !animEditVersion) return
    requestAnimationFrame(() => {
      const queryEid = domEidRef.current ?? selectedEid
      const el = playerRef.current?.querySelector(`[data-eid="${queryEid}"]`) as HTMLElement | null
      if (!el) return
      const r = el.getBoundingClientRect()
      setElementRect({ left: r.left, top: r.top, width: r.width, height: r.height })
    })
  }, [animEditVersion, selectedEid, playerRef])

  // ── Clear state when deselected ─────────────────────────────────────────────
  useEffect(() => {
    if (!selectedEid) {
      setElementRect(null)
      setIsInlineEditing(false)
      domEidRef.current = null
    }
  }, [selectedEid])

  // ── Click-outside to deselect ───────────────────────────────────────────────
  useEffect(() => {
    if (!selectedEid) return
    const handleMouseDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (toolbarRef.current?.contains(t)) return
      if (canvasRect) {
        const { left, top, width, height } = canvasRect
        const { clientX: x, clientY: y } = e
        if (x >= left && x <= left + width && y >= top && y <= top + height) return
      }
      console.log('[AnimationEditLayer] Click outside — deselecting')
      onSelectElement(null)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [selectedEid, canvasRect, onSelectElement])

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Resolves the registry key for a DOM eid.
   * Loop items bake the index into the DOM eid ("el-11-1") but the registry
   * stores only the base key ("el-11"). Strips the trailing numeric suffix.
   * This handles:
   * el-9-2    → strips to el-9   → registry["el-9"] exists  → returns "el-9"  ✓
   *  el-11-0   → strips to el-11  → registry["el-11"] exists → returns "el-11" ✓
   *  el-12     → strips to el     → registry["el"] undefined
          → strips to ""     → loop ends
          → returns "el-12"  ✓  (exact match was already checked)
      el-9-0-1  → strips to el-9-0 → not found
          → strips to el-9   → found  ✓
   */
  function resolveRegistryKey(domEid: string): string {
    // Exact match first
    if (registry[domEid]) return domEid

    // Strip trailing -N suffixes one at a time until we find a registry entry
    // el-9-2   → el-9   → check
    // el-11-0  → el-11  → check
    let current = domEid
    while (current.includes('-')) {
      const stripped = current.replace(/-\d+$/, '')
      if (stripped === current) break          // no numeric suffix found — stop
      if (registry[stripped]) return stripped  // found a match
      current = stripped
    }

    // Nothing found — return original and let caller handle missing registry entry
    return domEid
  }



  /**
   * Returns true if the registry entry has at least one editable control.
   * Mirrors the routing logic in AnimationToolbar / sub-toolbars.
   */
  function hasEditableControls(entry: RegistryEntry): boolean {
    // Text types
    if (entry.textType === 'static') return true
    if (entry.textType === 'counter') return true
    if (entry.textType === 'typewriter') return true
    if (entry.textType === 'word-cycle') return true

    // Asset types
    if (entry.assetType === 'image') return true
    if (entry.assetType === 'icon') return true

    // Any editable style prop
    if (Object.values(entry.editableProps ?? {}).some((def: any) => def.editable)) {
      return true
    }

    // Any animated prop (range or spring editor)
    if (Object.keys(entry.animatedProps ?? {}).length > 0) return true

    return false
  }

  /**
   * Find the best clickable element at the cursor position.
   *
   * Pass 1 — DOM walk-up from the topmost hit element.
   *   Handles overflow:visible text whose bounding box is tiny (e.g. a 4px div
   *   whose text visually overflows). The click lands on a child or even outside
   *   the parent's box, but walking up the DOM tree finds the owning data-eid.
   *
   * Pass 2 — z-stack scan via elementsFromPoint.
   *   Handles non-editable elements sitting on top of editable ones (e.g. a
   *   decorative 4x4 img). If pass 1 finds a data-eid with no editable controls,
   *   we fall through and keep searching deeper in the stack.
   */
function eidAtPoint(
  clientX: number,
  clientY: number,
  overlay: HTMLElement,
): { eid: string; registryKey: string; el: HTMLElement } | null {
  overlay.style.pointerEvents = 'none'
  const topEl       = document.elementFromPoint(clientX, clientY) as HTMLElement | null
  const allElements = document.elementsFromPoint(clientX, clientY) as HTMLElement[]
  overlay.style.pointerEvents = 'auto'

  const cRect = overlay.getBoundingClientRect()

  // ── Pass 1: walk up the DOM from the hit element ─────────────────────────
  let walkEl = topEl
  while (walkEl && walkEl !== overlay) {
    if (walkEl.dataset?.eid) {
      const r = walkEl.getBoundingClientRect()

      // Same canvas size check as Pass 2 — don't select full-canvas elements
      const coversCanvas =
        r.width  > cRect.width  * 0.9 &&
        r.height > cRect.height * 0.9

      if (coversCanvas) {
        console.log(`[eidAtPoint] pass1 skipping eid=${walkEl.dataset.eid} (full canvas)`)
        break   // stop walking — fall through to Pass 2
      }

      const registryKey = resolveRegistryKey(walkEl.dataset.eid)
      const entry       = registry[registryKey]

      if (entry && hasEditableControls(entry)) {
        console.log(`[eidAtPoint] pass1 hit eid=${walkEl.dataset.eid} key=${registryKey}`)
        return { eid: walkEl.dataset.eid, registryKey, el: walkEl }
      }

      // Has data-eid but no editable controls — stop walking, try pass 2
      console.log(`[eidAtPoint] pass1 skipping eid=${walkEl.dataset.eid} (no controls), trying pass2`)
      break
    }
    walkEl = walkEl.parentElement
  }

  // ── Pass 2: z-stack scan ──────────────────────────────────────────────────
  for (const el of allElements) {
    if (!el.dataset?.eid) continue
    if (el === overlay) continue

    const r = el.getBoundingClientRect()
    const coversCanvas =
      r.width  > cRect.width  * 0.9 &&
      r.height > cRect.height * 0.9
    if (coversCanvas) continue

    const registryKey = resolveRegistryKey(el.dataset.eid)
    const entry       = registry[registryKey]
    if (!entry || !hasEditableControls(entry)) continue

    console.log(`[eidAtPoint] pass2 hit eid=${el.dataset.eid} key=${registryKey}`)
    return { eid: el.dataset.eid, registryKey, el }
  }

  console.log('  → no valid eid found')
  return null
}

  const deselect = useCallback(() => {
    console.log('[AnimationEditLayer] Deselecting')
    onSelectElement(null)
  }, [onSelectElement])

  /**
   * Click handler:
   *  - Selects the element and draws the highlight rectangle.
   *  - For static-text elements: immediately activates inline editing.
   */
  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    const hit = eidAtPoint(e.clientX, e.clientY, e.currentTarget)
    if (!hit) { deselect(); return }

    const { eid: domEid, registryKey, el } = hit
    const entry = registry[registryKey]
    if (!entry) { deselect(); return }

    domEidRef.current = domEid  // store actual DOM eid for future querySelectorAll

    console.log('[AnimationEditLayer] Click — selecting element:', registryKey, entry.label)

    const r = el.getBoundingClientRect()
    setElementRect({ left: r.left, top: r.top, width: r.width, height: r.height })
    onSelectElement(registryKey)

    // Immediately open inline editor for text elements
    if (entry.textType === 'static') {
      console.log('[AnimationEditLayer] Text element — activating inline edit')
      inlineInitTextRef.current = editStore[registryKey]?.text ?? entry.staticText ?? ''
      setIsInlineEditing(false)
      setTimeout(() => setIsInlineEditing(true), 0)
    } else {
      setIsInlineEditing(false)
    }
  }

  const handleTextCommit = useCallback((text: string, _height: number) => {
    // Only persist if text actually changed — avoids spurious saves on click-without-edit
    const originalText = inlineInitTextRef.current
    if (selectedEid && text && text !== originalText) {
      console.log('[AnimationEditLayer] Text changed — saving:', { from: originalText, to: text })
      onEdit(selectedEid, { text })
    } else {
      console.log('[AnimationEditLayer] Text unchanged — skipping save')
    }
    setIsInlineEditing(false)
    setEditorHeight(0)
    onTextCommit?.()
  }, [selectedEid, onEdit, onTextCommit])

  const handleEditorHeightChange = useCallback((h: number) => {
    setEditorHeight(h)
  }, [])

  if (!canvasRect) return null

  const selectedEntry = selectedEid ? registry[selectedEid] : null

  return createPortal(
    <>
      {/* ── Click capture — always covers entire canvas ───────────────── */}
      {/* TextEditOverlay sits at z:9999 so clicks on the text editor go  */}
      {/* directly to it; clicks elsewhere on the canvas hit this overlay. */}
      <div
        style={{
          position: 'fixed',
          left: canvasRect.left,
          top: canvasRect.top,
          width: canvasRect.width,
          height: canvasRect.height,
          zIndex: 40,
          cursor: 'default',
        }}
        onClick={handleCanvasClick}
      />

      {/* ── Selection highlight ───────────────────────────────────────── */}
      {elementRect && (
        <div
          style={{
            position: 'fixed',
            left: elementRect.left - 2,
            top: elementRect.top - 2,
            width: elementRect.width + 4,
            height: (isInlineEditing && editorHeight > 0 ? editorHeight : elementRect.height) + 4,
            border: '2px dashed rgba(99,102,241,0.8)',
            borderRadius: 3,
            boxSizing: 'border-box',
            pointerEvents: 'none',
            zIndex: 41,
          }}
        />
      )}

      {/* ── Inline text editor ────────────────────────────────────────── */}
      {isInlineEditing && elementRect && selectedEid && (
        <TextEditOverlay
          elementRect={elementRect}
          selectedEid={domEidRef.current ?? selectedEid}
          playerRef={playerRef}
          initText={inlineInitTextRef.current}
          onCommit={handleTextCommit}
          onCancel={() => {
            console.log('[AnimationEditLayer] Inline edit cancelled')
            setIsInlineEditing(false)
            setEditorHeight(0)
          }}
          onHeightChange={handleEditorHeightChange}
        />
      )}

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      {selectedEid && selectedEntry && (
        <div
          ref={toolbarRef}
          style={{
            position: 'fixed',
            top: canvasRect.top + 8,
            left: canvasRect.left + canvasRect.width / 2,
            transform: 'translateX(-50%)',
            zIndex: 50,
          }}
        >
          <AnimationToolbar
            selectedEid={selectedEid}
            registry={registry}
            editStore={editStore}
            onEdit={onEdit}
            onDeselect={deselect}
          />
        </div>
      )}
    </>,
    document.body
  )
}
