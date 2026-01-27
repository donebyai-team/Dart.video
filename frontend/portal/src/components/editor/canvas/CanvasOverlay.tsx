import { useMemo } from "react";
import SpotlightOverlay from "./overlays/SpotlightOverlay";
import { Resolution, SlideEffect, AnnotationObject, CanvasObject } from "@coasterai/pb/coasterai/core/v1/slide_pb";

interface CanvasOverlayProps {
  resolution: Resolution;
  effects?: SlideEffect[];
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
  selectedObjectId,
  onSelectObject,
  onUpdateObject,
  onUpdateEffect,
  onUpdateAnnotation,
  containerWidth,
  containerHeight,
}: CanvasOverlayProps) => {
  // Support both old and new architecture
   const spotlightEffects = effects.flatMap((e: SlideEffect) => {
      if (e.effect.case === "spotlight" && e.effect.value) {
        return [e.effect.value];
      }
      return [];
    });
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
  }

  return (
    <>   

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
