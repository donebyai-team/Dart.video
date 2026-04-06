/**
 * AnimationEditLayer
 *
 * Portal-based overlay over the Remotion canvas.
 * Selects elements by walking up the DOM to find the nearest element
 * with an `id` attribute, then routes to the appropriate toolbar.
 *
 * Element types determined by ID prefix:
 *   "fadein-0"  → primitive (full toolbar from COMPONENT_REGISTRY)
 *   "el-0"      → raw HTML (style-only toolbar)
 *   "custom-0"  → custom component (style-only toolbar)
 *   no id       → not selectable (layout primitives)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimationToolbar } from './AnimationToolbar'
import { usePrimitiveDrag } from './usePrimitiveDrag'
import {
  resolveComponentFromId,
  getElementTypeFromId,
  type PatchOverlay,
} from '@coasterai/renderer'

interface FRect { left: number; top: number; width: number; height: number }

interface AnimationEditLayerProps {
  playerRef: React.RefObject<HTMLDivElement>
  selectedEid: string | null
  overlay: PatchOverlay
  animEditVersion?: number
  onSelectElement: (eid: string | null) => void
  onValuePatch: (id: string, prop: string, value: unknown) => void
  onStyleOverride: (id: string, style: Record<string, string | number>) => void
}

export function AnimationEditLayer({
  playerRef,
  selectedEid,
  overlay,
  animEditVersion,
  onSelectElement,
  onValuePatch,
  onStyleOverride,
}: AnimationEditLayerProps) {
  const toolbarRef = useRef<HTMLDivElement>(null)

  const [canvasRect, setCanvasRect] = useState<FRect | null>(null)
  const [elementRect, setElementRect] = useState<FRect | null>(null)
  const toolbarOffset = 12
  const estimatedToolbarHeight = 48

  function supportsToolbar(id: string): boolean {
    const lowerId = id.toLowerCase()
    return lowerId.includes('text') || 
    lowerId.includes('icon') || 
    lowerId.includes('counter') ||
    lowerId.includes('typewriter') ||
    lowerId.includes('image') ||
    lowerId.includes('video')
  }

  // ── Track canvas position ─────────────────────────────────────────────────
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

  // ── Recompute element rect after edits ────────────────────────────────────
  useEffect(() => {
    if (!selectedEid || !animEditVersion) return
    if (dragStateRef.current?.elementId === selectedEid) return
    requestAnimationFrame(() => {
      const el = playerRef.current?.querySelector(`[id="${selectedEid}"]`) as HTMLElement | null
      if (!el) return
      const r = el.getBoundingClientRect()
      setElementRect({ left: r.left, top: r.top, width: r.width, height: r.height })
    })
  }, [animEditVersion, selectedEid, playerRef])

  useEffect(() => {
    if (!selectedEid) setElementRect(null)
  }, [selectedEid])

  // ── Hit testing ───────────────────────────────────────────────────────────

  /** Check if an element ID is selectable (has a toolbar). */
  function isSelectable(id: string): boolean {
    const elType = getElementTypeFromId(id)
    if (elType === 'html' || elType === 'custom') return true
    // Primitive — selectable unless it resolved to nothing (shouldn't happen)
    return resolveComponentFromId(id) !== null
  }

  /**
   * Collect all selectable elements at the cursor, deepest first.
   * Used for click-to-select and parent-walk-on-reclick.
   */
  function selectableStackAtPoint(
    clientX: number,
    clientY: number,
    overlayEl: HTMLElement,
  ): { id: string; el: HTMLElement }[] {
    overlayEl.style.pointerEvents = 'none'
    const topEl = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    overlayEl.style.pointerEvents = 'auto'

    const cRect = overlayEl.getBoundingClientRect()
    const hits: { id: string; el: HTMLElement }[] = []

    let walkEl = topEl
    while (walkEl && walkEl !== overlayEl) {
      const elId = walkEl.getAttribute('id')
      if (elId && isSelectable(elId)) {
        const r = walkEl.getBoundingClientRect()
        if (r.width > cRect.width * 0.9 && r.height > cRect.height * 0.9) break
        hits.push({ id: elId, el: walkEl })
      }
      walkEl = walkEl.parentElement
    }

    return hits
  }

  const {
    dragStateRef,
    suppressClickRef,
    pointerSelectedIdRef,
    hoverCursor,
    setHoverCursor,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
  } = usePrimitiveDrag({
    playerRef,
    overlay,
    selectedEid,
    onSelectElement,
    onValuePatch,
    setElementRect: rect => setElementRect({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    }),
    selectableStackAtPoint,
  })

  const deselect = useCallback(() => onSelectElement(null), [onSelectElement])

  /**
   * Click handler with parent-walk:
   *   - First click: select deepest element.
   *   - Click again on selected: walk up to parent.
   *   - At topmost: deselect.
   */
  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }

    if (pointerSelectedIdRef.current) {
      pointerSelectedIdRef.current = null
      return
    }

    const hits = selectableStackAtPoint(e.clientX, e.clientY, e.currentTarget)
    if (hits.length === 0) { deselect(); return }

    if (!selectedEid) {
      const hit = hits[0]
      setElementRect(hit.el.getBoundingClientRect())
      onSelectElement(hit.id)
      return
    }
    const idx = hits.findIndex(h => h.id === selectedEid)
    if (idx !== -1 && idx < hits.length - 1) {
      const parent = hits[idx + 1]
      setElementRect(parent.el.getBoundingClientRect())
      onSelectElement(parent.id)
      return
    }

    if (idx === hits.length - 1) { deselect(); return }

    const hit = hits[0]
    setElementRect(hit.el.getBoundingClientRect())
    onSelectElement(hit.id)
  }

  if (!canvasRect) return null

  return createPortal(
    <>
      {/* Click capture */}
      <div
        style={{
          position: 'fixed',
          left: canvasRect.left,
          top: canvasRect.top,
          width: canvasRect.width,
          height: canvasRect.height,
          zIndex: 40,
          cursor: dragStateRef.current ? 'grabbing' : selectedEid ? 'grab' : hoverCursor,
        }}
        onClick={handleCanvasClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onMouseLeave={() => setHoverCursor('default')}
      />

      {/* Selection highlight */}
      {elementRect && selectedEid && (
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
      {selectedEid && supportsToolbar(selectedEid) && (
        <div
          ref={toolbarRef}
          style={{
            position: 'fixed',
            top:
              canvasRect.top > estimatedToolbarHeight + toolbarOffset
                ? canvasRect.top - estimatedToolbarHeight - toolbarOffset
                : canvasRect.top + toolbarOffset,
            left: canvasRect.left + canvasRect.width / 2,
            transform: 'translateX(-50%)',
            zIndex: 50,
          }}
        >
          <AnimationToolbar
            selectedId={selectedEid}
            overlay={overlay}
            onValuePatch={onValuePatch}
            onStyleOverride={onStyleOverride}
            onDeselect={deselect}
          />
        </div>
      )}
    </>,
    document.body
  )
}
