import { useMemo, useRef, useEffect } from "react";
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
  fps: number;
}

const PlayerTimeline = ({
  slides,
  currentFrame,
  onSeek,
  onSelectSlide,
  onSelectOverlay,
  fps,
}: PlayerTimelineProps) => {
  const selectedSlideId = useVideoStore(s => s.selectedSlide)?.slide.id;
  const selectedEffectId = useVideoStore(s => s.selectedEffectId);

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const prevSelectedSlideIdRef = useRef<string>(selectedSlideId!);

  const pixelsPerSecond = DEFAULT_PIXELS_PER_SECOND;
  const currentTime = currentFrame / fps;

  const realTotalFrames = useMemo(() => calculateRealTotalFrames(slides, fps), [slides, fps]);
  const realTotalDuration = realTotalFrames / fps;
  const timelineWidth = Math.max(realTotalDuration * pixelsPerSecond, 400);

  const { slideItems, transitionItems, overlayItems } = useMemo(() => {
    return {
      slideItems: calculateRemotionSlideItems(slides, pixelsPerSecond, fps),
      transitionItems: calculateTransitionOverlays(slides, pixelsPerSecond, fps),
      overlayItems: assignOverlayTracks(calculateOverlayItems(slides, fps)),
    };
  }, [slides, pixelsPerSecond, fps]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineContainerRef.current) return;
    const rect = timelineContainerRef.current.getBoundingClientRect();
    const scrollLeft = timelineContainerRef.current.scrollLeft;
    const mouseX = e.clientX - rect.left + scrollLeft;
    const time = Math.max(0, Math.min(realTotalDuration, mouseX / pixelsPerSecond));
    onSeek(Math.round(time * fps));
  };

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

  // Auto-scroll to selected slide when selection changes
  useEffect(() => {
    if (selectedSlideId !== prevSelectedSlideIdRef.current && timelineContainerRef.current) {
      const selectedSlideItem = slideItems.find(item => item.slideId === selectedSlideId);

      if (selectedSlideItem) {
        const container = timelineContainerRef.current;
        const slideLeft = selectedSlideItem.startTime * pixelsPerSecond;
        const slideWidth = selectedSlideItem.duration * pixelsPerSecond;
        const scrollLeft = slideLeft + slideWidth / 2 - container.clientWidth / 2;
        container.scrollTo({ left: Math.max(0, scrollLeft), behavior: "smooth" });
      }

      if (selectedSlideId) prevSelectedSlideIdRef.current = selectedSlideId;
    }
  }, [selectedSlideId, slideItems, pixelsPerSecond]);

  return (
    <div className="overflow-x-auto cursor-pointer" ref={timelineContainerRef}>
      <div
        className="relative"
        style={{ width: `${timelineWidth}px`, minWidth: "100%", height: `${totalHeight}px` }}
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
            currentTime={currentTime}
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
            currentTime={currentTime}
            pixelsPerSecond={pixelsPerSecond}
            onSelectSlide={onSelectSlide}
            onSeek={(time) => onSeek(Math.round(time * fps))}
          />
        </div>

        <PlayHead currentTime={currentTime} pixelsPerSecond={pixelsPerSecond} />
      </div>
    </div>
  );
};

export default PlayerTimeline;
