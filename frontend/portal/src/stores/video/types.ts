import { TimelineSlide } from "@/components/editor/timeline/types";
import type {
    EditorConfig,
} from "@/types/editor";
import type { EntityId } from "@/types/selection";
import { SelectedTool } from "@/types/tools";
import { Section, Slide, TransitionDirection, TransitionType, CalloutEffect, BackgroundStyle, ZoomEffect, SpotlightEffect } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { Resolution, Video } from "@coasterai/pb/coasterai/core/v1/video_pb";
import { DragEndEvent } from "@dnd-kit/core";
import type { StateCreator } from "zustand";

// Zustand store types
export type VideoStoreSet = Parameters<StateCreator<VideoState & VideoActions, [], [], VideoState & VideoActions>>[0]
export type VideoStoreGet = Parameters<StateCreator<VideoState & VideoActions, [], [], VideoState & VideoActions>>[1]

export interface SelectedSection {
    section: Section
    slide: Slide
}


export interface VideoState {
    videoConfig: Video | null;
    isInitialized: boolean;
    selectedEntityId: EntityId;
    selectedSlide: SelectedSection | null;
    selectedEffectId: string | null;
    activeTool: SelectedTool;
    showScreenshots: boolean;
    showVoiceover: boolean;
    showTransitionPicker: string | null;
    generatingSectionVoiceover: string | null;
    editingSectionId: string | null;
    editingSectionTitle: string;
    generatingSlideVoiceover: string | null;

    // Streaming state
    isStreamingVideo: boolean;
    streamingThinkingSummary: string;
    streamingTotalSlides: number;
    streamingError: string | null;
}

export interface VideoActions {
    initialize: (config: EditorConfig, videoConfig: Video) => void;

    // Sync actions
    autoSyncVideoConfig: () => void;
    getSyncStatus: () => 'idle' | 'syncing' | 'error';
    getFPS: () => number;

    // Streaming actions
    startVideoStream: (videoId: string) => Promise<Video | null>;
    stopVideoStream: () => void;
    updateStreamingProgress: (thinkingSummary?: string) => void;
    setStreamingError: (error: string | null) => void;

    // Sections
    addSection: () => void;
    removeSection: (sectionId: string) => void;
    updateSectionTitle: (sectionId: string, newTitle: string) => void;
    handleSectionDragEnd: (event: DragEndEvent) => void;
    setEditingSectionId: (sectionId: string | null) => void;
    setEditingSectionTitle: (title: string) => void;

    // Slides
    getSlideDurationInSeconds: (slide: Slide) => number;
    getSlideWithBackground: (slide : Slide) => BackgroundStyle;
    getTimelineSlides: () => TimelineSlide[]
    addSlide: (sectionId: string, afterSlideId?: string) => void
    addAnimationSlide: (sectionId: string, slide: Slide,afterSlideId?: string) => void
    removeSlide: (sectionId: string, slideId: string) => void
    updateSlide: (updates: Partial<Slide>) => void
    updateSlideContent: (updates: Record<string, unknown>) => void
    updateSlideTransition: (sectionId: string, slideId: string, transitionId: TransitionType, direction?: TransitionDirection) => void
    reorderSlidesInSection: (sectionId: string, activeId: string, overId: string) => void

    // Canvas
    // Define function interface here for effects to get in VideoActions

    // Get effects interfaces
    getSpotlights: () => SpotlightEffect[]
    getCallouts: () => CalloutEffect[]
    getZooms: () => ZoomEffect[]

    // Add effects interfaces
    addSpotlight: (effect: SpotlightEffect) => void
    addCallout: (effect: CalloutEffect) => void
    addZoom: (effect: ZoomEffect) => void

    // Update effects interfaces
    updateSpotlight: (id: string, updates: Partial<SpotlightEffect>) => void
    updateCallout: (id: string, updates: Partial<CalloutEffect>) => void
    updateZoom: (effectId: string, updates: Partial<ZoomEffect>) => void

    // Delete effects interfaces
    deleteSpotlight: (id: string) => void
    deleteCallout: (id: string) => void
    deleteZoom: (id: string) => void

    // Entity selection
    handleSelectEntity: (entityId: EntityId) => void
    handleSelectEffect: (id: string | null) => void
    openEntitySettings: (id: EntityId) => void

    // Tools
    handleSelectTool: (tool: SelectedTool, currentFrame?: number) => void
    handleCloseTool: () => void
    handleEditAnimation: () => void
    handleViewAnimationCode: () => void
    handleAddAnimation: (sectionId: string, afterSlideId?: string) => void                                          

    // Voiceover
    handleGenerateSlideVoiceover: () => void
    handleGenerateSectionVoiceover: (sectionId: string) => void
    setShowVoiceover: (show: boolean) => void

    updateSlideTranscript: (transcript: string) => void
    setResolution: (resolution: Resolution) => void
    setBackgroundMusic: (url?: string)  => void

    // setShowScreenshots: (show: boolean) => void;
    setShowTransitionPicker: (slideId: string | null) => void
    updateSlideBackground: (background: BackgroundStyle) => void
}
