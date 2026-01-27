import { useCallback, useMemo } from "react";
import { PlayerRef } from "@remotion/player";
import { getSlideVisualEndFrame, getRealSlideStartFrame } from "@/components/editor/frame_calculations";
import { TimelineSlide } from "@/components/editor/timeline/types";

/**
 * Centralized playback control logic for the Remotion player
 * All play/pause/seek operations should go through these functions
 */
export const usePlayerControls = (
  playerRef: React.RefObject<PlayerRef | null>,
  sections: TimelineSlide[],
  currentFrame: number,
  totalFrames: number,
  isPlaying: boolean,
  previewingSlideId: string | null,
  setPreviewingSlideId: (id: string | null) => void,
  fps: number,
) => {
  const getSlideEndFrameCallback = useCallback((slideId: string): number => {
    return getSlideVisualEndFrame(sections, slideId, fps);
  }, [sections]);

  const play = useCallback(() => {
    playerRef.current?.play();
  }, [playerRef]);

  const pause = useCallback(() => {
    playerRef.current?.pause();
  }, [playerRef]);

  const togglePlayPause = useCallback(() => {
    console.log(`[PlayerControls] togglePlayPause - isPlaying: ${isPlaying}, currentFrame: ${currentFrame}, previewingSlideId: ${previewingSlideId}`);
    
    if (isPlaying) {
      console.log(`[PlayerControls] Pausing at frame ${currentFrame}`);
      playerRef.current?.pause();
    } else {
      // Check if we have a manually selected slide that should restart from beginning
      if (previewingSlideId) {
        console.log(`[PlayerControls] Restarting manually selected slide ${previewingSlideId} from beginning`);
        // Start playing from the REAL start frame of the manually selected slide (accounting for overlaps)
        const startFrame = getRealSlideStartFrame(sections, previewingSlideId, fps);
        console.log(`[PlayerControls] Seeking to REAL start frame ${startFrame} for slide ${previewingSlideId}`);
        playerRef.current?.seekTo(startFrame);
        setTimeout(() => {
          playerRef.current?.play();
        }, 50);
        setPreviewingSlideId(null); // Clear the manual selection state
      } else {
        // Normal play from current position
        console.log(`[PlayerControls] Playing from current frame ${currentFrame}`);
        playerRef.current?.play();
      }
    }
  }, [isPlaying, playerRef, previewingSlideId, sections, setPreviewingSlideId, currentFrame]);

  const skipBackward = useCallback(() => {
    const newFrame = Math.max(0, currentFrame - fps * 5);
    playerRef.current?.seekTo(newFrame);
  }, [currentFrame, playerRef]);

  const skipForward = useCallback(() => {
    const newFrame = Math.min(totalFrames - 1, currentFrame + fps * 5);
    playerRef.current?.seekTo(newFrame);
  }, [currentFrame, totalFrames, playerRef]);

  const seekToSlide = useCallback((slideId: string) => {
    const frame = getRealSlideStartFrame(sections, slideId, fps);
    playerRef.current?.seekTo(frame);
  }, [sections, playerRef]);

  const seekToSlideEnd = useCallback((slideId: string) => {
    const frame = getSlideEndFrameCallback(slideId);
    playerRef.current?.seekTo(frame);
  }, [getSlideEndFrameCallback, playerRef]);

  const seekToFrame = useCallback((frame: number) => {
    playerRef.current?.seekTo(frame);
  }, [playerRef]);

  // NEW: Manual slide selection - seeks to visual end frame and sets up for restart
  const selectSlideManually = useCallback((slideId: string) => {
    console.log(`[PlayerControls] Manual slide selection: ${slideId}`);
    
    // Always pause first when manually selecting a slide
    playerRef.current?.pause();
    
    // Seek to the visual end frame (before transition region) to show clean slide content
    const visualEndFrame = getSlideVisualEndFrame(sections, slideId, fps);
    console.log(`[PlayerControls] Seeking to visual end frame ${visualEndFrame} for slide ${slideId}`);
    playerRef.current?.seekTo(visualEndFrame);
    
    // Set previewing slide ID so we know to restart from beginning when play is pressed
    setPreviewingSlideId(slideId);
    console.log(`[PlayerControls] Set previewingSlideId to ${slideId}`);
  }, [sections, playerRef, setPreviewingSlideId]);

  const playFromSlideStart = useCallback((slideId: string) => {
    const frame = getRealSlideStartFrame(sections, slideId, fps);
    setPreviewingSlideId(slideId);
    playerRef.current?.seekTo(frame);
    setTimeout(() => {
      if (playerRef.current) {
        playerRef.current.play();
      }
    }, 100);
  }, [sections, playerRef, setPreviewingSlideId]);

  return useMemo(() => ({
    play,
    pause,
    togglePlayPause,
    skipBackward,
    skipForward,
    seekToSlide,
    seekToSlideEnd,
    seekToFrame,
    selectSlideManually,
    playFromSlideStart,
    getSlideEndFrame: getSlideEndFrameCallback,
    getCurrentFrame: () => currentFrame,
    isPlaying: () => isPlaying,
  }), [play, pause, togglePlayPause, skipBackward, skipForward, seekToSlide, seekToSlideEnd, seekToFrame, selectSlideManually, playFromSlideStart, getSlideEndFrameCallback, currentFrame, isPlaying]);
};

/**
 * Player control interface for external use
 */
export interface PlayerControls {
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  skipBackward: () => void;
  skipForward: () => void;
  seekToSlide: (slideId: string) => void;
  seekToSlideEnd: (slideId: string) => void;
  seekToFrame: (frame: number) => void;
  selectSlideManually: (slideId: string) => void;
  playFromSlideStart: (slideId: string) => void;
  getCurrentFrame: () => number;
  isPlaying: () => boolean;
}
