import { useState, useCallback } from "react";
import { Img } from "remotion";
import type { Resolution } from "@/types/slides";
import React from "react";

interface ImageContentProps {
  image: {
    src: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  };
  resolution: Resolution;
  isEditing?: boolean;
  onUpdate?: (updates: Partial<{
    src: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  }>) => void;
}

type Corner = "nw" | "ne" | "sw" | "se";

export const ImageContent: React.FC<ImageContentProps> = ({
  image,
  resolution,
  isEditing = false,
  onUpdate,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<Corner | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; imageX: number; imageY: number } | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; imageX: number; imageY: number; imageWidth: number; imageHeight: number } | null>(null);

  // Calculate percentage-based positioning for responsive scaling
  const leftPercent = (image.x / resolution.width) * 100;
  const topPercent = (image.y / resolution.height) * 100;
  const widthPercent = (image.width / resolution.width) * 100;
  const heightPercent = (image.height / resolution.height) * 100;

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!isEditing || !onUpdate) return;
    e.stopPropagation();

    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      imageX: image.x,
      imageY: image.y,
    });
  }, [isEditing, onUpdate, image.x, image.y]);

  const handleResizeStart = useCallback((corner: Corner, e: React.MouseEvent) => {
    if (!isEditing || !onUpdate) return;
    e.stopPropagation();

    setIsResizing(corner);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      imageX: image.x,
      imageY: image.y,
      imageWidth: image.width,
      imageHeight: image.height,
    });
  }, [isEditing, onUpdate, image.x, image.y, image.width, image.height]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && dragStart && onUpdate) {
      // Calculate delta in screen pixels
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      // Convert to resolution coordinates
      // Assume we're rendering at some scale - we need to account for that
      // For now, use a simple ratio based on the rendered size
      const scaleX = resolution.width / (window.innerWidth * (widthPercent / 100));
      const scaleY = resolution.height / (window.innerHeight * (heightPercent / 100));

      const newX = dragStart.imageX + deltaX * scaleX;
      const newY = dragStart.imageY + deltaY * scaleY;

      // Clamp to canvas bounds
      const clampedX = Math.max(0, Math.min(newX, resolution.width - image.width));
      const clampedY = Math.max(0, Math.min(newY, resolution.height - image.height));

      onUpdate({ x: clampedX, y: clampedY });
    }

    if (isResizing && resizeStart && onUpdate) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      // Convert to resolution coordinates
      const scaleX = resolution.width / (window.innerWidth * (widthPercent / 100));
      const scaleY = resolution.height / (window.innerHeight * (heightPercent / 100));

      let newX = resizeStart.imageX;
      let newY = resizeStart.imageY;
      let newWidth = resizeStart.imageWidth;
      let newHeight = resizeStart.imageHeight;

      // Handle different corners
      switch (isResizing) {
        case "nw":
          newX = resizeStart.imageX + deltaX * scaleX;
          newY = resizeStart.imageY + deltaY * scaleY;
          newWidth = resizeStart.imageWidth - deltaX * scaleX;
          newHeight = resizeStart.imageHeight - deltaY * scaleY;
          break;
        case "ne":
          newY = resizeStart.imageY + deltaY * scaleY;
          newWidth = resizeStart.imageWidth + deltaX * scaleX;
          newHeight = resizeStart.imageHeight - deltaY * scaleY;
          break;
        case "sw":
          newX = resizeStart.imageX + deltaX * scaleX;
          newWidth = resizeStart.imageWidth - deltaX * scaleX;
          newHeight = resizeStart.imageHeight + deltaY * scaleY;
          break;
        case "se":
          newWidth = resizeStart.imageWidth + deltaX * scaleX;
          newHeight = resizeStart.imageHeight + deltaY * scaleY;
          break;
      }

      // Enforce minimum size
      const minSize = 100;
      if (newWidth < minSize || newHeight < minSize) {
        return;
      }

      // Clamp to canvas bounds
      newX = Math.max(0, Math.min(newX, resolution.width - newWidth));
      newY = Math.max(0, Math.min(newY, resolution.height - newHeight));
      newWidth = Math.min(newWidth, resolution.width - newX);
      newHeight = Math.min(newHeight, resolution.height - newY);

      onUpdate({ x: newX, y: newY, width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, dragStart, resizeStart, onUpdate, resolution, image.width, image.height, widthPercent, heightPercent]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
    setDragStart(null);
    setResizeStart(null);
  }, []);

  // Add event listeners for mouse move/up
  React.useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      style={{
        position: "absolute",
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        width: `${widthPercent}%`,
        height: `${heightPercent}%`,
        transform: `rotate(${image.rotation || 0}deg)`,
        cursor: isEditing ? (isDragging ? "grabbing" : "grab") : "default",
        pointerEvents: isEditing ? "auto" : "none",
      }}
      onMouseDown={isEditing ? handleDragStart : undefined}
    >
      <Img src={image.src} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />

      {isEditing && (
        <>
          {/* Resize handles at corners */}
          <div
            className="resize-handle"
            style={{
              position: "absolute",
              left: "-6px",
              top: "-6px",
              width: "12px",
              height: "12px",
              backgroundColor: "hsl(var(--primary))",
              border: "2px solid white",
              borderRadius: "50%",
              cursor: "nw-resize",
              pointerEvents: "auto",
            }}
            onMouseDown={(e) => handleResizeStart("nw", e)}
          />
          <div
            className="resize-handle"
            style={{
              position: "absolute",
              right: "-6px",
              top: "-6px",
              width: "12px",
              height: "12px",
              backgroundColor: "hsl(var(--primary))",
              border: "2px solid white",
              borderRadius: "50%",
              cursor: "ne-resize",
              pointerEvents: "auto",
            }}
            onMouseDown={(e) => handleResizeStart("ne", e)}
          />
          <div
            className="resize-handle"
            style={{
              position: "absolute",
              left: "-6px",
              bottom: "-6px",
              width: "12px",
              height: "12px",
              backgroundColor: "hsl(var(--primary))",
              border: "2px solid white",
              borderRadius: "50%",
              cursor: "sw-resize",
              pointerEvents: "auto",
            }}
            onMouseDown={(e) => handleResizeStart("sw", e)}
          />
          <div
            className="resize-handle"
            style={{
              position: "absolute",
              right: "-6px",
              bottom: "-6px",
              width: "12px",
              height: "12px",
              backgroundColor: "hsl(var(--primary))",
              border: "2px solid white",
              borderRadius: "50%",
              cursor: "se-resize",
              pointerEvents: "auto",
            }}
            onMouseDown={(e) => handleResizeStart("se", e)}
          />

          {/* Border to show selection */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              border: "2px solid hsl(var(--primary))",
              borderRadius: "8px",
              pointerEvents: "none",
            }}
          />
        </>
      )}
    </div>
  );
};
