import { useMemo } from "react";
import type { CanvasObject, Resolution, AnnotationObject, SlideEffect, SpotlightEffect as SpotlightEffectType } from "@/types/slides";
import SpotlightOverlay from "./overlays/SpotlightOverlay";

interface CanvasOverlayProps {
  resolution: Resolution;
  effects?: SlideEffect[];
  annotations?: AnnotationObject[];
  // OLD ARCHITECTURE: Backward compatibility
  canvasObjects?: CanvasObject[];
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  onUpdateObject?: (id: string, updates: Partial<CanvasObject>) => void;
  // NEW ARCHITECTURE: Separate update handlers
  onUpdateEffect?: (id: string, updates: Partial<SlideEffect>) => void;
  onUpdateAnnotation?: (id: string, updates: Partial<AnnotationObject>) => void;
  containerWidth: number;
  containerHeight: number;
}

const CanvasOverlay = ({
  resolution,
  effects = [],
  annotations = [],
  canvasObjects = [],
  selectedObjectId,
  onSelectObject,
  onUpdateObject,
  onUpdateEffect,
  onUpdateAnnotation,
  containerWidth,
  containerHeight,
}: CanvasOverlayProps) => {
  // Support both old and new architecture
  const allAnnotations = annotations.length > 0 ? annotations : canvasObjects.filter(obj => obj.type !== "spotlight");
  const allEffects = effects.length > 0 ? effects : canvasObjects.filter(obj => obj.type === "spotlight") as SlideEffect[];
  const { scale } = useMemo(() => {
    if (!containerWidth || !containerHeight) {
      return { scale: 1 };
    }

    const aspectRatio = resolution.width / resolution.height;
    const containerAspect = containerWidth / containerHeight;

    let cw: number;
    if (aspectRatio > containerAspect) {
      cw = containerWidth;
    } else {
      cw = containerHeight * aspectRatio;
    }

    return { scale: cw / resolution.width };
  }, [resolution.width, resolution.height, containerWidth, containerHeight]);

  if (!containerWidth || !containerHeight) {
    return null;
  }

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onSelectObject(null);
    }
  };

  const selectObject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    console.debug("[CanvasOverlay] selectObject", { id });
    onSelectObject(id);
  };

  const renderAnnotation = (obj: AnnotationObject | CanvasObject) => {
    const isSelected = selectedObjectId === obj.id;
    const opacity = ('opacity' in obj ? (obj.opacity ?? 100) : 100) / 100;

    switch (obj.type) {
      case "callout":
        return (
          <g
            key={obj.id}
            opacity={opacity}
            onClick={(e) => selectObject(e, obj.id)}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={obj.x * scale}
              cy={obj.y * scale}
              r={20 * scale}
              fill={obj.color || "#ef4444"}
              filter={isSelected ? "drop-shadow(0 0 4px hsl(var(--primary)))" : undefined}
            />
            <text
              x={obj.x * scale}
              y={obj.y * scale + 8 * scale}
              fontSize={24 * scale}
              fill="#ffffff"
              fontWeight="bold"
              textAnchor="middle"
            >
              !
            </text>
          </g>
        );

      case "spotlight": {
        // Spotlight is rendered separately using SpotlightOverlay component
        return null;
      }

      default:
        return null;
    }
  };

  // Separate spotlight effects for SpotlightOverlay rendering
  const spotlightEffects = allEffects.filter(e => e.type === "spotlight");

  return (
    <>
      <svg
        width={containerWidth}
        height={containerHeight}
        className="absolute inset-0"
        onClick={handleBackgroundClick}
        style={{ pointerEvents: "auto", cursor: "pointer" }}
        pointerEvents="all"
      >
        {allAnnotations.map(renderAnnotation)}
      </svg>

      {/* Render spotlight effects using SpotlightOverlay for interactive editing */}
      {spotlightEffects.map((spotlight) => (
        <SpotlightOverlay
          key={spotlight.id}
          spotlight={spotlight}
          resolution={resolution}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          isSelected={selectedObjectId === spotlight.id}
          onSelect={() => onSelectObject(spotlight.id)}
          onUpdate={(updates) => {
            if (onUpdateEffect) {
              onUpdateEffect(spotlight.id, updates as Partial<SlideEffect>);
            } else if (onUpdateObject) {
              // Fallback for old architecture
              onUpdateObject(spotlight.id, updates as Partial<CanvasObject>);
            }
          }}
        />
      ))}
    </>
  );
};

export default CanvasOverlay;
