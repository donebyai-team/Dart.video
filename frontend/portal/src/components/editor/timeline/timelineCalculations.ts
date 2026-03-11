// Timeline layout calculation utilities
import { EffectType, TransitionType } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import type { TimelineSlide, SlideItem, TransitionItem, OverlayItem, TimelineLayout } from './types'
import { getRealSlideStartFrame } from '../frame_calculations'
import { TRANSITION_DURATION_SECONDS } from '@coasterai/renderer/src/frameUtils'

/**
 * REMOTION TIMELINE CALCULATIONS (2026)
 * Frames are the source of truth, seconds are for display
 * Shows actual Remotion behavior with overlapping slides
 */
/**
 * Default pixels per second for timeline scaling
 */
export const DEFAULT_PIXELS_PER_SECOND = 60

/**
 * Track heights
 */
export const SLIDE_TRACK_HEIGHT = 48
export const OVERLAY_TRACK_HEIGHT = 32

/**
 * Convert frames to seconds for display
 */
function framesToSeconds(frames: number, fps: number = 30): number {
  return frames / fps
}

/**
 * Convert seconds to frames for calculations
 */
function secondsToFrames(seconds: number, fps: number = 30): number {
  return Math.round(seconds * fps)
}

/**
 * Convert Tailwind color class to hex color
 */
function colorClassToHex(colorClass: string): string {
  const colorMap: Record<string, string> = {
    'bg-screen-hook': '#ef4444', // Red
    'bg-screen-problem': '#f97316', // Orange
    'bg-screen-solution': '#10b981', // Green
    'bg-screen-feature': '#3b82f6', // Blue
    'bg-screen-proof': '#8b5cf6', // Purple
    'bg-screen-cta': '#ec4899', // Pink
    'bg-primary': '#3b82f6' // Blue
  }

  return colorMap[colorClass] || '#3b82f6' // Default to blue
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
  const slideItems: SlideItem[] = []
  let currentFramePosition = 0

  slides.forEach((slide, index) => {
    // Convert slide duration to frames (source of truth)
    const slideDurationFrames = secondsToFrames(slide.duration, fps)

    // Calculate absolute start frame
    const absoluteStartFrame = currentFramePosition

    // Calculate absolute end frame
    const absoluteEndFrame = absoluteStartFrame + slideDurationFrames - 1

    // Convert to seconds for display
    const startTimeSeconds = framesToSeconds(absoluteStartFrame, fps)
    const durationSeconds = framesToSeconds(slideDurationFrames, fps)

    // Check if this slide has a transition (creates overlap with next slide)
    const hasTransition =
      index < slides.length - 1 &&
      slide.transition !== TransitionType.TRANSITION_NONE

    slideItems.push({
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
      overlapStart: hasTransition
        ? framesToSeconds(absoluteEndFrame - (TRANSITION_DURATION_SECONDS * fps) + 1, fps)
        : null,
      overlapEnd: hasTransition ? framesToSeconds(absoluteEndFrame, fps) : null
    })

    // Move to next slide position
    // Next slide starts: Current Start + Current Duration - Transition Duration
    if (hasTransition) {
      currentFramePosition = absoluteStartFrame + slideDurationFrames - Math.round(TRANSITION_DURATION_SECONDS * fps);
    } else {
      currentFramePosition = absoluteStartFrame + slideDurationFrames
    }
  })

  return slideItems
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
  const transitionItems: TransitionItem[] = []
  const slideItems = calculateRemotionSlideItems(slides, pixelsPerSecond, fps)

  slideItems.forEach((slideItem, index) => {
    if (slideItem.hasTransition && slideItem.overlapStart && slideItem.overlapEnd) {
      const nextSlide = slideItems[index + 1]

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
        color: '#6b7280' // Gray color for transitions
      })
    }
  })

  return transitionItems
}

/**
 * Legacy function for backward compatibility
 * Now delegates to the new Remotion-accurate calculation
 */
export function calculateSlideItems(
  slides: TimelineSlide[],
  pixelsPerSecond: number = DEFAULT_PIXELS_PER_SECOND
): SlideItem[] {
  return calculateRemotionSlideItems(slides, pixelsPerSecond)
}

/**
 * Legacy function for backward compatibility
 * Now delegates to the new transition overlay calculation
 */
export function calculateTransitionItems(
  slides: TimelineSlide[],
  pixelsPerSecond: number = DEFAULT_PIXELS_PER_SECOND
): TransitionItem[] {
  return calculateTransitionOverlays(slides, pixelsPerSecond)
}

/**
 * Calculate overlay items from slides' effects and annotations
 * UI Timeline Representation: Uses sequential slide positioning (no overlaps)
 *
 * @param slides - Array of timeline slides
 * @param pixelsPerSecond - Scale factor for time-to-pixels conversion
 * @returns Array of overlay items with calculated positions (trackIndex not yet assigned)
 */
