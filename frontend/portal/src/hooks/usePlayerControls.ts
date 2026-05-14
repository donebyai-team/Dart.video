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
  setIsPreviewPlaying: (isPreviewPlaying: boolean) => void,
) => {
  const play = useCallback(() => {
    setIsPreviewPlaying(false);
    playerRef.current?.play();
  }, [playerRef, setIsPreviewPlaying]);

  const pause = useCallback(() => {
    setIsPreviewPlaying(false);
    previewEndFrameRef.current = null;
    playerRef.current?.pause();
  }, [playerRef, previewEndFrameRef, setIsPreviewPlaying]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPreviewPlaying(false);
      previewEndFrameRef.current = null;
      playerRef.current?.pause();
    } else if (playFromSlideId) {
      setIsPreviewPlaying(false);
      previewEndFrameRef.current = null;
      // Play from the start of the selected slide
      const startFrame = getRealSlideStartFrame(sections, playFromSlideId, fps);
      playerRef.current?.seekTo(startFrame);
      setTimeout(() => playerRef.current?.play(), 50);
      setPlayFromSlideId(null);
    } else {
      setIsPreviewPlaying(false);
      previewEndFrameRef.current = null;
      playerRef.current?.play();
    }
  }, [isPlaying, playerRef, playFromSlideId, sections, setPlayFromSlideId, fps, previewEndFrameRef, setIsPreviewPlaying]);

  const skipBackward = useCallback(() => {
    setIsPreviewPlaying(false);
    previewEndFrameRef.current = null;
    playerRef.current?.seekTo(Math.max(0, currentFrame - fps * 5));
  }, [currentFrame, playerRef, fps, previewEndFrameRef, setIsPreviewPlaying]);

  const skipForward = useCallback(() => {
    setIsPreviewPlaying(false);
    previewEndFrameRef.current = null;
    playerRef.current?.seekTo(Math.min(totalFrames - 1, currentFrame + fps * 5));
  }, [currentFrame, totalFrames, playerRef, fps, previewEndFrameRef, setIsPreviewPlaying]);

  const seekToSlide = useCallback((slideId: string) => {
    setIsPreviewPlaying(false);
    previewEndFrameRef.current = null;
    playerRef.current?.seekTo(getRealSlideStartFrame(sections, slideId, fps));
  }, [sections, playerRef, fps, previewEndFrameRef, setIsPreviewPlaying]);

  const seekToFrame = useCallback((frame: number) => {
    setIsPreviewPlaying(false);
    previewEndFrameRef.current = null;
    playerRef.current?.seekTo(frame);
  }, [playerRef, previewEndFrameRef, setIsPreviewPlaying]);

  const playSlidePreview = useCallback((slideId: string, endSlideId?: string) => {
    const startFrame = getRealSlideStartFrame(sections, slideId, fps);
    const endFrame = getSlideVisualEndFrame(sections, endSlideId ?? slideId, fps);
    console.log("rwgwegf", startFrame, endFrame, slideId, endSlideId)
    setIsPreviewPlaying(true);
    previewEndFrameRef.current = endFrame;
    playerRef.current?.seekTo(startFrame);
    setTimeout(() => playerRef.current?.play(), 50);
  }, [sections, playerRef, fps, previewEndFrameRef, setIsPreviewPlaying]);

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
  playSlidePreview: (slideId: string, endSlideId?: string) => void;
  getCurrentFrame: () => number;
  isPlaying: () => boolean;
}
