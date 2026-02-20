import { useMemo } from "react";
import SpotlightOverlay from "./overlays/SpotlightOverlay";
import { SpotlightEffect, CalloutEffect, ZoomEffect } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import CalloutOverlay from "./overlays/CalloutOverlay";
import ZoomOverlay from "./overlays/ZoomOverlay";
import { Resolution } from "@coasterai/pb/coasterai/core/v1/video_pb";

interface CanvasOverlayProps {
  resolution: Resolution;
  spotlights?: SpotlightEffect[];
  callouts?: CalloutEffect[];
  zooms?: ZoomEffect[];
  selectedEffectId: string | null;
  onSelectObject: (id: string | null) => void;
  onUpdateSpotlight?: (id: string, updates: Partial<SpotlightEffect>) => void;
  onUpdateCallout?: (id: string, updates: Partial<CalloutEffect>) => void;
  onUpdateZoom?: (id: string, updates: Partial<ZoomEffect>) => void;
  containerWidth: number;
  containerHeight: number;
}

const CanvasOverlay = ({
  resolution,
  spotlights = [],
  callouts = [],
  zooms = [],
  selectedEffectId,
  onSelectObject,
  onUpdateSpotlight,
  onUpdateCallout,
  onUpdateZoom,
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
          isSelected={selectedEffectId === spotlight.id}
          onSelect={() => onSelectObject(spotlight.id)}
          onUpdate={(updates) => {
            if (onUpdateSpotlight) {
              onUpdateSpotlight(spotlight.id, updates as Partial<SpotlightEffect>);
            }
          }}
        />
      ))}

      {/* Render callout effects using CalloutOverlay for interactive editing */}

      {callouts.map((callout) => (
        <CalloutOverlay
          key={callout.id}
          callout={callout}
          resolution={resolution}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          isSelected={selectedEffectId === callout.id}
          onSelect={() => onSelectObject(callout.id)}
          onUpdate={(updates) => {
            if (onUpdateCallout) {
              onUpdateCallout(callout.id, updates as Partial<CalloutEffect>);
            }
          }}
        />
      ))}

      {/* Render zoom effects using ZoomOverlay for interactive editing */}
      {zooms.map((zoom) => (
        <ZoomOverlay
          key={zoom.id}
          zoom={zoom}
          resolution={resolution}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          isSelected={selectedEffectId === zoom.id}
          onSelect={() => onSelectObject(zoom.id)}
          onUpdate={(updates) => {
            if (onUpdateZoom) {
              onUpdateZoom(zoom.id, updates as Partial<ZoomEffect>);
            }
          }}
        />
      ))}
    </>
  );
};

export default CanvasOverlay;
