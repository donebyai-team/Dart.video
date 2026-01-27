// Timeline-specific types for the layered timeline visualization

import { AnnotationObject, Slide, SlideEffect, TransitionType } from "@coasterai/pb/coasterai/core/v1/slide_pb";

/**
 * Timeline item types representing different elements on the timeline
 */
export type TimelineItem = SlideItem | TransitionItem | OverlayItem;

/**
 * Represents a slide tile on the timeline with Remotion overlapping support
 */
export interface SlideItem {
  type: 'slide';
  id: string;
  slideId: string;
  startTime: number; // seconds from timeline start (display)
  duration: number; // seconds (display)
  label: string; // section title
  color: string; // section color
  // Frame-accurate data (source of truth)
  startFrame?: number; // absolute start frame
  endFrame?: number; // absolute end frame
  hasTransition?: boolean; // whether this slide has a transition
  // Overlap visualization data
  overlapStart?: number | null; // start time of overlap region (seconds)
  overlapEnd?: number | null; // end time of overlap region (seconds)
}

/**
 * Represents a transition overlay showing overlapping regions
 */
export interface TransitionItem {
  type: 'transition';
  id: string;
  slideId?: string; // Source slide ID
  startTime: number; // seconds from timeline start
  duration: number; // seconds (0.3s)
  fromSlide?: string; // Source slide ID
  toSlide?: string; // Target slide ID
  transitionType?: TransitionType;
  // Visual styling for overlaps
  opacity?: number; // 0.3 for semi-transparent
  color?: string; // Gray color for transitions
  // Legacy support
  fromSlideId?: string;
  toSlideId?: string;
}

/**
 * Represents an overlay (effect or annotation) tile on the timeline
 */
export interface OverlayItem {
  type: 'overlay';
  id: string;
  overlayId: string; // ID of the effect or annotation
  slideId: string; // Parent slide ID
  overlayType: string; // 'spotlight', 'callout', etc.
  startTime: number; // absolute time in timeline (seconds)
  duration: number; // seconds
  trackIndex: number; // for vertical stacking (0 = first overlay track)
}

/**
 * Timeline slide interface with overlay data
 */
export interface TimelineSlide {
  id: string;
  duration: number; // Exclusive duration
  sectionColor: string;
  sectionTitle: string;
  slide: Slide;
  transition?: TransitionType;
  effects?: SlideEffect[]; // Canvas-level effects
  annotations?: AnnotationObject[]; // Overlay annotations
}

/**
 * Complete timeline layout structure
 */
export interface TimelineLayout {
  slideTrack: {
    height: number; // 48px
    items: (SlideItem | TransitionItem)[];
  };
  overlayTracks: {
    height: number; // 32px per track
    tracks: OverlayItem[][]; // grouped by trackIndex
  };
  totalHeight: number;
  pixelsPerSecond: number; // 80
}
