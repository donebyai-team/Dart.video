// Timeline layout calculation utilities
import { CanvasObjectType, TransitionType } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import type {
  TimelineSlide,
  SlideItem,
  TransitionItem,
  OverlayItem,
  TimelineLayout,
} from "./types";

/**
 * REMOTION TIMELINE CALCULATIONS (2026)
 * Frames are the source of truth, seconds are for display
 * Shows actual Remotion behavior with overlapping slides
 */

/**
 * Fixed transition duration in frames (30 FPS * 0.3s = 9 frames)
 */
export const DEFAULT_TRANSITION_DURATION_FRAMES = 9;

/**
 * Fixed transition duration in seconds
 */
export const DEFAULT_TRANSITION_DURATION = 0.3;

/**
 * Default pixels per second for timeline scaling
 */
export const DEFAULT_PIXELS_PER_SECOND = 80;

/**
 * Track heights
 */
export const SLIDE_TRACK_HEIGHT = 48;
export const OVERLAY_TRACK_HEIGHT = 32;

/**
 * Convert frames to seconds for display
 */
function framesToSeconds(frames: number, fps: number = 30): number {
  return frames / fps;
}

/**
 * Convert seconds to frames for calculations
 */
function secondsToFrames(seconds: number, fps: number = 30): number {
  return Math.round(seconds * fps);
}

/**
 * Convert Tailwind color class to hex color
 */
function colorClassToHex(colorClass: string): string {
  const colorMap: Record<string, string> = {
    'bg-screen-hook': '#ef4444',      // Red
    'bg-screen-problem': '#f97316',   // Orange
    'bg-screen-solution': '#10b981',  // Green
    'bg-screen-feature': '#3b82f6',   // Blue
    'bg-screen-proof': '#8b5cf6',     // Purple
    'bg-screen-cta': '#ec4899',       // Pink
    'bg-primary': '#3b82f6',          // Blue
  };
  
  return colorMap[colorClass] || '#3b82f6'; // Default to blue
}

/**
 * Calculate slide items showing actual Remotion overlapping behavior
 * FRAME-ACCURATE TIMELINE: Shows slides with their actual overlapping regions
 * 
 * Logic Level (Frames):
 * - Slide Absolute Start: Previous Start + Previous Duration - Transition Duration
 * - Slide Absolute End: Start Frame + Slide Duration - 1
 * - Overlapping Region: Between next slide start and current slide end
 * 
 * Display Level (Seconds):
 * - Convert frame positions to seconds for UI display
 * - Use PIXELS_PER_SECOND for tile positioning
 * 
 * @param slides - Array of timeline slides
 * @param _pixelsPerSecond - Scale factor for time-to-pixels conversion
 * @param fps - Frames per second (default 30)
 * @returns Array of slide items with overlapping regions
 */
export function calculateRemotionSlideItems(
  slides: TimelineSlide[],
  _pixelsPerSecond: number = DEFAULT_PIXELS_PER_SECOND,
  fps: number = 30
): SlideItem[] {
  const slideItems: SlideItem[] = [];
  let currentFramePosition = 0;
  
  slides.forEach((slide) => {
    // Convert slide duration to frames (source of truth)
    const slideDurationFrames = secondsToFrames(slide.duration, fps);
    
    // Calculate absolute start frame
    const absoluteStartFrame = currentFramePosition;
    
    // Calculate absolute end frame
    const absoluteEndFrame = absoluteStartFrame + slideDurationFrames - 1;
    
    // Convert to seconds for display
    const startTimeSeconds = framesToSeconds(absoluteStartFrame, fps);
    const durationSeconds = framesToSeconds(slideDurationFrames, fps);
    
    // Check if this slide has a transition (creates overlap with next slide)
    const hasTransition = slide.transition !== TransitionType.TRANSITION_NONE;
    
    slideItems.push({
      type: 'slide',
      id: `slide-${slide.id}`,
      slideId: slide.id,
      startTime: startTimeSeconds,
      duration: durationSeconds,
      label: slide.sectionTitle,
      color: colorClassToHex(slide.sectionColor),
      // Add frame-level data for precise calculations
      startFrame: absoluteStartFrame,
      endFrame: absoluteEndFrame,
      hasTransition,
      // Add overlap information for visual rendering
      overlapStart: hasTransition ? framesToSeconds(absoluteEndFrame - DEFAULT_TRANSITION_DURATION_FRAMES + 1, fps) : null,
      overlapEnd: hasTransition ? framesToSeconds(absoluteEndFrame, fps) : null,
    });
    
    // Move to next slide position
    // Next slide starts: Current Start + Current Duration - Transition Duration
    if (hasTransition) {
      currentFramePosition = absoluteStartFrame + slideDurationFrames - DEFAULT_TRANSITION_DURATION_FRAMES;
    } else {
      currentFramePosition = absoluteStartFrame + slideDurationFrames;
    }
  });
  
  return slideItems;
}

/**
 * Calculate transition overlay items to show overlapping regions
 * These are visual indicators of where slides overlap during transitions
 * 
 * @param slides - Array of timeline slides
 * @param pixelsPerSecond - Scale factor for time-to-pixels conversion
 * @param fps - Frames per second (default 30)
 * @returns Array of transition overlay items
 */
