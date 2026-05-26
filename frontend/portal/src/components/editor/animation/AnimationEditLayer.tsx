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
import { useMediaResize } from './useMediaResize'
import {
  type PatchOverlay,
} from '@coasterai/renderer'
import { ArrayControlButton } from './ArrayControlButton'
import { isMediaComponent, isPlainTextElement } from '@coasterai/animation'

interface FRect { left: number; top: number; width: number; height: number }

interface TextResizeState {
  pointerId: number
  elementId: string
  startClientX: number
  initialWidth: number
  pendingWidth: number
  scaleX: number
  previewEl: HTMLElement
}

interface AnimationEditLayerProps {
  playerRef: React.RefObject<HTMLDivElement>
  selectedEid: string | null
  overlay: PatchOverlay
  animEditVersion?: number
  onSelectElement: (eid: string | null) => void
  onValuePatch: (id: string, prop: string, value: unknown) => void
  onArrayPatch: (source: string, next: Record<string, any>[]) => void
  onStyleOverride: (id: string, style: Record<string, string | number>) => void
}

function clampRectToCanvas(rect: FRect, canvas: FRect): FRect | null {
  const left = Math.max(rect.left, canvas.left)
  const top = Math.max(rect.top, canvas.top)
  const right = Math.min(rect.left + rect.width, canvas.left + canvas.width)
  const bottom = Math.min(rect.top + rect.height, canvas.top + canvas.height)

  if (right <= left || bottom <= top) return null

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  }
}

function insetRect(rect: FRect, inset: number): FRect | null {
  const width = rect.width - inset * 2
  const height = rect.height - inset * 2

  if (width <= 0 || height <= 0) return null

  return {
    left: rect.left + inset,
    top: rect.top + inset,
    width,
    height,
  }
}

