import React, { useState, useRef, useEffect } from "react";

interface TemplateContainerProps {
  children: React.ReactNode;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  canvasWidth: number;
  canvasHeight: number;
  isEditing?: boolean;
  isSelected?: boolean;
  onUpdate?: (updates: { x: number; y: number; width: number; height: number }) => void;
  onSelect?: () => void;
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
}) => {
  // Default to 80% of canvas, centered
  const defaultWidth = canvasWidth * 0.8;
  const defaultHeight = canvasHeight * 0.8;
  const defaultX = (canvasWidth - defaultWidth) / 2;
  const defaultY = (canvasHeight - defaultHeight) / 2;

  const [position, setPosition] = useState({
    x: initialX ?? defaultX,
    y: initialY ?? defaultY,
    width: initialWidth ?? defaultWidth,
    height: initialHeight ?? defaultHeight,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, startWidth: 0, startHeight: 0, startX: 0, startY: 0 });
  const rafRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (initialX !== undefined) setPosition(prev => ({ ...prev, x: initialX }));
    if (initialY !== undefined) setPosition(prev => ({ ...prev, y: initialY }));
    if (initialWidth !== undefined) setPosition(prev => ({ ...prev, width: initialWidth }));
    if (initialHeight !== undefined) setPosition(prev => ({ ...prev, height: initialHeight }));
  }, [initialX, initialY, initialWidth, initialHeight]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditing) return;
    e.stopPropagation();
    
    onSelect?.();
    
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: position.x,
      startY: position.y,
    };
  };

  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    if (!isEditing || !isSelected) return;
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeHandle(handle);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startWidth: position.width,
      startHeight: position.height,
      startX: position.x,
      startY: position.y,
    };
  };

  useEffect(() => {
    if (!isEditing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;
        
        const newX = Math.max(0, Math.min(canvasWidth - position.width, dragStartRef.current.startX + deltaX));
        const newY = Math.max(0, Math.min(canvasHeight - position.height, dragStartRef.current.startY + deltaY));
        
        // Store pending update and schedule RAF
        pendingUpdateRef.current = { ...position, x: newX, y: newY };
        
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            if (pendingUpdateRef.current) {
              setPosition(pendingUpdateRef.current);
              pendingUpdateRef.current = null;
            }
            rafRef.current = null;
          });
        }
      } else if (isResizing && resizeHandle) {
        const deltaX = e.clientX - resizeStartRef.current.x;
        const deltaY = e.clientY - resizeStartRef.current.y;
        
        let newWidth = resizeStartRef.current.startWidth;
        let newHeight = resizeStartRef.current.startHeight;
        let newX = resizeStartRef.current.startX;
        let newY = resizeStartRef.current.startY;

        if (resizeHandle.includes('e')) {
          newWidth = Math.max(100, resizeStartRef.current.startWidth + deltaX);
        }
        if (resizeHandle.includes('w')) {
          newWidth = Math.max(100, resizeStartRef.current.startWidth - deltaX);
          newX = resizeStartRef.current.startX + deltaX;
        }
        if (resizeHandle.includes('s')) {
          newHeight = Math.max(100, resizeStartRef.current.startHeight + deltaY);
        }
        if (resizeHandle.includes('n')) {
          newHeight = Math.max(100, resizeStartRef.current.startHeight - deltaY);
          newY = resizeStartRef.current.startY + deltaY;
        }

        // Constrain to canvas bounds
        newX = Math.max(0, Math.min(canvasWidth - newWidth, newX));
        newY = Math.max(0, Math.min(canvasHeight - newHeight, newY));
        newWidth = Math.min(canvasWidth - newX, newWidth);
        newHeight = Math.min(canvasHeight - newY, newHeight);

        // Store pending update and schedule RAF
        pendingUpdateRef.current = { x: newX, y: newY, width: newWidth, height: newHeight };
        
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            if (pendingUpdateRef.current) {
              setPosition(pendingUpdateRef.current);
              pendingUpdateRef.current = null;
            }
            rafRef.current = null;
          });
        }
      }
    };

    const handleMouseUp = () => {
      if (isDragging || isResizing) {
        // Cancel any pending RAF
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        // Apply final pending update if any
        if (pendingUpdateRef.current) {
          setPosition(pendingUpdateRef.current);
          onUpdate?.(pendingUpdateRef.current);
          pendingUpdateRef.current = null;
        } else {
          onUpdate?.(position);
        }
      }
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        // Cleanup RAF on unmount
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };
    }
  }, [isDragging, isResizing, resizeHandle, position, canvasWidth, canvasHeight, isEditing, onUpdate]);

  const showBorder = isEditing && isSelected;
  const showHandles = isEditing && isSelected;
  const showOutline = isEditing && !isSelected; // Only show outline when editing but not selected

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: position.width,
        height: position.height,
        cursor: isEditing ? (isDragging ? 'grabbing' : isSelected ? 'move' : 'pointer') : 'default',
        border: showBorder ? '4px solid #3b82f6' : 'none',
        boxShadow: showBorder ? '0 0 0 3px rgba(59, 130, 246, 0.3), 0 4px 16px rgba(0, 0, 0, 0.4)' : 'none',
        // Only show outline when editing and not selected
        outline: showOutline ? '2px dashed rgba(255, 255, 255, 0.5)' : 'none',
        outlineOffset: '-2px',
        pointerEvents: isEditing ? 'auto' : 'none',
        // Disable transitions during drag/resize for smoothness
        transition: (isDragging || isResizing) ? 'none' : 'border 0.15s ease, box-shadow 0.15s ease, outline 0.15s ease',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        willChange: (isDragging || isResizing) ? 'transform' : 'auto',
      }}
      onMouseDown={handleMouseDown}
    >
      <div style={{ width: '100%', height: '100%' }}>
        {children}
      </div>
      
      {/* Resize handles */}
      {showHandles && (
        <>
          {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((handle) => (
            <div
              key={handle}
              onMouseDown={(e) => handleResizeMouseDown(e, handle)}
              style={{
                position: 'absolute',
                width: handle.length === 1 ? 8 : 12,
                height: handle.length === 1 ? 8 : 12,
                backgroundColor: '#3b82f6',
                border: '2px solid white',
                borderRadius: '50%',
                cursor: `${handle}-resize`,
                zIndex: 10,
                pointerEvents: 'auto',
                ...(handle.includes('n') && { top: -6 }),
                ...(handle.includes('s') && { bottom: -6 }),
                ...(handle.includes('w') && { left: -6 }),
                ...(handle.includes('e') && { right: -6 }),
                ...(!handle.includes('n') && !handle.includes('s') && { top: '50%', transform: 'translateY(-50%)' }),
                ...(!handle.includes('w') && !handle.includes('e') && { left: '50%', transform: 'translateX(-50%)' }),
                ...(handle.includes('n') && handle.includes('w') && { top: -6, left: -6 }),
                ...(handle.includes('n') && handle.includes('e') && { top: -6, right: -6 }),
                ...(handle.includes('s') && handle.includes('w') && { bottom: -6, left: -6 }),
                ...(handle.includes('s') && handle.includes('e') && { bottom: -6, right: -6 }),
              }}
            />
          ))}
        </>
      )}
    </div>
  );
};

export default TemplateContainer;