export function calculateTransitionOverlays(
  slides: TimelineSlide[],
  pixelsPerSecond: number = DEFAULT_PIXELS_PER_SECOND,
  fps: number = 30
): TransitionItem[] {
  const transitionItems: TransitionItem[] = [];
  const slideItems = calculateRemotionSlideItems(slides, pixelsPerSecond, fps);
  
  slideItems.forEach((slideItem, index) => {
    if (slideItem.hasTransition && slideItem.overlapStart && slideItem.overlapEnd) {
      const nextSlide = slideItems[index + 1];
      
      transitionItems.push({
        type: 'transition',
        id: `transition-${slideItem.slideId}`,
        slideId: slideItem.slideId,
        startTime: slideItem.overlapStart,
        duration: slideItem.overlapEnd - slideItem.overlapStart,
        fromSlide: slideItem.slideId,
        toSlide: nextSlide?.slideId || '',
        // Visual styling for overlap indication
        opacity: 0.3, // Semi-transparent to show overlap
        color: '#6b7280', // Gray color for transitions
      });
    }
  });
  
  return transitionItems;
}

/**
 * Legacy function for backward compatibility
 * Now delegates to the new Remotion-accurate calculation
 */
export function calculateSlideItems(
  slides: TimelineSlide[],
  pixelsPerSecond: number = DEFAULT_PIXELS_PER_SECOND
): SlideItem[] {
  return calculateRemotionSlideItems(slides, pixelsPerSecond);
}

/**
 * Legacy function for backward compatibility
 * Now delegates to the new transition overlay calculation
 */
export function calculateTransitionItems(
  slides: TimelineSlide[],
  pixelsPerSecond: number = DEFAULT_PIXELS_PER_SECOND
): TransitionItem[] {
  return calculateTransitionOverlays(slides, pixelsPerSecond);
}

/**
 * Calculate overlay items from slides' effects and annotations
 * UI Timeline Representation: Uses sequential slide positioning (no overlaps)
 * 
 * @param slides - Array of timeline slides
 * @param pixelsPerSecond - Scale factor for time-to-pixels conversion
 * @returns Array of overlay items with calculated positions (trackIndex not yet assigned)
 */
export function calculateOverlayItems(
  slides: TimelineSlide[],
): OverlayItem[] {
  const overlays: OverlayItem[] = [];
  let cumulativeTime = 0;
  
  slides.forEach((slide) => {
    const slideStartTime = cumulativeTime;
    // Process effects
    if (slide.spotlights && slide.spotlights.length > 0) {
      slide.spotlights.forEach((effect) => {
        const startTime = effect.startTime ?? 0;
        const endTime = effect.endTime ?? slide.duration;
        const duration = endTime - startTime;
        
        overlays.push({
          type: 'overlay',
          id: `overlay-${effect.id}`,
          overlayId: effect.id!,
          slideId: slide.id,
          overlayType: CanvasObjectType.CANVAS_SPOTLIGHT,
          startTime: slideStartTime + startTime,
          duration,
          trackIndex: 0, // Will be assigned by assignOverlayTracks
        });
      });
    }
    
    // Move cumulative time forward by slide duration only
    // UI timeline uses sequential positioning
    cumulativeTime += slide.duration;
  });
  
  return overlays;
}

/**
 * Assign track indices to overlays to avoid visual overlap
 * Uses a greedy algorithm to find the first available track for each overlay
 * 
 * @param overlays - Array of overlay items (trackIndex will be modified)
 * @returns Array of overlay items with assigned trackIndex values
 */
export function assignOverlayTracks(overlays: OverlayItem[]): OverlayItem[] {
  if (overlays.length === 0) return [];
  
  // Sort by start time for greedy algorithm
  const sorted = [...overlays].sort((a, b) => a.startTime - b.startTime);
  
  // Track end times for each track
  const tracks: { endTime: number }[] = [];
  
  return sorted.map((overlay) => {
    // Find first available track (where overlay doesn't overlap)
    const trackIndex = tracks.findIndex(track => track.endTime <= overlay.startTime);
    
    if (trackIndex === -1) {
      // Need new track
      tracks.push({ endTime: overlay.startTime + overlay.duration });
      return { ...overlay, trackIndex: tracks.length - 1 };
    } else {
      // Use existing track
      tracks[trackIndex].endTime = overlay.startTime + overlay.duration;
      return { ...overlay, trackIndex };
    }
  });
}

/**
 * Calculate complete timeline layout
 * 
 * @param slides - Array of timeline slides
 * @param pixelsPerSecond - Scale factor for time-to-pixels conversion
 * @returns Complete timeline layout structure
 */
export function calculateTimelineLayout(
  slides: TimelineSlide[],
  pixelsPerSecond: number = DEFAULT_PIXELS_PER_SECOND
): TimelineLayout {
  const slideItems = calculateSlideItems(slides, pixelsPerSecond);
  const transitionItems = calculateTransitionItems(slides, pixelsPerSecond);
  const overlayItems = assignOverlayTracks(
    calculateOverlayItems(slides)
  );
  
  // Group overlays by track index
  const maxTrackIndex = overlayItems.length > 0
    ? Math.max(...overlayItems.map(o => o.trackIndex))
    : -1;
  
  const tracks: OverlayItem[][] = [];
  for (let i = 0; i <= maxTrackIndex; i++) {
    tracks.push(overlayItems.filter(o => o.trackIndex === i));
  }
  
  const numOverlayTracks = tracks.length;
  const totalHeight = SLIDE_TRACK_HEIGHT + (numOverlayTracks * OVERLAY_TRACK_HEIGHT);
  
  return {
    slideTrack: {
      height: SLIDE_TRACK_HEIGHT,
      items: [...slideItems, ...transitionItems].sort((a, b) => a.startTime - b.startTime),
    },
    overlayTracks: {
      height: OVERLAY_TRACK_HEIGHT,
      tracks,
    },
    totalHeight,
    pixelsPerSecond,
  };
}
