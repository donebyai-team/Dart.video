import { CanvasObject, Resolution, SpotlightEffect } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { useState, useRef, useCallback, useEffect } from "react";

interface SpotlightOverlayProps {
  spotlight: SpotlightEffect;
  resolution: Resolution;
  containerWidth: number;
  containerHeight: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<CanvasObject>) => void;
}

type ResizeHandle = "nw" | "ne" | "sw" | "se";

const SpotlightOverlay = ({
  spotlight,
  resolution,
  containerWidth,
  isSelected,
  onSelect,
  onUpdate,
}: SpotlightOverlayProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<ResizeHandle | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Calculate scale for converting between container and resolution coordinates
  const scale = containerWidth / resolution.width;

  // Get spotlight dimensions with defaults
  const x = spotlight.x || 100;
  const y = spotlight.y || 100;
  const width = spotlight.width || 200;
  const height = spotlight.height || 150;
  const borderRadius = spotlight.borderRadius || 8;

  // Scaled dimensions for display
  const scaledX = x * scale;
  const scaledY = y * scale;
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const scaledBorderRadius = borderRadius * scale;

  const handleMouseDown = useCallback((e: React.MouseEvent, handle?: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();

    if (handle) {
      setIsResizing(handle);
    } else {
      setIsDragging(true);
    }

    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPosition({ x, y, width, height });
  }, [x, y, width, height, onSelect]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging && !isResizing) return;

    const dx = (e.clientX - dragStart.x) / scale;
    const dy = (e.clientY - dragStart.y) / scale;

    if (isDragging) {
      const newX = Math.max(0, Math.min(resolution.width - width, initialPosition.x + dx));
      const newY = Math.max(0, Math.min(resolution.height - height, initialPosition.y + dy));
      onUpdate({ x: newX, y: newY });
    } else if (isResizing) {
      let newX = initialPosition.x;
      let newY = initialPosition.y;
      let newWidth = initialPosition.width;
      let newHeight = initialPosition.height;

      switch (isResizing) {
        case "se":
          newWidth = Math.max(50, initialPosition.width + dx);
          newHeight = Math.max(50, initialPosition.height + dy);
          break;
        case "sw":
          newX = Math.max(0, initialPosition.x + dx);
          newWidth = Math.max(50, initialPosition.width - dx);
          newHeight = Math.max(50, initialPosition.height + dy);
          break;
        case "ne":
          newY = Math.max(0, initialPosition.y + dy);
          newWidth = Math.max(50, initialPosition.width + dx);
          newHeight = Math.max(50, initialPosition.height - dy);
          break;
        case "nw":
          newX = Math.max(0, initialPosition.x + dx);
          newY = Math.max(0, initialPosition.y + dy);
          newWidth = Math.max(50, initialPosition.width - dx);
          newHeight = Math.max(50, initialPosition.height - dy);
          break;
      }

      // Clamp to resolution bounds
      newWidth = Math.min(newWidth, resolution.width - newX);
      newHeight = Math.min(newHeight, resolution.height - newY);

      onUpdate({ x: newX, y: newY, width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, dragStart, initialPosition, scale, resolution, onUpdate, width, height]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleSize = 10;
  console.log(isSelected, "selected")

  return (
    <div
      ref={overlayRef}
      className="absolute pointer-events-auto"
      style={{
        left: scaledX,
        top: scaledY,
        width: scaledWidth,
        height: scaledHeight,
        cursor: isDragging ? "grabbing" : "grab",
        zIndex: 30,
      }}
      onMouseDown={(e) => handleMouseDown(e)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Spotlight highlight area (clear rectangle) */}
      <div
        className="w-full h-full border-2 transition-colors"
        style={{
          borderColor: isSelected ? "hsl(var(--primary))" : "rgba(255, 255, 255, 0.8)",
          borderRadius: scaledBorderRadius,
          boxShadow: isSelected 
            ? "0 0 0 2px hsl(var(--primary) / 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.3)" 
            : "0 0 20px rgba(255, 255, 255, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.2)",
        }}
      />

      {/* Resize handles - only show when selected */}
      {isSelected && (
        <>
          {/* NW */}
          <div
            className="absolute bg-white border-2 border-primary rounded-sm cursor-nw-resize"
            style={{
              left: -handleSize / 2,
              top: -handleSize / 2,
              width: handleSize,
              height: handleSize,
            }}
            onMouseDown={(e) => handleMouseDown(e, "nw")}
          />
          {/* NE */}
          <div
            className="absolute bg-white border-2 border-primary rounded-sm cursor-ne-resize"
            style={{
              right: -handleSize / 2,
              top: -handleSize / 2,
              width: handleSize,
              height: handleSize,
            }}
            onMouseDown={(e) => handleMouseDown(e, "ne")}
          />
          {/* SW */}
          <div
            className="absolute bg-white border-2 border-primary rounded-sm cursor-sw-resize"
            style={{
              left: -handleSize / 2,
              bottom: -handleSize / 2,
              width: handleSize,
              height: handleSize,
            }}
            onMouseDown={(e) => handleMouseDown(e, "sw")}
          />
          {/* SE */}
          <div
            className="absolute bg-white border-2 border-primary rounded-sm cursor-se-resize"
            style={{
              right: -handleSize / 2,
              bottom: -handleSize / 2,
              width: handleSize,
              height: handleSize,
            }}
            onMouseDown={(e) => handleMouseDown(e, "se")}
          />
        </>
      )}
    </div>
  );
};

export default SpotlightOverlay;
