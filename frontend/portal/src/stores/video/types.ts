import type {
    Section, Resolution, Slide,
    AnnotationObject,
    CanvasObject,
    SlideEffect,
    SlideType,
} from "@/types/slides";
import type {
    EditorConfig, EditorCallbacks,
    VideoConfig,
    TextAnimationSlideConfig,
    TextAnimationTemplateId,
} from "@/types/editor";
import type { EntityId } from "@/types/selection";
import { ActiveTool, LeftPanelTool } from "@/types/tools";

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
    initialize: (config, videoConfig, callbacks?) => void;
    notifyConfigChange: (sections) => void;

    // Sections
    addSection: () => void;
    removeSection: (sectionId: string) => void;
    updateSectionTitle: (sectionId: string, newTitle: string) => void;
    toggleSection: (sectionId: string) => void;
    handleSectionDragEnd: (event: any) => void;
    setEditingSectionId: (sectionId: string | null) => void;
    setEditingSectionTitle: (title: string) => void;

    // Slides
    createSlideEntityId: (slideId: string) => EntityId;
    addSlide: (sectionId: string, type: SlideType) => void;
    removeSlide: (sectionId: string, slideId: string) => void;
    updateSlide: (updates: Partial<Slide>) => void;
    updateSlideContent: (updates: any) => void;
    updateSlideTransition: (sectionId: string, slideId: string, transitionId: string) => void;
    reorderSlidesInSection: (sectionId: string, activeId: string, overId: string) => void;
    createStackItemEntityId: (slideId: string, itemId: string) => EntityId;
    createOverlayEntityId: (slideId: string, overlayId: string) => EntityId;

    // Canvas
    getEffectiveCanvasObjects: () => CanvasObject[];
    addEffect: (effect: SlideEffect) => void;
    addAnnotation: (annotation: AnnotationObject) => void;
    updateEffect: (id: string, updates: Partial<SlideEffect>) => void;
    updateAnnotation: (id: string, updates: Partial<AnnotationObject>) => void;
    deleteEffect: (id: string) => void;
    deleteAnnotation: (id: string) => void;
    updateCanvasObject: (id: string, updates: any) => void;
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
    handleSelectTextAnimationTemplate: (templateId: TextAnimationTemplateId) => void;
    handleUpdateTemplateProps: (props: Record<string, string | number>) => void;
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
