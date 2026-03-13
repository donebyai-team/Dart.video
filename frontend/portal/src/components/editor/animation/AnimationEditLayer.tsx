/**
 * AnimationEditLayer
 *
 * Portal-based overlay (position:fixed) over the Remotion canvas.
 *
 * Responsibilities:
 *  - Intercept pointer events on the canvas to select primitive elements.
 *  - Show a dashed selection highlight around the selected element.
 *  - Show the context-sensitive AnimationToolbar above the player.
 *
 * Selection works by walking up the DOM from the click target to find
 * the nearest element with an `id` attribute that matches a registered primitive
 * (e.g. "fadein-0", "text-1", "counter-0").
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimationToolbar } from './AnimationToolbar'
import type { PrimitiveElement, PatchOverlay } from '@coasterai/renderer'

interface FRect { left: number; top: number; width: number; height: number }

interface AnimationEditLayerProps {
  playerRef: React.RefObject<HTMLDivElement>
  selectedEid: string | null
  registry: Record<string, PrimitiveElement>
  editOverlay: PatchOverlay
  animEditVersion?: number
  compositionScale: number
  onSelectElement: (eid: string | null) => void
  onValuePatch: (id: string, prop: string, value: unknown) => void
  onValuePatches: (id: string, values: Record<string, unknown>) => void
  onStyleOverride: (id: string, style: Record<string, string | number>) => void
}

export function AnimationEditLayer({
  playerRef,
  selectedEid,
  registry,
  editOverlay,
  animEditVersion,
  compositionScale,
  onSelectElement,
  onValuePatch,
  onValuePatches,
  onStyleOverride,
}: AnimationEditLayerProps) {
  const toolbarRef = useRef<HTMLDivElement>(null)

  const [canvasRect, setCanvasRect] = useState<FRect | null>(null)
  const [elementRect, setElementRect] = useState<FRect | null>(null)
  const [hoverCursor, setHoverCursor] = useState<'default' | 'pointer'>('default')

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
      const el = playerRef.current?.querySelector(`[id="${selectedEid}"]`) as HTMLElement | null
      if (!el) return
      const r = el.getBoundingClientRect()
      setElementRect({ left: r.left, top: r.top, width: r.width, height: r.height })
    })
  }, [animEditVersion, selectedEid, playerRef])

  // ── Clear state when deselected ─────────────────────────────────────────────
  useEffect(() => {
    if (!selectedEid) setElementRect(null)
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
      onSelectElement(null)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [selectedEid, canvasRect, onSelectElement])

  // ── Hit testing ─────────────────────────────────────────────────────────────

  /** Layout primitives have no editable props — skip them during selection. */
  const LAYOUT_COMPONENTS = new Set(['SafeArea', 'Stack', 'Row', 'AbsoluteCenter'])

  function isSelectableEntry(entry: PrimitiveElement): boolean {
    return !LAYOUT_COMPONENTS.has(entry.componentName)
  }

  /**
   * Find all primitive elements at the cursor position, ordered from
   * deepest (closest to click target) to shallowest (closest to root).
   */
  function primitiveStackAtPoint(
    clientX: number,
    clientY: number,
    overlay: HTMLElement,
  ): { id: string; el: HTMLElement }[] {
    overlay.style.pointerEvents = 'none'
    const topEl = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    overlay.style.pointerEvents = 'auto'

    const cRect = overlay.getBoundingClientRect()
    const hits: { id: string; el: HTMLElement }[] = []

    // Walk up DOM from hit element, collecting all registered primitives
    let walkEl = topEl
    while (walkEl && walkEl !== overlay) {
      const elId = walkEl.getAttribute('id')
      if (elId && registry[elId]) {
        const r = walkEl.getBoundingClientRect()
        // Don't include full-canvas elements
        const coversCanvas = r.width > cRect.width * 0.9 && r.height > cRect.height * 0.9
        if (coversCanvas) break

        const entry = registry[elId]
        if (entry && isSelectableEntry(entry)) {
          hits.push({ id: elId, el: walkEl })
        }
      }
      walkEl = walkEl.parentElement
    }

    return hits
  }

  const deselect = useCallback(() => {
    onSelectElement(null)
  }, [onSelectElement])

  /**
   * Click handler with parent-walk behavior:
   *   - First click: select deepest primitive at cursor.
   *   - Click again on already-selected element: walk up to parent primitive.
   *   - If already at the topmost, deselect.
   * This mirrors standard design tool behavior (Figma, Sketch).
   */
  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    const hits = primitiveStackAtPoint(e.clientX, e.clientY, e.currentTarget)
    if (hits.length === 0) { deselect(); return }

    // If nothing is selected, select the deepest
    if (!selectedEid) {
      const hit = hits[0]
      const r = hit.el.getBoundingClientRect()
      setElementRect({ left: r.left, top: r.top, width: r.width, height: r.height })
      onSelectElement(hit.id)
      return
    }

    // If clicking on the currently selected element, walk up to parent
    const currentIdx = hits.findIndex(h => h.id === selectedEid)
    if (currentIdx !== -1 && currentIdx < hits.length - 1) {
      // Select the next parent in the stack
      const parent = hits[currentIdx + 1]
      const r = parent.el.getBoundingClientRect()
      setElementRect({ left: r.left, top: r.top, width: r.width, height: r.height })
      onSelectElement(parent.id)
      return
    }

    if (currentIdx === hits.length - 1) {
      // Already at topmost — deselect
      deselect()
      return
    }

    // Clicking on a different element — select deepest
    const hit = hits[0]
    const r = hit.el.getBoundingClientRect()
    setElementRect({ left: r.left, top: r.top, width: r.width, height: r.height })
    onSelectElement(hit.id)
  }

  if (!canvasRect) return null

  const selectedEntry = selectedEid ? registry[selectedEid] : null

  return createPortal(
    <>
      {/* Click capture — covers entire canvas */}
      <div
        style={{
          position: 'fixed',
          left: canvasRect.left,
          top: canvasRect.top,
          width: canvasRect.width,
          height: canvasRect.height,
          zIndex: 40,
          cursor: hoverCursor,
        }}
        onClick={handleCanvasClick}
        onMouseMove={(e: React.MouseEvent<HTMLDivElement>) => {
          const hits = primitiveStackAtPoint(e.clientX, e.clientY, e.currentTarget)
          setHoverCursor(hits.length > 0 ? 'pointer' : 'default')
        }}
        onMouseLeave={() => setHoverCursor('default')}
      />

      {/* Selection highlight */}
      {elementRect && (
        <div
          style={{
            position: 'fixed',
            left: elementRect.left - 2,
            top: elementRect.top - 2,
            width: elementRect.width + 4,
            height: elementRect.height + 4,
            border: '2px dashed rgba(99,102,241,0.8)',
            borderRadius: 3,
            boxSizing: 'border-box',
            pointerEvents: 'none',
            zIndex: 41,
          }}
        />
      )}

      {/* Toolbar */}
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
            selectedId={selectedEid}
            registry={registry}
            editOverlay={editOverlay}
            onValuePatch={onValuePatch}
            onValuePatches={onValuePatches}
            onStyleOverride={onStyleOverride}
            onDeselect={deselect}
          />
        </div>
      )}
    </>,
    document.body
  )
}
