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

  const [canvasRect,      setCanvasRect]      = useState<FRect | null>(null)
  const [elementRect,     setElementRect]     = useState<FRect | null>(null)
  const [isInlineEditing, setIsInlineEditing] = useState(false)
  const [editorHeight,    setEditorHeight]    = useState(0)
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
      const el = playerRef.current?.querySelector(`[data-eid="${selectedEid}"]`) as HTMLElement | null
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
   * Returns true if the registry entry has at least one editable control to show.
   * Mirrors the routing logic in AnimationToolbar / sub-toolbars.
   */
  function hasEditableControls(entry: RegistryEntry): boolean {
    if (entry.textType === 'static') return true
    if (entry.assetType === 'image') return true
    if (entry.assetType === 'icon')  return true

    // Layout element — only show if at least one layout prop is present
    const s = entry.staticStyle
    return 'background' in s || 'backgroundColor' in s ||
           'borderRadius' in s || 'opacity' in s
  }

  /** Punch through the overlay to find which data-eid element is under the cursor. */
  function eidAtPoint(
    clientX: number,
    clientY: number,
    overlay: HTMLElement,
  ): { eid: string; el: HTMLElement } | null {
    overlay.style.pointerEvents = 'none'
    const hit = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    overlay.style.pointerEvents = 'auto'
    let el = hit
    while (el) {
      if (el.dataset?.eid) {
        console.log('[AnimationEditLayer] eidAtPoint hit:', el.dataset.eid, el.tagName)
        return { eid: el.dataset.eid, el }
      }
      el = el.parentElement
    }
    console.log('[AnimationEditLayer] eidAtPoint — no data-eid found under cursor')
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

    const { eid, el } = hit
    const entry = registry[eid]
    if (!entry) { deselect(); return }

    if (!hasEditableControls(entry)) {
      console.log('[AnimationEditLayer] No controls for element — ignoring click:', eid, entry.label)
      deselect()
      return
    }

    console.log('[AnimationEditLayer] Click — selecting element:', eid, entry.label)

    const r    = el.getBoundingClientRect()
    const rect: FRect = { left: r.left, top: r.top, width: r.width, height: r.height }
    setElementRect(rect)
    onSelectElement(eid)

    // Immediately open inline editor for text elements
    if (entry.textType === 'static') {
      console.log('[AnimationEditLayer] Text element — activating inline edit')
      inlineInitTextRef.current = editStore[eid]?.text ?? entry.staticText ?? ''
      setIsInlineEditing(false)
      setTimeout(() => setIsInlineEditing(true), 0)
    } else {
      setIsInlineEditing(false)
    }
  }

  const handleTextCommit = useCallback((text: string, height: number) => {
    if (selectedEid && text) {
      onEdit(selectedEid, {
        text,
        style: height > 0 ? { height, overflow: 'visible' } : {},
      })
    }
    setIsInlineEditing(false)
    onTextCommit?.()
  }, [selectedEid, onEdit, onTextCommit])

  const handleEditorHeightChange = useCallback((h: number) => {
    setEditorHeight(h)
  }, [])

  if (!canvasRect) return null

  const selectedEntry = selectedEid ? registry[selectedEid] : null

  return createPortal(
    <>
      {/* ── Click capture — covers entire canvas ──────────────────────── */}
      {!isInlineEditing && (
        <div
          style={{
            position: 'fixed',
            left:     canvasRect.left,
            top:      canvasRect.top,
            width:    canvasRect.width,
            height:   canvasRect.height,
            zIndex:   40,
            cursor:   'default',
          }}
          onClick={handleCanvasClick}
        />
      )}

      {/* ── Selection highlight ───────────────────────────────────────── */}
      {elementRect && (
        <div
          style={{
            position:      'fixed',
            left:          elementRect.left - 2,
            top:           elementRect.top - 2,
            width:         elementRect.width + 4,
            height:        (isInlineEditing && editorHeight > 0 ? editorHeight : elementRect.height) + 4,
            border:        '2px dashed rgba(99,102,241,0.8)',
            borderRadius:  3,
            boxSizing:     'border-box',
            pointerEvents: 'none',
            zIndex:        41,
          }}
        />
      )}

      {/* ── Inline text editor ────────────────────────────────────────── */}
      {isInlineEditing && elementRect && selectedEid && (
        <TextEditOverlay
          elementRect={elementRect}
          selectedEid={selectedEid}
          playerRef={playerRef}
          initText={inlineInitTextRef.current}
          onCommit={handleTextCommit}
          onCancel={() => {
            console.log('[AnimationEditLayer] Inline edit cancelled')
            setIsInlineEditing(false)
          }}
          onHeightChange={handleEditorHeightChange}
        />
      )}

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      {selectedEid && selectedEntry && (
        <div
          ref={toolbarRef}
          style={{
            position:  'fixed',
            top:       canvasRect.top + 8,
            left:      canvasRect.left + canvasRect.width / 2,
            transform: 'translateX(-50%)',
            zIndex:    50,
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
