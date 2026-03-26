import { ZoomEffect } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { useCallback, useEffect, useRef, useState } from 'react'
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
  resolution,
  containerWidth,
  containerHeight,
  isSelected,
  onSelect,
  onUpdate,
}: ZoomOverlayProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const initialValuesRef = useRef({ x: 0, y: 0, zoomLevel: 2 })
  const overlayRef = useRef<HTMLDivElement>(null)

  const scale = containerWidth / resolution.width
  // Effective canvas display height (resolution-proportional)
  const effectiveHeight = resolution.height * scale

  const zoomLevel = Math.max(1, zoom.zoomLevel || 2)
  const cx = (zoom.x || resolution.width / 2) * scale
  const cy = (zoom.y || resolution.height / 2) * scale

  // Zoom region dimensions in display pixels
  const rectWidth = containerWidth / zoomLevel
  const rectHeight = effectiveHeight / zoomLevel
  const left = cx - rectWidth / 2
  const top = cy - rectHeight / 2

  const handleSize = 10

  const handleBoxMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onSelect()
      setIsDragging(true)
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      initialValuesRef.current = { x: zoom.x || resolution.width / 2, y: zoom.y || resolution.height / 2, zoomLevel }
    },
    [zoom.x, zoom.y, zoomLevel, resolution.width, resolution.height, onSelect]
  )

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(true)
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      initialValuesRef.current = { x: zoom.x || resolution.width / 2, y: zoom.y || resolution.height / 2, zoomLevel }
    },
    [zoom.x, zoom.y, zoomLevel, resolution.width, resolution.height]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging && !isResizing) return

      const dragStart = dragStartRef.current
      const initialValues = initialValuesRef.current
      const dx = (e.clientX - dragStart.x) / scale
      const dy = (e.clientY - dragStart.y) / scale

      if (isDragging) {
        const newX = Math.max(0, Math.min(resolution.width, initialValues.x + dx))
        const newY = Math.max(0, Math.min(resolution.height, initialValues.y + dy))
        onUpdate({ x: newX, y: newY })
      } else if (isResizing) {
        // SE handle: dragging right/down grows the rect (less zoom), left/up shrinks (more zoom)
        const initRectHalfWidth = containerWidth / (2 * initialValues.zoomLevel)
        const dragDelta = e.clientX - dragStart.x
        const newHalfWidth = Math.max(20, initRectHalfWidth + dragDelta)
        const newZoomLevel = containerWidth / (2 * newHalfWidth)
        onUpdate({ zoomLevel: Math.max(1, Math.min(10, newZoomLevel)) })
      }
    },
    [isDragging, isResizing, scale, resolution, containerWidth, onUpdate]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (!isDragging && !isResizing) return
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

  return (
    <div
      ref={overlayRef}
      className='absolute pointer-events-auto'
      style={{
        left,
        top,
        width: rectWidth,
        height: rectHeight,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: 30,
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

      {/* Center crosshair - dual color for visibility */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 24,
          height: 24,
          pointerEvents: 'none',
        }}
      >
        {/* Horizontal line with shadow */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            width: '100%',
            height: 2,
            background: isSelected ? '#22c55e' : '#ffffff',
            transform: 'translateY(-50%)',
            boxShadow: '0 0 3px rgba(0, 0, 0, 0.8)',
          }}
        />
        {/* Vertical line with shadow */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            width: 2,
            height: '100%',
            background: isSelected ? '#22c55e' : '#ffffff',
            transform: 'translateX(-50%)',
            boxShadow: '0 0 3px rgba(0, 0, 0, 0.8)',
          }}
        />
      </div>

      {/* SE resize handle — drag toward center to increase zoom, away to decrease */}
      {isSelected && (
        <div
          className='absolute bg-white border-2 border-primary rounded-sm cursor-se-resize'
          style={{
            right: -handleSize / 2,
            bottom: -handleSize / 2,
            width: handleSize,
            height: handleSize,
          }}
          onMouseDown={handleResizeMouseDown}
        />
      )}
    </div>
  )
}

export default ZoomOverlay
