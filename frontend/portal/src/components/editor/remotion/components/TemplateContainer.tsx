import React, { useState, useRef, useEffect } from 'react'
import { SetStateAction } from 'react'

interface TemplateContainerProps {
  children: React.ReactNode
  x?: number
  y?: number
  width?: number
  height?: number
  canvasWidth: number
  canvasHeight: number
  isEditing?: boolean
  isSelected?: boolean
  onUpdate?: (updates: { x: number; y: number; width: number; height: number }) => void
  onSelect?: () => void
  setEditing: React.Dispatch<SetStateAction<boolean>>
  /** Pass the canvas DOM element so we can read its actual rendered scale */
  canvasRef?: React.RefObject<HTMLElement>
}

/**
 * TemplateContainer Component
 * Wraps template content with selection, dragging, and resizing capabilities
 * By default, templates occupy 80% of canvas area, centered
 */
export const TemplateContainer: React.FC<TemplateContainerProps> = ({
  children,
  x: initialX,
  y: initialY,
  width: initialWidth,
  height: initialHeight,
  canvasWidth,
  canvasHeight,
  isEditing = false,
  isSelected = false,
  onUpdate,
  onSelect,
  setEditing,
  canvasRef
}) => {
  // Default to 80% of canvas, centered
  const defaultWidth = canvasWidth * 0.8
  const defaultHeight = canvasHeight * 0.8
  const defaultX = (canvasWidth - defaultWidth) / 2
  const defaultY = (canvasHeight - defaultHeight) / 2

  const [position, setPosition] = useState({
    x: initialX ?? defaultX,
    y: initialY ?? defaultY,
    width: initialWidth ?? defaultWidth,
    height: initialHeight ?? defaultHeight
  })

  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 })
  const resizeStartRef = useRef({ x: 0, y: 0, startWidth: 0, startHeight: 0, startX: 0, startY: 0 })
  const rafRef = useRef<number | null>(null)
  const pendingUpdateRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Store the aspect ratio at the start of each resize
  const aspectRatioRef = useRef<number>(1)

  useEffect(() => {
    if (initialX !== undefined) setPosition(prev => ({ ...prev, x: initialX }))
    if (initialY !== undefined) setPosition(prev => ({ ...prev, y: initialY }))
    if (initialWidth !== undefined) setPosition(prev => ({ ...prev, width: initialWidth }))
    if (initialHeight !== undefined) setPosition(prev => ({ ...prev, height: initialHeight }))
  }, [initialX, initialY, initialWidth, initialHeight])

  /**
   * Reads the effective CSS scale applied to the canvas element.
   */
  const getCanvasScale = (): { x: number; y: number } => {
    const el = canvasRef?.current ?? (containerRef.current?.closest('[data-canvas]') as HTMLElement | null)

    if (el) {
      const rect = el.getBoundingClientRect()
      return {
        x: rect.width / canvasWidth,
        y: rect.height / canvasHeight
      }
    }

    let node: HTMLElement | null = containerRef.current?.parentElement ?? null
    let sx = 1,
      sy = 1
    while (node && node !== document.body) {
      const matrix = new DOMMatrix(window.getComputedStyle(node).transform)
      if (matrix.a && matrix.a !== 1) sx *= matrix.a
      if (matrix.d && matrix.d !== 1) sy *= matrix.d
      node = node.parentElement
    }
    return { x: sx, y: sy }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditing) return
    e.stopPropagation()

    onSelect?.()

    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: position.x,
      startY: position.y
    }
  }

  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    if (!isEditing) return
    e.stopPropagation()

    // Capture aspect ratio at the moment resize begins
    aspectRatioRef.current = position.width / position.height

    setIsResizing(true)
    setResizeHandle(handle)
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startWidth: position.width,
      startHeight: position.height,
      startX: position.x,
      startY: position.y
    }
  }

  useEffect(() => {
    if (!isEditing) return

    const handleMouseMove = (e: MouseEvent) => {
      const scale = getCanvasScale()

      if (isDragging) {
        const deltaX = (e.clientX - dragStartRef.current.x) / scale.x
        const deltaY = (e.clientY - dragStartRef.current.y) / scale.y

        const newX = Math.max(0, Math.min(canvasWidth - position.width, dragStartRef.current.startX + deltaX))
        const newY = Math.max(0, Math.min(canvasHeight - position.height, dragStartRef.current.startY + deltaY))

        pendingUpdateRef.current = { ...position, x: newX, y: newY }

        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            if (pendingUpdateRef.current) {
              setPosition(pendingUpdateRef.current)
              pendingUpdateRef.current = null
            }
            rafRef.current = null
          })
        }
      } else if (isResizing && resizeHandle) {
        const deltaX = (e.clientX - resizeStartRef.current.x) / scale.x
        const deltaY = (e.clientY - resizeStartRef.current.y) / scale.y

        const ar = aspectRatioRef.current
        const { startWidth, startHeight, startX, startY } = resizeStartRef.current

        // Determine the dominant delta based on the corner being dragged,
        // then derive the other dimension from the aspect ratio.
        let newWidth = startWidth
        let newHeight = startHeight
        let newX = startX
        let newY = startY

        if (resizeHandle === 'se') {
          // Dominant: whichever delta is larger in magnitude
          const dommDelta = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : deltaY * ar
          newWidth = Math.max(100, startWidth + dommDelta)
          newHeight = newWidth / ar
        } else if (resizeHandle === 'sw') {
          const dommDelta = Math.abs(deltaX) >= Math.abs(deltaY) ? -deltaX : deltaY * ar
          newWidth = Math.max(100, startWidth + dommDelta)
          newHeight = newWidth / ar
          newX = startX + (startWidth - newWidth)
        } else if (resizeHandle === 'ne') {
          const dommDelta = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : -deltaY * ar
          newWidth = Math.max(100, startWidth + dommDelta)
          newHeight = newWidth / ar
          newY = startY + (startHeight - newHeight)
        } else if (resizeHandle === 'nw') {
          const dommDelta = Math.abs(deltaX) >= Math.abs(deltaY) ? -deltaX : -deltaY * ar
          newWidth = Math.max(100, startWidth + dommDelta)
          newHeight = newWidth / ar
          newX = startX + (startWidth - newWidth)
          newY = startY + (startHeight - newHeight)
        }

        // Constrain to canvas bounds
        newX = Math.max(0, Math.min(canvasWidth - newWidth, newX))
        newY = Math.max(0, Math.min(canvasHeight - newHeight, newY))
        newWidth = Math.min(canvasWidth - newX, newWidth)
        newHeight = Math.min(canvasHeight - newY, newHeight)

        pendingUpdateRef.current = { x: newX, y: newY, width: newWidth, height: newHeight }

        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            if (pendingUpdateRef.current) {
              setPosition(pendingUpdateRef.current)
              pendingUpdateRef.current = null
            }
            rafRef.current = null
          })
        }
      }
    }

    const handleMouseUp = () => {
      if (isDragging || isResizing) {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
        if (pendingUpdateRef.current) {
          setPosition(pendingUpdateRef.current)
          onUpdate?.(pendingUpdateRef.current)
          pendingUpdateRef.current = null
        } else {
          onUpdate?.(position)
        }
      }
      setIsDragging(false)
      setIsResizing(false)
      setResizeHandle(null)
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
  }, [isDragging, isResizing, resizeHandle, position, canvasWidth, canvasHeight, isEditing, onUpdate])

  const showBorder = isEditing
  const showHandles = isEditing
  const showOutline = isEditing 

  const HANDLE_VISUAL_PX = 10

  const HandleDot = ({ handle }: { handle: string }) => {
    const scale = getCanvasScale()
    const scaleCompX = 1 / scale.x
    const scaleCompY = 1 / scale.y

    const logW = HANDLE_VISUAL_PX * scaleCompX
    const logH = HANDLE_VISUAL_PX * scaleCompY

    const hw = logW / 2
    const hh = logH / 2

    const posStyle: React.CSSProperties = {}

    if (handle.includes('n')) posStyle.top = -hh
    if (handle.includes('s')) posStyle.bottom = -hh
    if (handle.includes('w')) posStyle.left = -hw
    if (handle.includes('e')) posStyle.right = -hw

    const hitPad = 8 * Math.max(scaleCompX, scaleCompY)

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (!isResizing && containerRef && containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setEditing(false)
        }
      }

      if (isEditing) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isEditing, setEditing, containerRef, isResizing])

    return (
      <div
        onMouseDown={e => handleResizeMouseDown(e, handle)}
        style={{
          position: 'absolute',
          cursor: `${handle}-resize`,
          zIndex: 10,
          pointerEvents: 'auto',
          width: logW,
          height: logH,
          ...posStyle
        }}
      >
        {/* Enlarged invisible hit area */}
        <div style={{ position: 'absolute', inset: -hitPad, cursor: `${handle}-resize` }} />
        {/* Visible dot */}
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#ffffff',
            border: `${2 * Math.max(scaleCompX, scaleCompY)}px solid #3b82f6`,
            borderRadius: '50%',
            boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
            boxSizing: 'border-box'
          }}
        />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: position.width,
        height: position.height,
        cursor: isEditing ? (isDragging ? 'grabbing' : isSelected ? 'move' : 'pointer') : 'default',
        border: showBorder ? '2px solid #3b82f6' : 'none',
        boxShadow: showBorder ? '0 0 0 3px rgba(59, 130, 246, 0.3), 0 4px 16px rgba(0, 0, 0, 0.4)' : 'none',
        outline: showOutline ? '2px dashed rgba(255, 255, 255, 0.5)' : 'none',
        outlineOffset: '-2px',
        pointerEvents: isEditing ? 'auto' : 'none',
        transition: isDragging || isResizing ? 'none' : 'border 0.15s ease, box-shadow 0.15s ease, outline 0.15s ease',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        willChange: isDragging || isResizing ? 'transform' : 'auto'
      }}
      onMouseDown={handleMouseDown}
    >
      <div style={{ width: '100%', height: '100%' }}>{children}</div>

      {showHandles && (
        <>
          {/* Corner handles only — middle handles removed */}
          {['nw', 'ne', 'se', 'sw'].map(handle => (
            <HandleDot key={handle} handle={handle} />
          ))}
        </>
      )}
    </div>
  )
}

export default TemplateContainer