export function calculateOverlayItems(slides: TimelineSlide[], fps: number): OverlayItem[] {
  const overlays: OverlayItem[] = []

  slides.forEach(slide => {
    // Process effects
    if (slide.spotlights && slide.spotlights.length > 0) {
      // Get the realSlide start frame using this function
      const realSlideStartTimeFrame = getRealSlideStartFrame(slides, slide.id, fps)
      //convert it into seconds
      const realSlideStartTimeInSeconds = realSlideStartTimeFrame / fps

      slide.spotlights.forEach(effect => {
        const startTime = effect.startTime ?? 0
        const endTime = effect.endTime ?? slide.duration
        const duration = endTime - startTime

        overlays.push({
          type: 'overlay',
          id: `overlay-${effect.id}`,
          overlayId: effect.id!,
          slideId: slide.id,
          overlayType: EffectType.SPOTLIGHT,
          startTime: realSlideStartTimeInSeconds + startTime,
          duration,
          trackIndex: 0 // Will be assigned by assignOverlayTracks
        })
      })
    }
  })

  slides.forEach(slide => {
    // Process effects
    if (slide.callouts && slide.callouts.length > 0) {
      // Get the realSlide start frame using this function
      const realSlideStartTimeFrame = getRealSlideStartFrame(slides, slide.id, fps)
      //convert it into seconds
      const realSlideStartTimeInSeconds = realSlideStartTimeFrame / fps

      slide.callouts.forEach(effect => {
        const startTime = effect.startTime ?? 0
        const endTime = effect.endTime ?? slide.duration
        const duration = endTime - startTime

        overlays.push({
          type: 'overlay',
          id: `overlay-${effect.id}`,
          overlayId: effect.id!,
          slideId: slide.id,
          overlayType: EffectType.CALLOUT,
          startTime: realSlideStartTimeInSeconds + startTime,
          duration,
          trackIndex: 0 // Will be assigned by assignOverlayTracks
        })
      })
    }
  })

  slides.forEach(slide => {
    if (slide.zooms && slide.zooms.length > 0) {
      const realSlideStartTimeFrame = getRealSlideStartFrame(slides, slide.id, fps)
      const realSlideStartTimeInSeconds = realSlideStartTimeFrame / fps

      slide.zooms.forEach(effect => {
        const startTime = effect.startTime ?? 0
        const endTime = effect.endTime ?? slide.duration
        const duration = endTime - startTime

        overlays.push({
          type: 'overlay',
          id: `overlay-${effect.id}`,
          overlayId: effect.id!,
          slideId: slide.id,
          overlayType: EffectType.ZOOM,
          startTime: realSlideStartTimeInSeconds + startTime,
          duration,
          trackIndex: 0 // Will be assigned by assignOverlayTracks
        })
      })
    }
  })

  return overlays
}

/**
 * Assign track indices so every effect gets its own dedicated row.
 * Effects are grouped by type (SPOTLIGHT → CALLOUT → ZOOM) and each
 * individual effect within a group gets the next available row.
 *
 * Example: 2 spotlights + 1 zoom → 3 rows
 *   Row 0: spotlight A
 *   Row 1: spotlight B
 *   Row 2: zoom A
 */
export function assignOverlayTracks(overlays: OverlayItem[]): OverlayItem[] {
  if (overlays.length === 0) return []

  const typeOrder = [EffectType.SPOTLIGHT, EffectType.CALLOUT, EffectType.ZOOM]

  // Collect all overlays in type order
  const ordered: OverlayItem[] = []
  for (const effectType of typeOrder) {
    ordered.push(...overlays.filter(o => o.overlayType === effectType))
  }

  // Reverse so the most recently added effect (last in array) gets trackIndex 0 (top row)
  const result: OverlayItem[] = []
  let nextTrack = 0
  for (const overlay of [...ordered].reverse()) {
    result.push({ ...overlay, trackIndex: nextTrack++ })
  }

  return result
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
  pixelsPerSecond: number = DEFAULT_PIXELS_PER_SECOND,
  fps: number
): TimelineLayout {
  const slideItems = calculateSlideItems(slides, pixelsPerSecond)
  const transitionItems = calculateTransitionItems(slides, pixelsPerSecond)
  const overlayItems = assignOverlayTracks(calculateOverlayItems(slides, fps))

  // Group overlays by track index
  const maxTrackIndex = overlayItems.length > 0 ? Math.max(...overlayItems.map(o => o.trackIndex)) : -1

  const tracks: OverlayItem[][] = []
  for (let i = 0; i <= maxTrackIndex; i++) {
    tracks.push(overlayItems.filter(o => o.trackIndex === i))
  }

  const numOverlayTracks = tracks.length
  const totalHeight = SLIDE_TRACK_HEIGHT + numOverlayTracks * OVERLAY_TRACK_HEIGHT

  return {
    slideTrack: {
      height: SLIDE_TRACK_HEIGHT,
      items: [...slideItems, ...transitionItems].sort((a, b) => a.startTime - b.startTime)
    },
    overlayTracks: {
      height: OVERLAY_TRACK_HEIGHT,
      tracks
    },
    totalHeight,
    pixelsPerSecond
  }
}
