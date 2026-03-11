/**
 * useDragToMove
 *
 * Encapsulates drag-to-reposition logic for a selected canvas element.
 *
 * - Attaches document mousemove/mouseup listeners only while dragging.
 * - Converts viewport-pixel deltas to composition-space px using compositionScale.
 * - Calls onEdit on every move frame (RAF-throttled) so the renderer stays in sync.
 * - Exposes visualOffset (viewport px) so the caller can shift the selection
 *   rect immediately without waiting for a Remotion re-render cycle.
 * - didDragRef lets the caller suppress the subsequent onClick when drag occurred.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import type { ElementEdit } from '@coasterai/renderer/src/types/ast'

interface Props {
  selectedEid: string | null
  editStore: Record<string, ElementEdit>
  /** viewport-px ÷ compositionScale = composition-px */
  compositionScale: number
  onEdit: (eid: string, patch: Partial<ElementEdit>) => void
}

interface Result {
  isDragging: boolean
  /** Set to true once the pointer has moved > 2 px during a drag. */
  didDragRef: React.MutableRefObject<boolean>
  /** Viewport-pixel offset since drag started — add to elementRect for live feedback. */
  visualOffset: { dx: number; dy: number }
  /** Call from the overlay's onMouseDown when the pointer is over the selected element. */
  onDragStart: (e: React.MouseEvent) => void
}

export function useDragToMove({ selectedEid, editStore, compositionScale, onEdit }: Props): Result {
  const [isDragging, setIsDragging] = useState(false)
  const [visualOffset, setVisualOffset] = useState({ dx: 0, dy: 0 })
  const didDragRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  const stateRef = useRef({
    startClient: { x: 0, y: 0 },
    startTransform: { translateX: 0, translateY: 0 },
    eid: '',
  })

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (!selectedEid) return
      e.preventDefault()
      const existing = editStore[selectedEid]?.transform ?? {}
      stateRef.current = {
        startClient: { x: e.clientX, y: e.clientY },
        startTransform: {
          translateX: existing.translateX ?? 0,
          translateY: existing.translateY ?? 0,
        },
        eid: selectedEid,
      }
      didDragRef.current = false
      setIsDragging(true)
      setVisualOffset({ dx: 0, dy: 0 })
    },
    [selectedEid, editStore],
  )

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const { startClient, startTransform, eid } = stateRef.current
      const vdx = e.clientX - startClient.x
      const vdy = e.clientY - startClient.y
      if (Math.abs(vdx) > 2 || Math.abs(vdy) > 2) didDragRef.current = true
      setVisualOffset({ dx: vdx, dy: vdy })
      // Throttle edit calls to one per animation frame
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        onEdit(eid, {
          transform: {
            translateX: startTransform.translateX + vdx / compositionScale,
            translateY: startTransform.translateY + vdy / compositionScale,
          },
        })
      })
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (didDragRef.current) {
        const { startClient, startTransform, eid } = stateRef.current
        const vdx = e.clientX - startClient.x
        const vdy = e.clientY - startClient.y
        // Final commit with exact released position
        onEdit(eid, {
          transform: {
            translateX: startTransform.translateX + vdx / compositionScale,
            translateY: startTransform.translateY + vdy / compositionScale,
          },
        })
      }
      setIsDragging(false)
      setVisualOffset({ dx: 0, dy: 0 })
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, compositionScale, onEdit])

  // Clean up when element is deselected
  useEffect(() => {
    if (!selectedEid) {
      setVisualOffset({ dx: 0, dy: 0 })
      didDragRef.current = false
    }
  }, [selectedEid])

  return { isDragging, didDragRef, visualOffset, onDragStart }
}
