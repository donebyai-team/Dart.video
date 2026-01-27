import { TimelineSlide } from "@/components/editor/timeline/types";
import type {
    EditorConfig, EditorCallbacks,
    VideoConfig,
    TextAnimationSlideConfig,
} from "@/types/editor";
import type { EntityId } from "@/types/selection";
import { ActiveTool, LeftPanelTool } from "@/types/tools";
import { JsonObject } from "@bufbuild/protobuf";
import { AnnotationObject, CanvasObject, Resolution, Section, Slide, SlideEffect, SlideType, TransitionType } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import type { StateCreator } from "zustand";

// Zustand store types
export type VideoStoreSet = Parameters<StateCreator<VideoState & VideoActions, [], [], VideoState & VideoActions>>[0];
export type VideoStoreGet = Parameters<StateCreator<VideoState & VideoActions, [], [], VideoState & VideoActions>>[1];

export interface VideoState {
    config: EditorConfig | null;
    videoConfig: VideoConfig | null;
    sections: Section[];
    resolution: Resolution | null;
    globalBackgroundColor?: string;
    isInitialized: boolean;
    selectedEntityId: EntityId;
    selectedSlide: { section: Section; slide: Slide } | null;
    selectedObjectId: string | null;
    selectedStackItemId: string | null;
    activeTool: LeftPanelTool;
    showScreenshots: boolean;
    showVoiceover: boolean;
    openSections: string[];
    showTransitionPicker: string | null;
    generatingSectionVoiceover: string | null;
    editingSectionId: string | null;
    editingSectionTitle: string;
    generatingSlideVoiceover: string | null;
    onConfigChange?: EditorCallbacks["onConfigChange"];
}

export interface VideoActions {
    initialize: (config: EditorConfig, videoConfig: VideoConfig, callbacks?: EditorCallbacks) => void;
    notifyConfigChange: (sections: Section[]) => void;

    // Sections
    addSection: () => void;
    removeSection: (sectionId: string) => void;
    updateSectionTitle: (sectionId: string, newTitle: string) => void;
    toggleSection: (sectionId: string) => void;
    handleSectionDragEnd: (event: { active: { id: string }; over: { id: string } | null }) => void;
    setEditingSectionId: (sectionId: string | null) => void;
    setEditingSectionTitle: (title: string) => void;

    // Slides
    getTimelineSlides: () => TimelineSlide[];
    createSlideEntityId: (slideId: string) => EntityId;
    addSlide: (sectionId: string, type: SlideType) => void;
    removeSlide: (sectionId: string, slideId: string) => void;
    updateSlide: (updates: Partial<Slide>) => void;
    updateSlideContent: (updates: Record<string, unknown>) => void;
    updateSlideTransition: (sectionId: string, slideId: string, transitionId: TransitionType) => void;
    reorderSlidesInSection: (sectionId: string, activeId: string, overId: string) => void;
    createStackItemEntityId: (slideId: string, itemId: string) => EntityId;
    createOverlayEntityId: (slideId: string, overlayId: string) => EntityId;

    // Canvas
    getEffectiveCanvasObjects: () => SlideEffect[];
    addEffect: (effect: SlideEffect) => void;
    addAnnotation: (annotation: AnnotationObject) => void;
    updateEffect: (id: string, updates: Partial<SlideEffect>) => void;
    updateAnnotation: (id: string, updates: Partial<AnnotationObject>) => void;
    deleteEffect: (id: string) => void;
    deleteAnnotation: (id: string) => void;
    updateCanvasObject: (id: string, updates: Record<string, unknown>) => void;
    deleteCanvasObject: (id: string) => void;

    // Entity selection
    handleSelectEntity: (entityId: EntityId) => void;
    handleSelectObject: (id: string | null) => void;
    openEntitySettings: (id: EntityId) => void;

    // Tools
    handleSelectTool: (tool: ActiveTool) => void;
    handleCloseTool: () => void;
    handleEditSlide: () => void;

    // Text animation
    handleSelectTextAnimationTemplate: (templateId: string) => void;
    handleUpdateTemplateProps: (props: JsonObject) => void;
    getTextAnimationConfig: () => TextAnimationSlideConfig | undefined;

    // Voiceover
    handleGenerateSlideVoiceover: () => void;
    handleGenerateSectionVoiceover: (sectionId: string) => void;
    setShowVoiceover: (show: boolean) => void;

    updateSlideTranscript: (transcript: string) => void;
    setResolution: (resolution: Resolution) => void;
    // setShowScreenshots: (show: boolean) => void;
    setShowTransitionPicker: (slideId: string | null) => void;
    updateSlideBackground: (color: string, applyToAll?: boolean) => void;

    getFPS: () => number;
}
