import { useCallback, useMemo } from "react";
import { PlayerRef } from "@remotion/player";
import { getRealSlideStartFrame, getSlideVisualEndFrame } from "@/components/editor/frame_calculations";
import { TimelineSlide } from "@/components/editor/timeline/types";

/**
 * Centralized playback control logic for the Remotion player.
 * playFromSlideId: when set, pressing play seeks to that slide's start first,
 * then plays from there. Set whenever the user manually selects a slide.
 */
export const usePlayerControls = (
  playerRef: React.RefObject<PlayerRef | null>,
  sections: TimelineSlide[],
  currentFrame: number,
  totalFrames: number,
  isPlaying: boolean,
  playFromSlideId: string | null,
  setPlayFromSlideId: (id: string | null) => void,
  fps: number,
  previewEndFrameRef: React.MutableRefObject<number | null>,
) => {
  const play = useCallback(() => {
    playerRef.current?.play();
  }, [playerRef]);

  const pause = useCallback(() => {
    playerRef.current?.pause();
  }, [playerRef]);

  const togglePlayPause = useCallback(() => {
    previewEndFrameRef.current = null;
    if (isPlaying) {
      playerRef.current?.pause();
    } else if (playFromSlideId) {
      // Play from the start of the selected slide
      const startFrame = getRealSlideStartFrame(sections, playFromSlideId, fps);
      playerRef.current?.seekTo(startFrame);
      setTimeout(() => playerRef.current?.play(), 50);
      setPlayFromSlideId(null);
    } else {
      playerRef.current?.play();
    }
  }, [isPlaying, playerRef, playFromSlideId, sections, setPlayFromSlideId, fps]);

  const skipBackward = useCallback(() => {
    previewEndFrameRef.current = null;
    playerRef.current?.seekTo(Math.max(0, currentFrame - fps * 5));
  }, [currentFrame, playerRef, fps]);

  const skipForward = useCallback(() => {
    previewEndFrameRef.current = null;
    playerRef.current?.seekTo(Math.min(totalFrames - 1, currentFrame + fps * 5));
  }, [currentFrame, totalFrames, playerRef, fps]);

  const seekToSlide = useCallback((slideId: string) => {
    previewEndFrameRef.current = null;
    playerRef.current?.seekTo(getRealSlideStartFrame(sections, slideId, fps));
  }, [sections, playerRef, fps]);

  const seekToFrame = useCallback((frame: number) => {
    previewEndFrameRef.current = null;
    playerRef.current?.seekTo(frame);
  }, [playerRef]);

  const playSlidePreview = useCallback((slideId: string) => {
    const startFrame = getRealSlideStartFrame(sections, slideId, fps);
    const endFrame = getSlideVisualEndFrame(sections, slideId, fps);
    previewEndFrameRef.current = endFrame;
    playerRef.current?.seekTo(startFrame);
    setTimeout(() => playerRef.current?.play(), 50);
  }, [sections, playerRef, fps]);

  return useMemo(() => ({
    play,
    pause,
    togglePlayPause,
    skipBackward,
    skipForward,
    seekToSlide,
    seekToFrame,
    playSlidePreview,
    getCurrentFrame: () => currentFrame,
    isPlaying: () => isPlaying,
  }), [play, pause, togglePlayPause, skipBackward, skipForward, seekToSlide, seekToFrame, playSlidePreview, currentFrame, isPlaying]);
};

export interface PlayerControls {
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  skipBackward: () => void;
  skipForward: () => void;
  seekToSlide: (slideId: string) => void;
  seekToFrame: (frame: number) => void;
  playSlidePreview: (slideId: string) => void;
  getCurrentFrame: () => number;
  isPlaying: () => boolean;
}
