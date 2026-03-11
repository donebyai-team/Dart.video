import { useEffect } from "react";
import { PlayerRef } from "@remotion/player";
import { getSlideAbsoluteEndFrame, getRealSlideStartFrame } from "@/components/editor/frame_calculations";
import { TimelineSlide } from "@/components/editor/timeline/types";

interface UseRemotionPlayerEventsProps {
  playerRef: React.RefObject<PlayerRef | null>;
  allSlides: TimelineSlide[];
  selectedSlideId: string;
  onSlideChange?: (slideId: string) => void;
  onFrameChange?: (frame: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentFrame: (frame: number) => void;
  fps: number;
}

export function useRemotionPlayerEvents({
  playerRef,
  allSlides,
  selectedSlideId,
  onSlideChange,
  onFrameChange,
  setIsPlaying,
  setCurrentFrame,
  fps,
}: UseRemotionPlayerEventsProps) {
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleFrameUpdate = (data: { detail: { frame: number } }) => {
      const frame = data.detail.frame;
      setCurrentFrame(frame);
      onFrameChange?.(frame);

      // Detect which slide is active at this frame, accounting for transition overlaps.
      // During a transition, two slides overlap — pick the incoming (later-starting) one.
      const overlappingSlides: { slide: TimelineSlide; startFrame: number }[] = [];

      for (const slide of allSlides) {
        const slideStartFrame = getRealSlideStartFrame(allSlides, slide.id, fps);
        const slideEndFrame = getSlideAbsoluteEndFrame(allSlides, slide.id, fps);

        if (frame >= slideStartFrame && frame <= slideEndFrame) {
          overlappingSlides.push({ slide, startFrame: slideStartFrame });
        }
      }

      let currentSlide: TimelineSlide | null = null;
      if (overlappingSlides.length === 1) {
        currentSlide = overlappingSlides[0].slide;
      } else if (overlappingSlides.length > 1) {
        currentSlide = overlappingSlides.reduce((latest, current) =>
          current.startFrame > latest.startFrame ? current : latest
        ).slide;
      }

      if (currentSlide && currentSlide.id !== selectedSlideId) {
        onSlideChange?.(currentSlide.id);
      }
    };

    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);
    player.addEventListener("frameupdate", handleFrameUpdate as never);

    return () => {
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
      player.removeEventListener("frameupdate", handleFrameUpdate as never);
    };
  }, [playerRef, allSlides, selectedSlideId, onSlideChange, onFrameChange, setIsPlaying, setCurrentFrame, fps]);
}
