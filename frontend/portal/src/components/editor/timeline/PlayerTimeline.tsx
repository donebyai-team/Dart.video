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
  // Ref mirrors drag state immediately so scroll effects don't wait for a rerender.
  const isDraggingRef = useRef(false);
  const dragPointerClientXRef = useRef<number | null>(null);
  const dragAutoScrollFrameRef = useRef<number | null>(null);
  const lastDragFrameRef = useRef<number | null>(null);

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

  const getFrameFromClientX = useCallback((clientX: number): number | null => {
    if (!timelineContainerRef.current) return null;
    const rect = timelineContainerRef.current.getBoundingClientRect();
    const scrollLeft = timelineContainerRef.current.scrollLeft;
    const mouseX = clientX - rect.left + scrollLeft;
    const time = Math.max(0, Math.min(realTotalDuration, mouseX / pixelsPerSecond));
    return Math.round(time * fps);
  }, [pixelsPerSecond, realTotalDuration, fps]);

  // Convert a mouse event to a frame number, accounting for horizontal scroll offset
  const getFrameFromMouseEvent = useCallback((e: MouseEvent | React.MouseEvent): number | null => {
    return getFrameFromClientX(e.clientX);
  }, [getFrameFromClientX]);

  const updateDragFrameFromClientX = useCallback((clientX: number) => {
    const frame = getFrameFromClientX(clientX);
    if (frame !== null && frame !== lastDragFrameRef.current) {
      lastDragFrameRef.current = frame;
      setDragFrame(frame);
      onSeek(frame);
    }
  }, [getFrameFromClientX, onSeek]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) return;
    const frame = getFrameFromMouseEvent(e);
    if (frame !== null) onSeek(frame);
  };

  const handleScrubberMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    isDraggingRef.current = true;
    dragPointerClientXRef.current = e.clientX;
    setIsDragging(true);
    onDraggingChange?.(true);

    // Immediately seek to clicked position
    const initialFrame = getFrameFromMouseEvent(e);
    if (initialFrame !== null) {
      lastDragFrameRef.current = initialFrame;
      setDragFrame(initialFrame);
      onSeek(initialFrame);
    }

    const runDragAutoScroll = () => {
      if (!isDraggingRef.current || !timelineContainerRef.current || dragPointerClientXRef.current === null) {
        dragAutoScrollFrameRef.current = null;
        return;
      }

      const container = timelineContainerRef.current;
      const rect = container.getBoundingClientRect();
      const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
      const edgeThreshold = Math.min(120, rect.width * 0.2);
      const pointerOffsetX = dragPointerClientXRef.current - rect.left;

      let scrollDelta = 0;

      if (pointerOffsetX > rect.width - edgeThreshold) {
        const overflow = pointerOffsetX - (rect.width - edgeThreshold);
        scrollDelta = Math.min(24, Math.max(6, (overflow / edgeThreshold) * 24));
      } else if (pointerOffsetX < edgeThreshold) {
        const overflow = edgeThreshold - pointerOffsetX;
        scrollDelta = -Math.min(24, Math.max(6, (overflow / edgeThreshold) * 24));
      }

      if (scrollDelta !== 0) {
        const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, container.scrollLeft + scrollDelta));
        if (nextScrollLeft !== container.scrollLeft) {
          isProgrammaticScrollRef.current = true;
          container.scrollLeft = nextScrollLeft;
          requestAnimationFrame(() => { isProgrammaticScrollRef.current = false; });
          updateDragFrameFromClientX(dragPointerClientXRef.current);
        }
      }

      dragAutoScrollFrameRef.current = requestAnimationFrame(runDragAutoScroll);
    };

    dragAutoScrollFrameRef.current = requestAnimationFrame(runDragAutoScroll);

    const handleMouseMove = (e: MouseEvent) => {
      dragPointerClientXRef.current = e.clientX;
      updateDragFrameFromClientX(e.clientX); // Updates Remotion canvas in real-time
    };

    const handleMouseUp = (e: MouseEvent) => {
      const frame = getFrameFromMouseEvent(e);
      if (frame !== null) onSeek(frame);

      isDraggingRef.current = false;
      dragPointerClientXRef.current = null;
      lastDragFrameRef.current = null;
      if (dragAutoScrollFrameRef.current !== null) {
        cancelAnimationFrame(dragAutoScrollFrameRef.current);
        dragAutoScrollFrameRef.current = null;
      }
      setIsDragging(false);
      setDragFrame(null);
      onDraggingChange?.(false);

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [getFrameFromMouseEvent, onSeek, onDraggingChange, updateDragFrameFromClientX]);

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
      if (isProgrammaticScrollRef.current || isDraggingRef.current) return;
      isUserScrollingRef.current = true;
      if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current);
      userScrollTimerRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 1500);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (dragAutoScrollFrameRef.current !== null) {
        cancelAnimationFrame(dragAutoScrollFrameRef.current);
      }
    };
  }, []);

  // Edge-trigger auto-scroll: when the playhead crosses 85% of the visible width
  // (or exits the left edge), jump the timeline to put the playhead at ~25% from left.
  // Skipped during drag and while the user is manually scrolling.
  useEffect(() => {
    if (isDraggingRef.current || isUserScrollingRef.current) return;
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
  }, [currentFrame, pixelsPerSecond]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to center the selected slide when selection changes
  useEffect(() => {
    if (isDraggingRef.current) {
      if (selectedSlideId) prevSelectedSlideIdRef.current = selectedSlideId;
      return;
    }

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
