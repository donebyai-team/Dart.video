import { useRef, useState } from 'react'
import type React from 'react'
import type { PatchOverlay } from '@coasterai/renderer'

export interface SelectableHit {
  id: string
  el: HTMLElement
}

interface DragState {
  pointerId: number
  elementId: string
  startClientX: number
  startClientY: number
  initialDragX: number
  initialDragY: number
  moved: boolean
  pendingDragX: number
  pendingDragY: number
  scaleX: number
  scaleY: number
  previewEl: HTMLElement
  baseTransform: string
}

type OverlayCursor = 'default' | 'pointer' | 'grab'

interface UsePrimitiveDragParams {
  playerRef: React.RefObject<HTMLDivElement>
  overlay: PatchOverlay
  selectedEid: string | null
  onSelectElement: (eid: string | null) => void
  onValuePatch: (id: string, prop: string, value: unknown) => void
  setElementRect: (rect: DOMRect) => void
  selectableStackAtPoint: (
    clientX: number,
    clientY: number,
    overlayEl: HTMLElement,
  ) => SelectableHit[]
}

interface UsePrimitiveDragResult {
  dragStateRef: React.MutableRefObject<DragState | null>
  suppressClickRef: React.MutableRefObject<boolean>
  pointerSelectedIdRef: React.MutableRefObject<string | null>
  hoverCursor: OverlayCursor
  setHoverCursor: React.Dispatch<React.SetStateAction<OverlayCursor>>
  handlePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
  handlePointerMove: (e: React.PointerEvent<HTMLDivElement>) => void
  handlePointerEnd: (e: React.PointerEvent<HTMLDivElement>) => void
  hoveredArrayEl: Element | null
}

function composePreviewTransform(dragX: number, dragY: number, baseTransform: string): string {
  const transforms = []
  if (dragX || dragY) transforms.push(`translate(${dragX}px, ${dragY}px)`)
  if (baseTransform) transforms.push(baseTransform)
  return transforms.length > 0 ? transforms.join(' ') : 'none'
}

function stripLeadingTranslate(transform: string): string {
  const trimmed = transform.trim()
  if (!trimmed.startsWith('translate(')) return trimmed

  let depth = 0
  for (let i = 0; i < trimmed.length; i += 1) {
    const char = trimmed[i]
    if (char === '(') depth += 1
    if (char === ')') {
      depth -= 1
      if (depth === 0) {
        return trimmed.slice(i + 1).trim()
      }
    }
  }

  return ''
}

function getCursorForHits(hits: SelectableHit[]): OverlayCursor {
  if (hits.length === 0) return 'default'
  return 'grab'
}

export function usePrimitiveDrag({
  playerRef,
  overlay,
  selectedEid,
  onSelectElement,
  onValuePatch,
  setElementRect,
  selectableStackAtPoint,
}: UsePrimitiveDragParams): UsePrimitiveDragResult {
  const dragStateRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)
  const pointerSelectedIdRef = useRef<string | null>(null)
  const [hoverCursor, setHoverCursor] = useState<OverlayCursor>('default')
  const [hoveredArrayEl, setHoveredArrayEl] = useState<Element | null>(null)
  const hoveredArrayElRef = useRef<Element | null>(null)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const hits = selectableStackAtPoint(e.clientX, e.clientY, e.currentTarget)
    const hit = hits[0]
    if (!hit) return

    const arrayEl = hit.el.closest('[data-array-index]') ?? null
    hoveredArrayElRef.current = arrayEl
    setHoveredArrayEl(arrayEl)

    setElementRect(hit.el.getBoundingClientRect())
    if (selectedEid !== hit.id) {
      pointerSelectedIdRef.current = hit.id
      onSelectElement(hit.id)
    }

    const entry = overlay[hit.id]
    const initialDragX = typeof entry?.dragX === 'number' ? entry.dragX : 0
    const initialDragY = typeof entry?.dragY === 'number' ? entry.dragY : 0
    const previewEl =
      (playerRef.current?.querySelector(`[id="${hit.id}"]`) as HTMLElement | null) ?? hit.el
    const previewRect = previewEl.getBoundingClientRect()
    const scaleX = previewRect.width > 0 ? previewEl.offsetWidth / previewRect.width : 1
    const scaleY = previewRect.height > 0 ? previewEl.offsetHeight / previewRect.height : 1
    const baseTransform = stripLeadingTranslate(previewEl.style.transform || '')

    dragStateRef.current = {
      pointerId: e.pointerId,
      elementId: hit.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialDragX,
      initialDragY,
      moved: false,
      pendingDragX: initialDragX,
      pendingDragY: initialDragY,
      scaleX,
      scaleY,
      previewEl,
      baseTransform,
    }

    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== e.pointerId) {
      const hits = selectableStackAtPoint(e.clientX, e.clientY, e.currentTarget)
      setHoverCursor(getCursorForHits(hits))

      e.currentTarget.style.pointerEvents = 'none'
      const el = document.elementFromPoint(e.clientX, e.clientY)
      e.currentTarget.style.pointerEvents = 'auto'

      const arrayEl = el?.closest('[data-array-index]') ?? null
      hoveredArrayElRef.current = arrayEl
      setHoveredArrayEl(arrayEl)

      return
    }

    const deltaX = (e.clientX - dragState.startClientX) * dragState.scaleX
    const deltaY = (e.clientY - dragState.startClientY) * dragState.scaleY

    if (!dragState.moved && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
      dragState.moved = true
      suppressClickRef.current = true
    }

    dragState.pendingDragX = Math.round(dragState.initialDragX + deltaX)
    dragState.pendingDragY = Math.round(dragState.initialDragY + deltaY)
    dragState.previewEl.style.transform = composePreviewTransform(
      dragState.pendingDragX,
      dragState.pendingDragY,
      dragState.baseTransform,
    )
    dragState.previewEl.style.willChange = 'transform'

    setElementRect(dragState.previewEl.getBoundingClientRect())
  }

  function handlePointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== e.pointerId) return

    if (dragState.moved) {
      onValuePatch(dragState.elementId, 'dragX', dragState.pendingDragX)
      onValuePatch(dragState.elementId, 'dragY', dragState.pendingDragY)
    }

    dragStateRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  return {
    dragStateRef,
    suppressClickRef,
    pointerSelectedIdRef,
    hoverCursor,
    setHoverCursor,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
    hoveredArrayEl,
  }
}
