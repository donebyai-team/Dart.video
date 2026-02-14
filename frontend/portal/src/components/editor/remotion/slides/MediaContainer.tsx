import { MetaData } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { Resolution } from '@coasterai/pb/coasterai/core/v1/video_pb'
import React, { RefObject, SetStateAction, useCallback, useEffect, useRef, useState } from 'react'

interface MediaContainerProps {
  media: MetaData
  resolution: Resolution
  isEditing?: boolean
  setIsEditing: React.Dispatch<SetStateAction<boolean>>
  onUpdate?: (updates: Partial<MetaData>) => void
  children: React.ReactNode
  mediaRef: RefObject<HTMLVideoElement | HTMLImageElement>
}

type Corner = 'nw' | 'ne' | 'sw' | 'se'

export const MediaContainer: React.FC<MediaContainerProps> = ({
  media,
  resolution,
  isEditing = false,
  setIsEditing,
  onUpdate,
  children,
  mediaRef
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState<Corner | null>(null)

  // Refs for drag state — avoids stale closures in mousemove handlers
  const dragStartRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null)
  const resizeStartRef = useRef<{
    x: number
    y: number
    startX: number
    startY: number
    startWidth: number
    startHeight: number
  } | null>(null)

  // Aspect ratio captured at the moment a resize begins
  const aspectRatioRef = useRef<number>(1)

  // RAF + pending update refs for throttled rendering
  const rafRef = useRef<number | null>(null)
  const pendingUpdateRef = useRef<Partial<MetaData> | null>(null)

  // Calculate percentage-based positioning for responsive scaling
  const leftPercent = ((media.x || 0) / resolution.width) * 100
  const topPercent = ((media.y || 0) / resolution.height) * 100
  const widthPercent = ((media.width || 0) / resolution.width) * 100
  const heightPercent = ((media.height || 0) / resolution.height) * 100

  /**
   * Reads the effective render scale of the canvas/slide container.
   *
   * Strategy: walk up from the image element's parent until we find an
   * ancestor that has a [data-canvas] attribute, then compare its rendered
   * size to the logical resolution. This gives us the true screen-px →
   * resolution-px ratio so mouse deltas are always accurate regardless of
   * zoom level.
   *
   * Fallback: accumulate CSS transform matrix scales up the ancestor chain.
   */
  const getCanvasScale = (): { x: number; y: number } => {
    // Prefer an explicit [data-canvas] ancestor
    const canvasEl = containerRef.current?.closest('[data-canvas]') as HTMLElement | null

    if (canvasEl) {
      const rect = canvasEl.getBoundingClientRect()
      return {
        x: rect.width / resolution.width,
        y: rect.height / resolution.height
      }
    }

    // Fallback: multiply any CSS transform scales found on the ancestor chain
    let node: HTMLElement | null = containerRef.current?.parentElement ?? null
    let sx = 1
    let sy = 1
    while (node && node !== document.body) {
      const matrix = new DOMMatrix(window.getComputedStyle(node).transform)
      // matrix.a = scaleX, matrix.d = scaleY for 2-D matrices
      if (matrix.a && matrix.a !== 1) sx *= matrix.a
      if (matrix.d && matrix.d !== 1) sy *= matrix.d
      node = node.parentElement
    }
    return { x: sx, y: sy }
  }

  // ─── Drag ────────────────────────────────────────────────────────────────────

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditing || !onUpdate) return
      e.stopPropagation()

      setIsDragging(true)
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        startX: media.x ?? 0,
        startY: media.y ?? 0
      }
    },
    [isEditing, onUpdate, media.x, media.y]
  )

  // ─── Resize ──────────────────────────────────────────────────────────────────

  const handleResizeStart = useCallback(
    (corner: Corner, e: React.MouseEvent) => {
      if (!isEditing || !onUpdate) return
      e.stopPropagation()

      // Lock aspect ratio at the moment the drag begins
      const w = media.width ?? 0
      const h = media.height ?? 0
      aspectRatioRef.current = h > 0 ? w / h : 1

      setIsResizing(corner)
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        startX: media.x ?? 0,
        startY: media.y ?? 0,
        startWidth: w,
        startHeight: h
      }
    },
    [isEditing, onUpdate, media.x, media.y, media.width, media.height]
  )

  // ─── Mouse move / up ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isEditing) return

    const handleMouseMove = (e: MouseEvent) => {
      // Divide screen-pixel deltas by the canvas render scale so that
      // 1 logical resolution pixel always corresponds to exactly 1 mouse pixel.
      const scale = getCanvasScale()

      if (isDragging && dragStartRef.current) {
        const deltaX = (e.clientX - dragStartRef.current.x) / scale.x
        const deltaY = (e.clientY - dragStartRef.current.y) / scale.y

        const w = media.width ?? 0
        const h = media.height ?? 0
        const newX = Math.max(0, Math.min(resolution.width - w, dragStartRef.current.startX + deltaX))
        const newY = Math.max(0, Math.min(resolution.height - h, dragStartRef.current.startY + deltaY))

        pendingUpdateRef.current = { x: newX, y: newY }

        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            if (pendingUpdateRef.current) {
              onUpdate?.(pendingUpdateRef.current)
              pendingUpdateRef.current = null
            }
            rafRef.current = null
          })
        }
      } else if (isResizing && resizeStartRef.current) {
        const deltaX = (e.clientX - resizeStartRef.current.x) / scale.x
        const deltaY = (e.clientY - resizeStartRef.current.y) / scale.y

        const ar = aspectRatioRef.current
        const { startWidth, startHeight, startX, startY } = resizeStartRef.current

        let newWidth = startWidth
        let newHeight = startHeight
        let newX = startX
        let newY = startY

        // Each corner: pick the dominant axis delta to drive width,
        // then derive height from the locked aspect ratio.
        if (isResizing === 'se') {
          const domDelta = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : deltaY * ar
          newWidth = Math.max(100, startWidth + domDelta)
          newHeight = newWidth / ar
        } else if (isResizing === 'sw') {
          const domDelta = Math.abs(deltaX) >= Math.abs(deltaY) ? -deltaX : deltaY * ar
          newWidth = Math.max(100, startWidth + domDelta)
          newHeight = newWidth / ar
          newX = startX + (startWidth - newWidth)
        } else if (isResizing === 'ne') {
          const domDelta = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : -deltaY * ar
          newWidth = Math.max(100, startWidth + domDelta)
          newHeight = newWidth / ar
          newY = startY + (startHeight - newHeight)
        } else if (isResizing === 'nw') {
          const domDelta = Math.abs(deltaX) >= Math.abs(deltaY) ? -deltaX : -deltaY * ar
          newWidth = Math.max(100, startWidth + domDelta)
          newHeight = newWidth / ar
          newX = startX + (startWidth - newWidth)
          newY = startY + (startHeight - newHeight)
        }

        // Constrain to canvas bounds
        newX = Math.max(0, Math.min(resolution.width - newWidth, newX))
        newY = Math.max(0, Math.min(resolution.height - newHeight, newY))
        newWidth = Math.min(resolution.width - newX, newWidth)
        newHeight = Math.min(resolution.height - newY, newHeight)

        pendingUpdateRef.current = { x: newX, y: newY, width: newWidth, height: newHeight }

        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            if (pendingUpdateRef.current) {
              onUpdate?.(pendingUpdateRef.current)
              pendingUpdateRef.current = null
            }
            rafRef.current = null
          })
        }
      }
    }

    const handleMouseUp = () => {
      if (isDragging || isResizing) {
        // Flush any pending RAF update immediately
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
        if (pendingUpdateRef.current) {
          onUpdate?.(pendingUpdateRef.current)
          pendingUpdateRef.current = null
        }
      }

      setIsDragging(false)
      setIsResizing(null)
      dragStartRef.current = null
      resizeStartRef.current = null
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
      }
    }
    return
  }, [isDragging, isResizing, media.width, media.height, resolution, isEditing, onUpdate])

  // ─── Click-outside to deselect ───────────────────────────────────────────────

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isResizing && mediaRef.current && !mediaRef.current.contains(event.target as Node)) {
        setIsEditing(false)
      }      
    }

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return
  }, [isEditing, setIsEditing, mediaRef, isResizing])

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        width: `${widthPercent}%`,
        height: `${heightPercent}%`,
        transform: `rotate(${media.rotation || 0}deg)`,
        cursor: isEditing ? (isDragging ? 'grabbing' : 'grab') : 'default',
        userSelect: 'none'
      }}
      onMouseDown={isEditing ? handleDragStart : undefined}
    >
      {children}

      {isEditing && (
        <>
          {/* Resize handles at corners */}
          {(['nw', 'ne', 'sw', 'se'] as Corner[]).map(corner => (
            <div
              key={corner}
              className='resize-handle'
              style={{
                position: 'absolute',
                ...(corner.includes('n') ? { top: '-25px' } : { bottom: '-25px' }),
                ...(corner.includes('w') ? { left: '-25px' } : { right: '-25px' }),
                width: '50px',
                height: '50px',
                backgroundColor: '#ffffff',
                border: '10px solid #3b82f6',
                borderRadius: '50%',
                cursor: `${corner}-resize`,
                pointerEvents: 'auto'
              }}
              onMouseDown={e => handleResizeStart(corner, e)}
            />
          ))}

          {/* Selection border */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              border: '6px solid #3b82f6',
              borderRadius: '8px',
              pointerEvents: 'none'
            }}
          />
        </>
      )}
    </div>
  )
}
