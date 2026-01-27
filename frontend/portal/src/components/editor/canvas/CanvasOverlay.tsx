import { useMemo } from "react";
import SpotlightOverlay from "./overlays/SpotlightOverlay";
import { Resolution, CanvasObject, SpotlightEffect } from "@coasterai/pb/coasterai/core/v1/slide_pb";

interface CanvasOverlayProps {
  resolution: Resolution;
  spotlights?: SpotlightEffect[];
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  onUpdateSpotlight?: (id: string, updates: Partial<SpotlightEffect>) => void;
  containerWidth: number;
  containerHeight: number;
}

const CanvasOverlay = ({
  resolution,
  spotlights = [],
  selectedObjectId,
  onSelectObject,
  onUpdateSpotlight,
  containerWidth,
  containerHeight,
}: CanvasOverlayProps) => {

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
      {spotlights.map((spotlight) => (
        <SpotlightOverlay
          key={spotlight.id}
          spotlight={spotlight}
          resolution={resolution}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          isSelected={selectedObjectId === spotlight.id}
          onSelect={() => onSelectObject(spotlight.id)}
          onUpdate={(updates) => {
            if (onUpdateSpotlight) {
              onUpdateSpotlight(spotlight.id, updates as Partial<SpotlightEffect>);
            }
          }}
        />
      ))}
    </>
  );
};

export default CanvasOverlay;
