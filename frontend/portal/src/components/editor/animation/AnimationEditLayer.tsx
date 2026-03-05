/**
 * AnimationEditLayer
 *
 * Portal-based overlay (position:fixed) over the Remotion canvas.
 * Coordinates element selection, the selection highlight, inline text editing,
 * and the floating toolbar.
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
      onSelectElement(null)
      setIsInlineEditing(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [selectedEid, canvasRect, onSelectElement])

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function eidAtPoint(clientX: number, clientY: number, overlay: HTMLElement): { eid: string; el: HTMLElement } | null {
    overlay.style.pointerEvents = 'none'
    const hit = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    overlay.style.pointerEvents = 'auto'
    let el = hit
    while (el) {
      if (el.dataset?.eid) return { eid: el.dataset.eid, el }
      el = el.parentElement
    }
    return null
  }

  function deselect() {
    onSelectElement(null)
    setIsInlineEditing(false)
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
      {/* ── Click capture — covers entire canvas ──────────────────────────── */}
      {!isInlineEditing && (
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
          onClick={e => {
            const hit = eidAtPoint(e.clientX, e.clientY, e.currentTarget)
            if (!hit) { deselect(); return }

            const { eid, el } = hit
            const entry = registry[eid]
            if (!entry) { deselect(); return }

            const r = el.getBoundingClientRect()
            const rect: FRect = { left: r.left, top: r.top, width: r.width, height: r.height }
            setElementRect(rect)

            if (entry.textType === 'static') {
              inlineInitTextRef.current = editStore[eid]?.text ?? entry.staticText ?? ''
              setIsInlineEditing(false)
              setTimeout(() => setIsInlineEditing(true), 0)
            } else {
              setIsInlineEditing(false)
            }

            onSelectElement(eid)
          }}
        />
      )}

      {/* ── Selection highlight ────────────────────────────────────────────── */}
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

      {/* ── Inline text editor ─────────────────────────────────────────────── */}
      {isInlineEditing && elementRect && selectedEid && (
        <TextEditOverlay
          elementRect={elementRect}
          selectedEid={selectedEid}
          playerRef={playerRef}
          initText={inlineInitTextRef.current}
          onCommit={handleTextCommit}
          onCancel={() => setIsInlineEditing(false)}
          onHeightChange={handleEditorHeightChange}
        />
      )}

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
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
