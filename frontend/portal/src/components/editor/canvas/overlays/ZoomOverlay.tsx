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
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialValues, setInitialValues] = useState({ x: 0, y: 0, zoomLevel: 2 })
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
      setDragStart({ x: e.clientX, y: e.clientY })
      setInitialValues({ x: zoom.x || resolution.width / 2, y: zoom.y || resolution.height / 2, zoomLevel })
    },
    [zoom.x, zoom.y, zoomLevel, resolution.width, resolution.height, onSelect]
  )

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      setInitialValues({ x: zoom.x || resolution.width / 2, y: zoom.y || resolution.height / 2, zoomLevel })
    },
    [zoom.x, zoom.y, zoomLevel, resolution.width, resolution.height]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging && !isResizing) return

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
    [isDragging, isResizing, dragStart, initialValues, scale, resolution, containerWidth, onUpdate]
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
      {/* Zoom region border */}
      <div
        className='w-full h-full transition-colors'
        style={{
          border: `2px dashed ${isSelected ? 'hsl(var(--primary))' : 'rgba(255, 255, 255, 0.8)'}`,
          borderRadius: 2,
          boxShadow: isSelected
            ? '0 0 0 2px hsl(var(--primary) / 0.3)'
            : '0 0 8px rgba(0, 0, 0, 0.3)',
        }}
      />

      {/* Center crosshair */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 20,
          height: 20,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            width: '100%',
            height: 1,
            background: isSelected ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.9)',
            transform: 'translateY(-50%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            width: 1,
            height: '100%',
            background: isSelected ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.9)',
            transform: 'translateX(-50%)',
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
