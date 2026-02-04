import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { TimeMarkerRow } from "./TimeMarkerRow";
import { SlideTrack } from "./SlideTrack";
import { OverlayTracks } from "./OverlayTracks";
import {
  calculateRemotionSlideItems,
  calculateTransitionOverlays,
  calculateOverlayItems,
  assignOverlayTracks,
  DEFAULT_PIXELS_PER_SECOND,
} from "./timelineCalculations";
import type { TimelineSlide } from "./types";
import { PlayHead } from "./PlayHead";
import { calculateRealTotalFrames } from "../frame_calculations";
import { useVideoStore } from "@/stores/video";
import { SlideType } from "@coasterai/pb/coasterai/core/v1/slide_pb";

interface PlayerTimelineProps {
  slides: TimelineSlide[];
  totalDuration: number;
  totalFrames: number;
  currentFrame: number;
  onSeek: (frame: number) => void;
  onSelectSlide?: (slideId: string) => void;
  onSelectOverlay?: (overlayId: string, slideId: string) => void;
  onSelectSlideManually?: (slideId: string) => void; // NEW: For manual slide selection
  fps: number;
  isDragging?: boolean; // NEW: To indicate when scrubbing is happening
  onDraggingChange?: (isDragging: boolean) => void; // NEW: To notify parent of drag state
}

