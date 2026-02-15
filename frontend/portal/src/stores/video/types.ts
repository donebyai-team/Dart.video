import { SpotlightEffect } from "@/components/editor/remotion/effects";
import { TimelineSlide } from "@/components/editor/timeline/types";
import type {
    EditorConfig,
    TextAnimationSlideConfig,
} from "@/types/editor";
import type { EntityId } from "@/types/selection";
import { SelectedTool } from "@/types/tools";
import { JsonObject } from "@bufbuild/protobuf";
import { Section, Slide, SlideType, TransitionType, CalloutEffect } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { Resolution, Video } from "@coasterai/pb/coasterai/core/v1/video_pb";
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
    selectedStackItemId: string | null;
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
    streamingError: string | null;
}

export interface VideoActions {
    initialize: (config: EditorConfig, videoConfig: Video) => void;

    // Sync actions
    autoSyncVideoConfig: () => void;
    getSyncStatus: () => 'idle' | 'syncing' | 'error';

    // Streaming actions
    startVideoStream: (videoId: string) => Promise<Video | null>;
    updateStreamingProgress: (thinkingSummary?: string) => void;
    setStreamingError: (error: string | null) => void;

    // Sections
    addSection: () => void;
    removeSection: (sectionId: string) => void;
    updateSectionTitle: (sectionId: string, newTitle: string) => void;
    handleSectionDragEnd: (event: { active: { id: string }; over: { id: string } | null }) => void;
    setEditingSectionId: (sectionId: string | null) => void;
    setEditingSectionTitle: (title: string) => void;

    // Slides
    getSlideWithBackground: (slide : Slide) => string;
    getTimelineSlides: () => TimelineSlide[]
    addSlide: (sectionId: string, type: SlideType) => void
    removeSlide: (sectionId: string, slideId: string) => void
    updateSlide: (updates: Partial<Slide>) => void
    updateSlideContent: (updates: Record<string, unknown>) => void
    updateSlideTransition: (sectionId: string, slideId: string, transitionId: TransitionType) => void
    reorderSlidesInSection: (sectionId: string, activeId: string, overId: string) => void

    // Canvas
    // Define function interface here for effects to get in VideoActions

    // Get effects interfaces
    getSpotlights: () => SpotlightEffect[]
    getCallouts: () => CalloutEffect[]

    // Add effects interfaces
    addSpotlight: (effect: SpotlightEffect) => void
    addCallout: (effect: CalloutEffect) => void

    // Update effects interfaces
    updateSpotlight: (id: string, updates: Partial<SpotlightEffect>) => void
    updateCallout: (id: string, updates: Partial<CalloutEffect>) => void

    // Delete effects interfaces
    deleteSpotlight: (id: string) => void
    deleteCallout: (id: string) => void

    // Entity selection
    handleSelectEntity: (entityId: EntityId) => void
    handleSelectEffect: (id: string | null) => void
    openEntitySettings: (id: EntityId) => void

    // Tools
    handleSelectTool: (tool: SelectedTool) => void
    handleCloseTool: () => void
    handleEditSlide: () => void

    // Text animation
    handleSelectTextAnimationTemplate: (templateId: string) => void
    updateTextAnimationProps: (props: JsonObject) => void
    getTextAnimationConfig: () => TextAnimationSlideConfig | undefined

    // Voiceover
    handleGenerateSlideVoiceover: () => void
    handleGenerateSectionVoiceover: (sectionId: string) => void
    setShowVoiceover: (show: boolean) => void

    updateSlideTranscript: (transcript: string) => void
    setResolution: (resolution: Resolution) => void
    setBackgroundMusic: (url?: string)  => void

    // setShowScreenshots: (show: boolean) => void;
    setShowTransitionPicker: (slideId: string | null) => void
    updateSlideBackground: (color: string, applyToAll?: boolean) => void
}
