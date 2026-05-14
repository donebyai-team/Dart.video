import { ZoomEffect } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Resolution } from '@coasterai/pb/coasterai/core/v1/video_pb'

interface ZoomOverlayProps {
  zoom: ZoomEffect
  resolution: Resolution
  containerWidth: number
  containerHeight: number
  isSelected: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<ZoomEffect>) => void
}

const ZoomOverlay = ({
  zoom,
  containerWidth,
  containerHeight,
  isSelected,
  onSelect,
  onUpdate,
}: ZoomOverlayProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [mediaBounds, setMediaBounds] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const initialValuesRef = useRef({ x: 0, y: 0 })
  const zoomLevel = Math.max(1, zoom.zoomLevel || 2)

  const resolveMediaBounds = useCallback(() => {
    const canvasRoot = document.querySelector<HTMLElement>('[data-coaster-canvas-root="true"]')
    if (!canvasRoot) {
      return
    }

    const canvasRect = canvasRoot.getBoundingClientRect()
    const mediaRoot = canvasRoot.querySelector<HTMLElement>('[data-coaster-media-root="true"]')

    if (!mediaRoot) {
      setMediaBounds({
        left: canvasRect.left,
        top: canvasRect.top,
        width: canvasRect.width || containerWidth,
        height: canvasRect.height || containerHeight,
      })
      return
    }

    const mediaRect = mediaRoot.getBoundingClientRect()

    setMediaBounds({
      left: mediaRect.left,
      top: mediaRect.top,
      width: mediaRect.width,
      height: mediaRect.height,
    })
  }, [containerHeight, containerWidth])

  useLayoutEffect(() => {
    resolveMediaBounds()

    const canvasRoot = document.querySelector<HTMLElement>('[data-coaster-canvas-root="true"]')
    if (!canvasRoot || typeof ResizeObserver === 'undefined') {
      return
    }

    let frameId = 0
    let attempts = 0
    const resolveUntilReady = () => {
      resolveMediaBounds()
      attempts += 1
      if (attempts < 12) {
        frameId = window.requestAnimationFrame(resolveUntilReady)
      }
    }

    const observer = new ResizeObserver(() => resolveMediaBounds())
    observer.observe(canvasRoot)
    const mediaRoot = canvasRoot.querySelector<HTMLElement>('[data-coaster-media-root="true"]')
    if (mediaRoot) {
      observer.observe(mediaRoot)
    }

    const mutationObserver = new MutationObserver(() => {
      resolveMediaBounds()
      const latestMediaRoot = canvasRoot.querySelector<HTMLElement>('[data-coaster-media-root="true"]')
      if (latestMediaRoot) {
        observer.observe(latestMediaRoot)
      }
    })

    mutationObserver.observe(canvasRoot, { childList: true, subtree: true })
    window.addEventListener('resize', resolveMediaBounds)
    frameId = window.requestAnimationFrame(resolveUntilReady)

    return () => {
      observer.disconnect()
      mutationObserver.disconnect()
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resolveMediaBounds)
    }
  }, [resolveMediaBounds])

  const targetBounds = mediaBounds ?? {
    left: 0,
    top: 0,
    width: containerWidth,
    height: containerHeight,
  }

  const cx = (Math.min(1, Math.max(0, zoom.x ?? 0.5)) * targetBounds.width) + targetBounds.left
  const cy = (Math.min(1, Math.max(0, zoom.y ?? 0.5)) * targetBounds.height) + targetBounds.top
  const rectWidth = targetBounds.width / zoomLevel
  const rectHeight = targetBounds.height / zoomLevel
  const left = cx - rectWidth / 2
  const top = cy - rectHeight / 2

  const handleBoxMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onSelect()
      setIsDragging(true)
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      initialValuesRef.current = { x: zoom.x ?? 0.5, y: zoom.y ?? 0.5 }
    },
    [zoom.x, zoom.y, onSelect]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return

      const dragStart = dragStartRef.current
      const initialValues = initialValuesRef.current
      const dx = targetBounds.width > 0 ? (e.clientX - dragStart.x) / targetBounds.width : 0
      const dy = targetBounds.height > 0 ? (e.clientY - dragStart.y) / targetBounds.height : 0

      const newX = Math.max(0, Math.min(1, initialValues.x + dx))
      const newY = Math.max(0, Math.min(1, initialValues.y + dy))
      onUpdate({ x: newX, y: newY })
    },
    [isDragging, onUpdate, targetBounds.height, targetBounds.width]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (!isDragging) return
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return createPortal(
    <div
      className='absolute'
      style={{
        position: 'fixed',
        left,
        top,
        width: rectWidth,
        height: rectHeight,
        zIndex: 60,
        pointerEvents: 'auto',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleBoxMouseDown}
      onClick={e => {
        e.stopPropagation()
        onSelect()
      }}
    >
      {/* Zoom region border - dual color for visibility on all backgrounds */}
      <div
        className='w-full h-full transition-colors'
        style={{
          border: `2px dashed ${isSelected ? '#22c55e' : '#ffffff'}`,
          borderRadius: 2,
          // Dark outline behind the border for contrast on light backgrounds
          outline: `2px solid ${isSelected ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.6)'}`,
          outlineOffset: -2,
          boxShadow: isSelected
            ? '0 0 0 3px rgba(34, 197, 94, 0.4), 0 0 12px rgba(0, 0, 0, 0.4)'
            : '0 0 12px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(0, 0, 0, 0.3)',
        }}
      />

      {/* Keep interaction on a small center handle so the overlay does not block scene selection. */}
      <div
        onMouseDown={handleBoxMouseDown}
        onClick={e => {
          e.stopPropagation()
          onSelect()
        }}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 32,
          height: 32,
          cursor: isDragging ? 'grabbing' : 'grab',
          pointerEvents: 'none',
          borderRadius: '50%',
          background: isSelected ? 'rgba(34, 197, 94, 0.14)' : 'rgba(0, 0, 0, 0.18)',
          backdropFilter: 'blur(2px)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 4,
            top: '50%',
            width: 'calc(100% - 8px)',
            height: 2,
            background: isSelected ? '#22c55e' : '#ffffff',
            transform: 'translateY(-50%)',
            boxShadow: '0 0 3px rgba(0, 0, 0, 0.8)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 4,
            width: 2,
            height: 'calc(100% - 8px)',
            background: isSelected ? '#22c55e' : '#ffffff',
            transform: 'translateX(-50%)',
            boxShadow: '0 0 3px rgba(0, 0, 0, 0.8)',
          }}
        />
      </div>
    </div>,
    document.body
  )
}

export default ZoomOverlay