const PlayerTimeline = ({
  slides,
  totalDuration,
  totalFrames,
  currentFrame,
  onSeek,
  onSelectSlide,
  onSelectOverlay,
  onSelectSlideManually,
  fps,
  isDragging: externalIsDragging = false,
  onDraggingChange,
}: PlayerTimelineProps) => {

  const selectedSlideId = useVideoStore(s => s.selectedSlide)?.slide.id;
  const selectedObjectId = useVideoStore(s => s.selectedObjectId);

  const [hoveredTime, setHoveredTime] = useState<number | null>(null);
  const [internalIsDragging, setInternalIsDragging] = useState(false);
  const [dragFrame, setDragFrame] = useState<number | null>(null); // Track drag position separately
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const prevSelectedSlideIdRef = useRef<string>(selectedSlideId!);

  // Use external dragging state if provided, otherwise use internal
  const isDragging = externalIsDragging || internalIsDragging;

  // Use drag frame during dragging, otherwise use current frame
  const displayFrame = isDragging && dragFrame !== null ? dragFrame : currentFrame;
  const displayTime = displayFrame / fps;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const pixelsPerSecond = DEFAULT_PIXELS_PER_SECOND;
  const currentTime = currentFrame / fps;

  // Calculate timeline items using Remotion-accurate calculations
  const { slideItems, transitionItems, overlayItems } = useMemo(() => {
    const slideItems = calculateRemotionSlideItems(slides, pixelsPerSecond, fps);
    const transitionItems = calculateTransitionOverlays(slides, pixelsPerSecond, fps);
    const overlayItems = assignOverlayTracks(
      calculateOverlayItems(slides, fps)
    );

    return { slideItems, transitionItems, overlayItems };
  }, [slides, pixelsPerSecond, fps]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't handle clicks if we're dragging or just finished dragging
    if (isDragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / e.currentTarget.offsetWidth;
    const newFrame = Math.round(percentage * totalFrames);
    onSeek(newFrame);
  };

  const handleTimelineHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / e.currentTarget.offsetWidth;
    setHoveredTime(percentage * totalDuration);
  };

  // Handle scrubber drag functionality - direct cursor following
  const handleScrubberMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setInternalIsDragging(true);
    onDraggingChange?.(true);

    // Add global mouse event listeners
    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineContainerRef.current) return;

      const rect = timelineContainerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;

      // Direct calculation - scrubber follows cursor exactly
      const percentage = Math.max(0, Math.min(1, mouseX / rect.width));
      const newFrame = Math.round(percentage * totalFrames);

      // Only update visual position - no seeking at all during drag
      setDragFrame(newFrame);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!timelineContainerRef.current) return;

      const rect = timelineContainerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;

      // Direct calculation for final position
      const percentage = Math.max(0, Math.min(1, mouseX / rect.width));
      const finalFrame = Math.round(percentage * totalFrames);

      setInternalIsDragging(false);
      onDraggingChange?.(false);
      setDragFrame(null);

      // Only seek once at the very end
      onSeek(finalFrame);

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    // Immediately update position to cursor on mouse down
    const rect = timelineContainerRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, mouseX / rect.width));
      const newFrame = Math.round(percentage * totalFrames);
      setDragFrame(newFrame);
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [totalFrames, onSeek, onDraggingChange]);

  // Timeline width based on actual Remotion duration (with overlapping transitions)
  const realTotalFrames = useMemo(() => {   
    return calculateRealTotalFrames(slides, fps);
  }, [slides, fps]);

  const realTotalDuration = realTotalFrames / fps;
  const timelineWidth = Math.max(realTotalDuration * pixelsPerSecond, 400);

  // Calculate total height based on overlay tracks
  const maxTrackIndex = overlayItems.length > 0
    ? Math.max(...overlayItems.map((o) => o.trackIndex))
    : -1;
  const numOverlayTracks = maxTrackIndex + 1;
  const slideTrackHeight = 48;
  const overlayTrackHeight = 32;
  const timeMarkerHeight = 24;
  const totalHeight = timeMarkerHeight + slideTrackHeight + (numOverlayTracks * overlayTrackHeight);

  // Auto-scroll to selected slide when it changes
  useEffect(() => {
    if (selectedSlideId !== prevSelectedSlideIdRef.current && timelineContainerRef.current) {
      const selectedSlideItem = slideItems.find(item => item.slideId === selectedSlideId);

      if (selectedSlideItem) {
        const slideLeft = selectedSlideItem.startTime * pixelsPerSecond;
        const slideWidth = selectedSlideItem.duration * pixelsPerSecond;
        const container = timelineContainerRef.current;
        const containerWidth = container.clientWidth;

        // Calculate scroll position to center the slide
        const scrollLeft = slideLeft + (slideWidth / 2) - (containerWidth / 2);

        // Smooth scroll to the slide
        container.scrollTo({
          left: Math.max(0, scrollLeft),
          behavior: 'smooth'
        });
      }

      if (selectedSlideId) {
        prevSelectedSlideIdRef.current = selectedSlideId;
      }
    }
  }, [selectedSlideId, slideItems, pixelsPerSecond]);

  return (
    <div className="overflow-x-auto" ref={timelineContainerRef}>
      <div
        className={`relative ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
        style={{ width: `${timelineWidth}px`, minWidth: "100%", height: `${totalHeight}px` }}
        onClick={handleTimelineClick}
        onMouseMove={!isDragging ? handleTimelineHover : undefined}
        onMouseLeave={!isDragging ? () => setHoveredTime(null) : undefined}
      >
        {/* Time markers - use real Remotion duration */}
        <TimeMarkerRow totalDuration={realTotalDuration} pixelsPerSecond={pixelsPerSecond} />

        {/* Overlay tracks */}
        <div className="absolute inset-x-0" style={{ top: `${timeMarkerHeight}px` }}>
          <OverlayTracks
            overlayItems={overlayItems}
            selectedObjectId={selectedObjectId}
            currentTime={currentTime}
            pixelsPerSecond={pixelsPerSecond}
            onSelectOverlay={(overlayId, slideId) => onSelectOverlay?.(overlayId, slideId)}
            onSeek={(time) => onSeek(Math.round(time * fps))}
          />
        </div>
        {/* Slide track */}
        <div className="absolute inset-x-0" style={{ top: `${timeMarkerHeight + (numOverlayTracks * overlayTrackHeight) + (numOverlayTracks > 0 ? 4 : 0)}px` }}>
          <SlideTrack
            slideItems={slideItems}
            transitionItems={transitionItems}
            selectedSlideId={selectedSlideId}
            currentTime={currentTime}
            pixelsPerSecond={pixelsPerSecond}
            onSelectSlide={onSelectSlide}
            onSeek={(time) => onSeek(Math.round(time * fps))}
            onSelectSlideManually={onSelectSlideManually}
          />
        </div>

        {/* Playhead with drag functionality */}
        <PlayHead
          displayTime={displayTime}
          pixelsPerSecond={pixelsPerSecond}
          isDragging={isDragging}
          handleScrubberMouseDown={handleScrubberMouseDown}
        />
        {/* Hover time indicator - only show when not dragging */}
        {/* {hoveredTime !== null && !isDragging && (
          <div
            className="absolute w-px bg-foreground/40 pointer-events-none z-20"
            style={{ 
              left: `${hoveredTime * pixelsPerSecond}px`,
              top: 0,
              bottom: 0,
            }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-foreground text-background text-[10px] font-mono -translate-y-full mb-1">
              {formatTime(hoveredTime)}
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
};

export default PlayerTimeline;