export function AnimationEditLayer({
  playerRef,
  selectedEid,
  overlay,
  animEditVersion,
  onSelectElement,
  onValuePatch,
  onArrayPatch,
  onStyleOverride,
}: AnimationEditLayerProps) {
  const toolbarRef = useRef<HTMLDivElement>(null)
  const textResizeStateRef = useRef<TextResizeState | null>(null)

  const [canvasRect, setCanvasRect] = useState<FRect | null>(null)
  const [elementRect, setElementRect] = useState<FRect | null>(null)
  const [toolbarHeight, setToolbarHeight] = useState(48)
  const [isToolbarVisible, setIsToolbarVisible] = useState(true)
  const toolbarOffset = 12

  function supportsToolbar(_id: string): boolean {
    // const lowerId = id.toLowerCase()
    // return lowerId.includes('text') ||
    //   lowerId.includes('icon') ||
    //   lowerId.includes('container') ||
    //   lowerId.includes('counter') ||
    //   lowerId.includes('typewriter') ||
    //   lowerId.includes('image') ||
    //   lowerId.includes('video')
    return true
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
    if (textResizeStateRef.current?.elementId === selectedEid) return
    if (mediaResizeStateRef.current?.elementId === selectedEid) return
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

  useEffect(() => {
    setIsToolbarVisible(Boolean(selectedEid))
  }, [selectedEid])

  useEffect(() => {
    if (!selectedEid || !toolbarRef.current) return

    const update = () => {
      if (!toolbarRef.current) return
      setToolbarHeight(toolbarRef.current.getBoundingClientRect().height)
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(toolbarRef.current)
    window.addEventListener('resize', update)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [selectedEid])

  // ── Hit testing ───────────────────────────────────────────────────────────

  /** Check if an element ID is selectable (has a toolbar). */
  function isSelectable(_id: string): boolean {
    // const elType = getElementTypeFromId(id)
    // if (elType === 'html' || elType === 'custom') return true
    // const registration = resolveComponentFromId(id)
    // if (!registration) return false
    // return registration.type !== 'scene'
    return true
  }

  // used as fallback click on the scene
  function hasTextLikeField(entry: unknown): boolean {
    if (!entry || typeof entry !== 'object') return false

    // Some scenes store copy as a string array (`texts`) instead of a single `text` field.
    // Treat both plain strings and non-empty string arrays as text-like content.
    return Object.entries(entry as Record<string, unknown>).some(([prop, value]) => {
      if (prop === 'style' || prop === 'dragX' || prop === 'dragY') return false

      const lowerProp = prop.toLowerCase()
      const hasStringValue = typeof value === 'string' && value.trim().length > 0
      const hasStringArrayValue = Array.isArray(value) && value.some(
        (item) => typeof item === 'string' && item.trim().length > 0,
      )

      if (!hasStringValue && !hasStringArrayValue) return false

      return (
        lowerProp === 'text' ||
        lowerProp === 'title' ||
        lowerProp === 'subtitle' ||
        lowerProp === 'word' ||
        lowerProp.includes('text')
      )
    })
  }

  function getFallbackSelectionId(): string | null {
    const sceneEntry = overlay.scene
    if (sceneEntry && typeof sceneEntry === 'object') return 'scene'

    const overlayEntries = Object.entries(overlay)

    const textEntry = overlayEntries.find(([, entry]) => hasTextLikeField(entry))
    if (textEntry) return textEntry[0]

    return overlayEntries[0]?.[0] ?? null
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
    const elements = document.elementsFromPoint(clientX, clientY) as HTMLElement[]
    overlayEl.style.pointerEvents = 'auto'

    const hits: { id: string; el: HTMLElement }[] = []
    const seen = new Set<string>()

    for (const topEl of elements) {
      let walkEl: HTMLElement | null = topEl

      while (walkEl && walkEl !== overlayEl) {
        const elId = walkEl.getAttribute('id')
        if (elId && isSelectable(elId) && !seen.has(elId)) {
          seen.add(elId)
          hits.push({ id: elId, el: walkEl })
          break
        }
        walkEl = walkEl.parentElement
      }
    }

    return hits
  }

  type ControlPosition =
    | 'corner-top-left' | 'corner-top-right'
    | 'corner-bottom-left' | 'corner-bottom-right'
    | 'mid-top' | 'mid-right' | 'mid-bottom' | 'mid-left'

  function resolveControlPosition(rect: DOMRect, position: ControlPosition) {
    switch (position) {
      case 'corner-top-left': return { top: rect.top - 12, left: rect.left - 12 }
      case 'corner-top-right': return { top: rect.top - 12, left: rect.right - 12 }
      case 'corner-bottom-left': return { top: rect.bottom - 12, left: rect.left - 12 }
      case 'corner-bottom-right': return { top: rect.bottom - 12, left: rect.right - 12 }
      case 'mid-top': return { top: rect.top - 12, left: rect.left + rect.width / 2 - 12 }
      case 'mid-right': return { top: rect.top + rect.height / 2 - 12, left: rect.right - 12 }
      case 'mid-bottom': return { top: rect.bottom - 12, left: rect.left + rect.width / 2 - 12 }
      case 'mid-left': return { top: rect.top + rect.height / 2 - 12, left: rect.left - 12 }
    }
  }

  function getArrayControlAnchorEl(arrayEl: Element): Element {
    const draggedPreviewEl = dragStateRef.current?.previewEl
    if (draggedPreviewEl && arrayEl.contains(draggedPreviewEl)) {
      return draggedPreviewEl
    }

    const selectableChild = arrayEl.querySelector('[id]')
    return selectableChild ?? arrayEl
  }

  function handleArrayAdd(meta: any) {
    const { index, source, array } = meta
    const next = [
      ...array.slice(0, index + 1),
      { ...array[index] },
      ...array.slice(index + 1),
    ]
    onArrayPatch(source, next)
  }

  function handleArrayRemove(meta: any) {
    const { index, source, array } = meta
    const next = array.filter((_: any, i: number) => i !== index)
    onArrayPatch(source, next)
  }

  const {
    mediaResizeStateRef,
    handleMediaResizePointerDown,
    handleMediaResizePointerMove,
    handleMediaResizePointerEnd,
  } = useMediaResize({
    playerRef,
    selectedEid,
    isMediaComponent,
    onValuePatch,
    setElementRect,
  })

  const {
    dragStateRef,
    suppressClickRef,
    pointerSelectedIdRef,
    hoverCursor,
    setHoverCursor,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
    hoveredArrayEl,
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

  const selectedArrayEl =
    selectedEid
      ? playerRef.current?.querySelector(`[id="${selectedEid}"]`)?.closest('[data-array-index]') ?? null
      : null
  const activeArrayEl = selectedArrayEl ?? hoveredArrayEl

  const deselect = useCallback(() => onSelectElement(null), [onSelectElement])

  useEffect(() => {
    if (!selectedEid) return

    const handlePointerDownOutside = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return

      if (toolbarRef.current?.contains(target)) return
      if (playerRef.current?.contains(target)) return
      if (target instanceof Element && target.closest('[data-animation-settings-panel="true"]')) return

      setIsToolbarVisible(false)
    }

    document.addEventListener('pointerdown', handlePointerDownOutside, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside, true)
    }
  }, [playerRef, selectedEid])

  function handleTextResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!selectedEid || !isPlainTextElement(selectedEid)) return

    const previewEl = playerRef.current?.querySelector(`[id="${selectedEid}"]`) as HTMLElement | null
    if (!previewEl) return

    e.preventDefault()
    e.stopPropagation()

    const previewRect = previewEl.getBoundingClientRect()
    const initialWidth = previewEl.offsetWidth || previewRect.width
    const scaleX = previewRect.width > 0 ? initialWidth / previewRect.width : 1

    textResizeStateRef.current = {
      pointerId: e.pointerId,
      elementId: selectedEid,
      startClientX: e.clientX,
      initialWidth,
      pendingWidth: initialWidth,
      scaleX,
      previewEl,
    }

    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleTextResizePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const resizeState = textResizeStateRef.current
    if (!resizeState || resizeState.pointerId !== e.pointerId) return

    e.preventDefault()
    e.stopPropagation()

    const deltaX = (e.clientX - resizeState.startClientX) * resizeState.scaleX
    const nextWidth = Math.max(40, Math.round(resizeState.initialWidth + deltaX))
    resizeState.pendingWidth = nextWidth
    resizeState.previewEl.style.width = `${nextWidth}px`

    const nextRect = resizeState.previewEl.getBoundingClientRect()
    setElementRect({
      left: nextRect.left,
      top: nextRect.top,
      width: nextRect.width,
      height: nextRect.height,
    })
  }

  function handleTextResizePointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    const resizeState = textResizeStateRef.current
    if (!resizeState || resizeState.pointerId !== e.pointerId) return

    e.preventDefault()
    e.stopPropagation()

    onStyleOverride(resizeState.elementId, { width: resizeState.pendingWidth })
    textResizeStateRef.current = null

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  /**
   * Click handler with parent-walk:
   *   - First click: select deepest element.
   *   - Click again on selected: walk up to parent.
   *   - At topmost: keep it selected.
   */
  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    setIsToolbarVisible(true)

    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }

    if (pointerSelectedIdRef.current) {
      pointerSelectedIdRef.current = null
      return
    }

    const hits = selectableStackAtPoint(e.clientX, e.clientY, e.currentTarget)
    if (hits.length === 0) {
      const fallbackId = getFallbackSelectionId()
      setElementRect(null)
      onSelectElement(fallbackId)
      return
    }

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

    if (idx === hits.length - 1) {
      const hit = hits[idx]
      setElementRect(hit.el.getBoundingClientRect())
      onSelectElement(hit.id)
      return
    }

    const hit = hits[0]
    setElementRect(hit.el.getBoundingClientRect())
    onSelectElement(hit.id)
  }

  if (!canvasRect) return null

  const clampedElementRect = elementRect ? clampRectToCanvas(elementRect, canvasRect) : null
  const selectionRect = clampedElementRect ? insetRect(clampedElementRect, 2) : null

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
      {selectionRect && selectedEid && (
        <div
          style={{
            position: 'fixed',
            left: selectionRect.left,
            top: selectionRect.top,
            width: selectionRect.width,
            height: selectionRect.height,
            border: '2px dashed rgba(99,102,241,0.8)',
            borderRadius: 3,
            boxSizing: 'border-box',
            pointerEvents: 'none',
            zIndex: 41,
          }}
        />
      )}

      {/* Array item controls */}
      {activeArrayEl && (() => {
        const meta = (activeArrayEl as any).__arrayMeta
        if (!meta) return null
        const controlAnchorEl = getArrayControlAnchorEl(activeArrayEl)
        const rect = controlAnchorEl.getBoundingClientRect()
        const removePos = resolveControlPosition(rect, meta.removeControl ?? 'corner-top-right')
        const addPos = resolveControlPosition(rect, meta.addControl ?? 'mid-right')
        const showRemove = meta.array.length > meta.min
        const showAdd = meta.max === undefined || meta.array.length < meta.max

        return (
          <>
            {showRemove && (
              <div
                style={{ position: 'fixed', top: removePos.top, left: removePos.left, zIndex: 50, pointerEvents: 'all' }}
              >
                <ArrayControlButton onClick={() => handleArrayRemove(meta)}>
                  ×
                </ArrayControlButton>
              </div>
            )}

            {showAdd && (
              <div
                style={{ position: 'fixed', top: addPos.top, left: addPos.left, zIndex: 50, pointerEvents: 'all' }}
              >
                <ArrayControlButton onClick={() => handleArrayAdd(meta)}>
                  +
                </ArrayControlButton>
              </div>
            )}
          </>
        )
      })()}

      {/* Plain Text resize handle */}
      {clampedElementRect && selectedEid && isPlainTextElement(selectedEid) && (
        <div
          style={{
            position: 'fixed',
            left: clampedElementRect.left + clampedElementRect.width - 5,
            top: clampedElementRect.top + clampedElementRect.height / 2 - 5,
            width: 10,
            height: 10,
            background: '#ffffff',
            border: '2px solid rgba(99,102,241,0.95)',
            borderRadius: 3,
            boxSizing: 'border-box',
            cursor: 'ew-resize',
            pointerEvents: 'auto',
            zIndex: 42,
          }}
          onPointerDown={handleTextResizePointerDown}
          onPointerMove={handleTextResizePointerMove}
          onPointerUp={handleTextResizePointerEnd}
          onPointerCancel={handleTextResizePointerEnd}
          onClick={e => {
            e.preventDefault()
            e.stopPropagation()
          }}
        />
      )}

      {/* Media resize handle */}
      {clampedElementRect && selectedEid && isMediaComponent(selectedEid) && (
        <div
          style={{
            position: 'fixed',
            left: clampedElementRect.left + clampedElementRect.width - 6,
            top: clampedElementRect.top + clampedElementRect.height - 6,
            width: 12,
            height: 12,
            background: '#ffffff',
            border: '2px solid rgba(99,102,241,0.95)',
            borderRadius: 999,
            boxSizing: 'border-box',
            cursor: 'nwse-resize',
            pointerEvents: 'auto',
            zIndex: 42,
          }}
          onPointerDown={handleMediaResizePointerDown}
          onPointerMove={handleMediaResizePointerMove}
          onPointerUp={handleMediaResizePointerEnd}
          onPointerCancel={handleMediaResizePointerEnd}
          onClick={e => {
            e.preventDefault()
            e.stopPropagation()
          }}
        />
      )}

      {/* Toolbar */}
      {selectedEid && isToolbarVisible && supportsToolbar(selectedEid) && (
        <div
          ref={toolbarRef}
          style={{
            position: 'fixed',
            top:
              canvasRect.top > toolbarHeight + toolbarOffset
                ? canvasRect.top - toolbarHeight - toolbarOffset
                : canvasRect.top + canvasRect.height + toolbarOffset,
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
