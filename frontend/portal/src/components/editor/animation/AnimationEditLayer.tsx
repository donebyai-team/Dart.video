/**
 * AnimationEditLayer
 *
 * Portal-based overlay (position:fixed) over the Remotion canvas.
 * Mirrors the EditableText.tsx pattern:
 *  - Hides the original DOM element during inline editing (visibility:hidden)
 *  - Renders the editor exactly in its place via fixed portal
 *  - Only selects elements whose eid exists in the registry
 */

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimationToolbar } from './AnimationToolbar'
import type { ElementEdit } from './AnimationToolbar'
import type { RegistryEntry } from '@coasterai/renderer'

interface FRect { left: number; top: number; width: number; height: number }

interface AnimationEditLayerProps {
  playerRef: React.RefObject<HTMLDivElement>
  selectedEid: string | null
  registry: Record<string, RegistryEntry>
  editStore: Record<string, ElementEdit>
  animEditVersion?: number
  onSelectElement: (eid: string | null) => void
  onEdit: (eid: string, patch: Partial<ElementEdit>) => void
}

export function AnimationEditLayer({
  playerRef,
  selectedEid,
  registry,
  editStore,
  animEditVersion,
  onSelectElement,
  onEdit,
}: AnimationEditLayerProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  const [canvasRect, setCanvasRect] = useState<FRect | null>(null)
  const [elementRect, setElementRect] = useState<FRect | null>(null)
  const [isInlineEditing, setIsInlineEditing] = useState(false)
  const [editorHeight, setEditorHeight] = useState(0)

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

  // ── Hide original element during inline editing (mirrors EditableText opacity:0) ──
  useLayoutEffect(() => {
    if (!isInlineEditing || !selectedEid) return
    const el = playerRef.current?.querySelector(`[data-eid="${selectedEid}"]`) as HTMLElement | null
    if (!el) return
    const prev = el.style.visibility
    el.style.visibility = 'hidden'
    return () => { el.style.visibility = prev }
  }, [isInlineEditing, selectedEid, playerRef])

  // ── Track editor height so dashed border follows multi-line growth ───────────
  useEffect(() => {
    if (!isInlineEditing || !editorRef.current) return
    const ro = new ResizeObserver(entries => {
      setEditorHeight(entries[0].contentRect.height)
    })
    ro.observe(editorRef.current)
    return () => ro.disconnect()
  }, [isInlineEditing])

  // ── Focus + cursor-at-end when editor mounts ─────────────────────────────────
  const inlineInitTextRef = useRef('')
  useLayoutEffect(() => {
    if (!isInlineEditing || !editorRef.current) return
    const el = editorRef.current
    el.innerText = inlineInitTextRef.current
    el.focus()
    const range = document.createRange()
    const sel = window.getSelection()
    range.selectNodeContents(el)
    range.collapse(false) // cursor at end
    sel?.removeAllRanges()
    sel?.addRange(range)
  }, [isInlineEditing])

  // ── Click-outside to deselect ───────────────────────────────────────────────
  useEffect(() => {
    if (!selectedEid) return
    const handleMouseDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (toolbarRef.current?.contains(t)) return
      if (editorRef.current?.contains(t)) return
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

  function commitEdit(el: HTMLDivElement) {
    const newText = el.innerText.trim()
    if (selectedEid && newText) {
      // Patch height so the Remotion element expands to show all lines
      const h = el.offsetHeight
      onEdit(selectedEid, {
        text: newText,
        style: h > 0 ? { height: h, overflow: 'visible' } : {},
      })
    }
    setIsInlineEditing(false)
  }

  /** Compute styles scaled to visual size (getComputedStyle returns unscaled values) */
  function getMatchedStyles(rect: FRect): React.CSSProperties {
    const domEl = playerRef.current?.querySelector(`[data-eid="${selectedEid}"]`) as HTMLElement | null
    if (!domEl) return {}
    const cs = window.getComputedStyle(domEl)
    const scale = rect.width / (domEl.offsetWidth || rect.width)
    const fontSize = parseFloat(cs.fontSize) * scale
    const lineHeightNum = parseFloat(cs.lineHeight)
    const letterSpacingNum = parseFloat(cs.letterSpacing)
    return {
      fontFamily: cs.fontFamily,
      fontSize: isNaN(fontSize) ? undefined : `${fontSize}px`,
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      color: cs.color,
      textAlign: cs.textAlign as React.CSSProperties['textAlign'],
      letterSpacing: isNaN(letterSpacingNum) ? undefined : `${letterSpacingNum * scale}px`,
      lineHeight: isNaN(lineHeightNum) ? 'normal' : `${lineHeightNum * scale}px`,
    }
  }

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
            // Only select elements known to the registry
            if (!entry) { deselect(); return }

            const r = el.getBoundingClientRect()
            const rect: FRect = { left: r.left, top: r.top, width: r.width, height: r.height }
            setElementRect(rect)

            const isText = entry.textType === 'static'
            if (isText) {
              inlineInitTextRef.current = editStore[eid]?.text ?? entry.staticText ?? ''
              setIsInlineEditing(false)
              // Activate on next tick so elementRect state is committed before editor mounts
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

      {/* ── Inline editor — positioned exactly over the hidden original element ─ */}
      {isInlineEditing && elementRect && (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={e => commitEdit(e.currentTarget)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(e.currentTarget as HTMLDivElement) }
            if (e.key === 'Escape') { setIsInlineEditing(false) }
          }}
          style={{
            position: 'fixed',
            left: elementRect.left,
            top: elementRect.top,
            width: elementRect.width,
            minHeight: elementRect.height,
            ...getMatchedStyles(elementRect),
            background: 'transparent',
            outline: 'none',
            cursor: 'text',
            zIndex: 9999,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* ── Toolbar — only when a known registry entry is selected ─────────── */}
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
