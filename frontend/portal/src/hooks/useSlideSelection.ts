import { useEffect, useRef } from "react";
import type { PlayerControls } from "./usePlayerControls";
import { getSlideVisualEndFrame, getRealSlideStartFrame } from "@/components/editor/frame_calculations";
import { TimelineSlide } from "@/components/editor/timeline/types";

interface UseSlideSelectionProps {
  selectedSlideId: string;
  sections: TimelineSlide[];
  isPlaying: boolean;
  previewingSlideId: string | null;
  controls: PlayerControls;
  setCurrentFrame: (frame: number) => void;
  isDragging?: boolean; // NEW: To prevent interference during dragging
  fps: number
}

export function useSlideSelection({
  selectedSlideId,
  sections,
  isPlaying,
  previewingSlideId,
  controls,
  setCurrentFrame,
  fps,
  isDragging = false,
}: UseSlideSelectionProps) {
  const prevSelectedSlideIdRef = useRef<string>(selectedSlideId);
  useEffect(() => {
    // Skip slide selection logic during dragging
    if (isDragging) return;
    
    // Only handle slide changes when the slide ID actually changed
    if (selectedSlideId !== prevSelectedSlideIdRef.current) {
      console.log(`[SlideSelection] Slide changed from ${prevSelectedSlideIdRef.current} to ${selectedSlideId}, isPlaying: ${isPlaying}, previewingSlideId: ${previewingSlideId}`);
      
      // Only seek when NOT playing (to avoid interrupting playback)
      if (!isPlaying) {
        if (previewingSlideId === selectedSlideId) {
          // Manual selection: seek to visual end frame (before transition region)
          const visualEndFrame = getSlideVisualEndFrame(sections, selectedSlideId, fps);
          console.log(`[SlideSelection] Manual selection - Seeking to visual END frame ${visualEndFrame} for slide ${selectedSlideId}`);
          controls.seekToFrame(visualEndFrame);
          setCurrentFrame(visualEndFrame);
        } else {
          // Normal slide change: seek to REAL START frame (accounting for overlaps)
          const startFrame = getRealSlideStartFrame(sections, selectedSlideId, fps);
          console.log(`[SlideSelection] Normal selection - Seeking to REAL START frame ${startFrame} for slide ${selectedSlideId}`);
          controls.seekToFrame(startFrame);
          setCurrentFrame(startFrame);
        }
      } else {
        console.log(`[SlideSelection] Slide changed during playback - UI update only, no seeking`);
      }
      
      prevSelectedSlideIdRef.current = selectedSlideId;
    }
  }, [selectedSlideId, sections, isPlaying, previewingSlideId, controls, setCurrentFrame, isDragging]);
}