import { useState } from "react";
import { SlideTile } from "./SlideTile";
import { TransitionTile } from "./TransitionTile";
import type { SlideItem, TransitionItem } from "./types";

interface SlideTrackProps {
  slideItems: SlideItem[];
  transitionItems: TransitionItem[];
  selectedSlideId: string;
  currentTime: number;
  pixelsPerSecond: number;
  onSelectSlide?: (slideId: string) => void;
  onSeek?: (time: number) => void;
  onSelectSlideManually?: (slideId: string) => void; // NEW: For manual slide selection
}

export function SlideTrack({
  slideItems,
  transitionItems,
  selectedSlideId,
  currentTime,
  pixelsPerSecond,
  onSelectSlide,
  onSeek,
  onSelectSlideManually,
}: SlideTrackProps) {
  const [hoverInfo, setHoverInfo] = useState<{ name: string; timeRange: string; x: number } | null>(null);

  // Determine which tiles are highlighted based on current time
  const getHighlightedSlides = () => {
    const highlighted = new Set<string>();
    
    // Check if we're in a transition
    const activeTransition = transitionItems.find(
      (t) => currentTime >= t.startTime && currentTime < t.startTime + t.duration
    );
    
    if (activeTransition) {
      // Highlight both outgoing and incoming slides during transition
      highlighted.add(activeTransition.fromSlideId);
      highlighted.add(activeTransition.toSlideId);
    } else {
      // Highlight the slide containing current time
      const activeSlide = slideItems.find(
        (s) => currentTime >= s.startTime && currentTime < s.startTime + s.duration
      );
      if (activeSlide) {
        highlighted.add(activeSlide.slideId);
      }
    }
    
    return highlighted;
  };

  const highlightedSlides = getHighlightedSlides();

  const handleTileHover = (e: React.MouseEvent, info: { name: string; timeRange: string } | null) => {
    if (info) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setHoverInfo({ ...info, x });
    } else {
      setHoverInfo(null);
    }
  };

  return (
    <div className="relative h-12">
      {/* Render slide tiles */}
      {slideItems.map((slideItem) => (
        <div
          key={slideItem.id}
          onMouseMove={(e) => handleTileHover(e, { name: slideItem.label, timeRange: `${slideItem.startTime.toFixed(1)}s - ${(slideItem.startTime + slideItem.duration).toFixed(1)}s` })}
          onMouseLeave={(e) => handleTileHover(e, null)}
        >
          <SlideTile
            slideItem={slideItem}
            isSelected={slideItem.slideId === selectedSlideId}
            isHighlighted={highlightedSlides.has(slideItem.slideId)}
            pixelsPerSecond={pixelsPerSecond}
            onClick={() => {
              console.log(`[SlideTrack] Slide tile clicked: ${slideItem.slideId}`);
              onSelectSlide?.(slideItem.slideId);
              // Use manual selection behavior - seek to end frame and prepare for restart
              if (onSelectSlideManually) {
                onSelectSlideManually(slideItem.slideId);
              } else if (onSeek) {
                // Fallback to old behavior
                onSeek(slideItem.startTime);
              }
            }}
            onHover={() => {}}
          />
          
          {/* Render overlap region if this slide has a transition */}
          {slideItem.hasTransition && slideItem.overlapStart !== null && slideItem.overlapEnd !== null && (
            <div
              className="absolute top-0 h-full bg-yellow-400/20 pointer-events-none"
              style={{
                left: `${slideItem.overlapStart * pixelsPerSecond}px`,
                width: `${(slideItem.overlapEnd - slideItem.overlapStart) * pixelsPerSecond}px`,
              }}
              title={`Overlap region: ${slideItem.overlapStart.toFixed(2)}s - ${slideItem.overlapEnd.toFixed(2)}s`}
            />
          )}
        </div>
      ))}
      
      {/* Render transition tiles */}
      {transitionItems.map((transitionItem) => (
        <div
          key={transitionItem.id}
          onMouseMove={(e) => handleTileHover(e, { name: transitionItem.type, timeRange: `${transitionItem.startTime.toFixed(1)}s - ${(transitionItem.startTime + transitionItem.duration).toFixed(1)}s` })}
          onMouseLeave={(e) => handleTileHover(e, null)}
        >
          <TransitionTile
            transitionItem={transitionItem}
            pixelsPerSecond={pixelsPerSecond}
            onClick={() => {
              console.log(`[SlideTrack] Transition tile clicked, selecting target slide: ${transitionItem.toSlide || transitionItem.toSlideId}`);
              const targetSlide = transitionItem.toSlide || transitionItem.toSlideId;
              if (targetSlide) {
                onSelectSlide?.(targetSlide);
                // Use manual selection behavior for the target slide
                if (onSelectSlideManually) {
                  onSelectSlideManually(targetSlide);
                } else if (onSeek) {
                  // Fallback to old behavior
                  onSeek(transitionItem.startTime);
                }
              }
            }}
            onHover={() => {}}
          />
        </div>
      ))}
      
      {/* Hover info tooltip */}
      {hoverInfo && (
        <div 
          className="absolute -top-8 px-2 py-1 bg-foreground text-background text-xs rounded shadow-lg z-50 pointer-events-none whitespace-nowrap"
          style={{ left: `${hoverInfo.x}px`, transform: 'translateX(-50%)' }}
        >
          <div className="font-medium">{hoverInfo.name}</div>
          <div className="text-[10px] opacity-80">{hoverInfo.timeRange}</div>
        </div>
      )}
    </div>
  );
}
