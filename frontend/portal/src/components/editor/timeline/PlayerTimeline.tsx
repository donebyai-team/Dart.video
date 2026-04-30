import { useMemo, useRef, useEffect, useState, useCallback } from "react";
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

interface PlayerTimelineProps {
  slides: TimelineSlide[];
  currentFrame: number;
  onSeek: (frame: number) => void;
  onSelectSlide?: (slideId: string) => void;
  onSelectOverlay?: (overlayId: string, slideId: string) => void;
  onDraggingChange?: (isDragging: boolean) => void;
  fps: number;
}

const PlayerTimeline = ({
  slides,
  currentFrame,
  onSeek,
  onSelectSlide,
  onSelectOverlay,
  onDraggingChange,
  fps,
}: PlayerTimelineProps) => {
  const selectedSlideId = useVideoStore(s => s.selectedSlide)?.id;
  const selectedEffectId = useVideoStore(s => s.selectedEffectId);

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const prevSelectedSlideIdRef = useRef<string>(selectedSlideId!);
  // Tracks whether the user is manually scrolling so auto-scroll won't fight them
  const isUserScrollingRef = useRef(false);
  const userScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Prevents programmatic scrolls from being mistaken for user scroll
  const isProgrammaticScrollRef = useRef(false);

  const [isDragging, setIsDragging] = useState(false);
  // dragFrame gives immediate visual feedback during drag without waiting for
  // currentFrame to update via the player's frameupdate event
  const [dragFrame, setDragFrame] = useState<number | null>(null);

  const pixelsPerSecond = DEFAULT_PIXELS_PER_SECOND;

  // During drag show drag position; otherwise show actual player position
  const displayFrame = dragFrame !== null ? dragFrame : currentFrame;
  const displayTime = displayFrame / fps;
  const currentTime = currentFrame / fps;

  const realTotalFrames = useMemo(() => calculateRealTotalFrames(slides, fps), [slides, fps]);
  const realTotalDuration = realTotalFrames / fps;
  const timelineWidth = Math.max(realTotalDuration * pixelsPerSecond, 400);

  const { slideItems, transitionItems, overlayItems } = useMemo(() => ({
    slideItems: calculateRemotionSlideItems(slides, pixelsPerSecond, fps),
    transitionItems: calculateTransitionOverlays(slides, pixelsPerSecond, fps),
    overlayItems: assignOverlayTracks(calculateOverlayItems(slides, fps)),
  }), [slides, pixelsPerSecond, fps]);

  // Convert a mouse event to a frame number, accounting for horizontal scroll offset
  const getFrameFromMouseEvent = useCallback((e: MouseEvent | React.MouseEvent): number | null => {
    if (!timelineContainerRef.current) return null;
    const rect = timelineContainerRef.current.getBoundingClientRect();
    const scrollLeft = timelineContainerRef.current.scrollLeft;
    const mouseX = e.clientX - rect.left + scrollLeft;
    const time = Math.max(0, Math.min(realTotalDuration, mouseX / pixelsPerSecond));
    return Math.round(time * fps);
  }, [pixelsPerSecond, realTotalDuration, fps]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    const frame = getFrameFromMouseEvent(e);
    if (frame !== null) onSeek(frame);
  };

  const handleScrubberMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    onDraggingChange?.(true);

    // Immediately seek to clicked position
    const initialFrame = getFrameFromMouseEvent(e);
    if (initialFrame !== null) {
      setDragFrame(initialFrame);
      onSeek(initialFrame);
    }

    const handleMouseMove = (e: MouseEvent) => {
      const frame = getFrameFromMouseEvent(e);
      if (frame !== null) {
        setDragFrame(frame);
        onSeek(frame); // Updates Remotion canvas in real-time
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const frame = getFrameFromMouseEvent(e);
      if (frame !== null) onSeek(frame);

      setIsDragging(false);
      setDragFrame(null);
      onDraggingChange?.(false);

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [getFrameFromMouseEvent, onSeek, onDraggingChange]);

  // Height calculations
  const maxTrackIndex = overlayItems.length > 0 ? Math.max(...overlayItems.map(o => o.trackIndex)) : -1;
  const numOverlayTracks = maxTrackIndex + 1;
  const timeMarkerHeight = 24;
  const overlayTrackHeight = 40;
  const slideTrackHeight = 48;
  const MAX_OVERLAY_HEIGHT = 82;
  const actualOverlayHeight = numOverlayTracks > 0 ? 1 + numOverlayTracks * overlayTrackHeight : 0;
  const visibleOverlayHeight = Math.min(actualOverlayHeight, MAX_OVERLAY_HEIGHT);
  const totalHeight = timeMarkerHeight + visibleOverlayHeight + slideTrackHeight;

  // Detect manual user scrolling so auto-scroll doesn't fight them.
  // Programmatic scrolls (from auto-scroll or slide selection) are excluded.
  useEffect(() => {
    const container = timelineContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current || isDragging) return;
      isUserScrollingRef.current = true;
      if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current);
      userScrollTimerRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 1500);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isDragging]);

  // Edge-trigger auto-scroll: when the playhead crosses 85% of the visible width
  // (or exits the left edge), jump the timeline to put the playhead at ~25% from left.
  // Skipped during drag and while the user is manually scrolling.
  useEffect(() => {
    if (isDragging || isUserScrollingRef.current) return;
    const container = timelineContainerRef.current;
    if (!container) return;

    const playheadPixel = currentTime * pixelsPerSecond;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;

    const rightEdge = scrollLeft + containerWidth * 0.85;
    const leftEdge = scrollLeft + containerWidth * 0.1;

    if (playheadPixel > rightEdge || playheadPixel < leftEdge) {
      isProgrammaticScrollRef.current = true;
      container.scrollLeft = Math.max(0, playheadPixel - containerWidth * 0.25);
      requestAnimationFrame(() => { isProgrammaticScrollRef.current = false; });
    }
  }, [currentFrame, isDragging, pixelsPerSecond]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to center the selected slide when selection changes
  useEffect(() => {
    if (selectedSlideId !== prevSelectedSlideIdRef.current && timelineContainerRef.current) {
      const selectedSlideItem = slideItems.find(item => item.slideId === selectedSlideId);

      if (selectedSlideItem) {
        const container = timelineContainerRef.current;
        const slideLeft = selectedSlideItem.startTime * pixelsPerSecond;
        const slideWidth = selectedSlideItem.duration * pixelsPerSecond;
        const targetScroll = slideLeft + slideWidth / 2 - container.clientWidth / 2;

        isProgrammaticScrollRef.current = true;
        container.scrollTo({ left: Math.max(0, targetScroll), behavior: "smooth" });
        setTimeout(() => { isProgrammaticScrollRef.current = false; }, 500);
      }

      if (selectedSlideId) prevSelectedSlideIdRef.current = selectedSlideId;
    }
  }, [selectedSlideId, slideItems, pixelsPerSecond]);

  return (
    <div
      className={`overflow-x-auto ${isDragging ? "cursor-grabbing" : "cursor-pointer"}`}
      ref={timelineContainerRef}
    >
      <div
        className="relative"
        style={{
          width: `${timelineWidth}px`,
          minWidth: "100%",
          height: `${totalHeight}px`,
          userSelect: isDragging ? "none" : undefined,
        }}
        onClick={handleTimelineClick}
      >
        <TimeMarkerRow totalDuration={realTotalDuration} pixelsPerSecond={pixelsPerSecond} />

        {/* Overlay tracks — capped height, scrolls vertically if more than 2 tracks */}
        <div
          className="absolute inset-x-0 overflow-y-auto"
          style={{ top: `${timeMarkerHeight}px`, maxHeight: `${MAX_OVERLAY_HEIGHT}px` }}
        >
          <OverlayTracks
            overlayItems={overlayItems}
            selectedEffectId={selectedEffectId}
            currentTime={displayTime}
            pixelsPerSecond={pixelsPerSecond}
            onSelectOverlay={(overlayId, slideId) => onSelectOverlay?.(overlayId, slideId)}
            onSeek={(time) => onSeek(Math.round(time * fps))}
          />
        </div>

        {/* Slide track */}
        <div className="absolute inset-x-0" style={{ top: `${timeMarkerHeight + visibleOverlayHeight}px` }}>
          <SlideTrack
            slideItems={slideItems}
            transitionItems={transitionItems}
            selectedSlideId={selectedSlideId}
            currentTime={displayTime}
            pixelsPerSecond={pixelsPerSecond}
            onSelectSlide={onSelectSlide}
            onSeek={(time) => onSeek(Math.round(time * fps))}
          />
        </div>

        <PlayHead
          currentTime={displayTime}
          pixelsPerSecond={pixelsPerSecond}
          isDragging={isDragging}
          onMouseDown={handleScrubberMouseDown}
        />
      </div>
    </div>
  );
};

export default PlayerTimeline;
