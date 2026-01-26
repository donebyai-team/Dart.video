import { createSlideEntityId } from "@/types/selection";
import { Slide, Section, SlideType } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { VideoStoreSet, VideoStoreGet } from "./types";
import { EditorConfig, VideoConfig, EditorCallbacks } from "@/types/editor";

export const createInitActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
  initialize(config: EditorConfig, videoConfig: VideoConfig, callbacks?: EditorCallbacks) {
    console.log("Store initialize called with:", {
      config: !!config,
      videoConfig: !!videoConfig,
      sections: videoConfig?.sections?.length
    });

    const currentState = get();

    // Prevent double initialization in React Strict Mode
    if (currentState.isInitialized &&
      currentState.config === config &&
      currentState.videoConfig === videoConfig) {
      console.log("Skipping duplicate initialization");
      return;
    }

    console.log("Initializing video store...");

    const defaultResolution =
      config.resolution.options.find((r: { id: string }) => r.id === config.resolution.default) ||
      config.resolution.options[0];

    const firstSection: Section | undefined = videoConfig.sections[0];
    const firstSlide: Slide | undefined = firstSection?.slides[0];

    console.log("First section/slide:", {
      firstSection: !!firstSection,
      firstSlide: !!firstSlide,
      sectionId: firstSection?.id,
      slideId: firstSlide?.id
    });

    const defaultSlide: Slide = {
      id: "",
      $typeName: "coasterai.core.v1.Slide",
      type: SlideType.TEXT_ANIMATION,
      transcript: "",
      duration: 2,
      content: {
        case: "animation",
        value: {
          templateId: "text-reveal",
          templateConfig: {
            text: "",
            x: 192,
            y: 108,
            width: 1536,
            height: 864,
          },
        },
      },
      effects: [],
      annotations: [],
      subSlides: [],
    };

    const selectedSlide = firstSlide
      ? { section: firstSection, slide: firstSlide }
      : firstSection
        ? { section: firstSection, slide: defaultSlide }
        : null;

    console.log("Setting state with selectedSlide:", !!selectedSlide);

    set({
      config,
      videoConfig,
      sections: videoConfig.sections,
      resolution: defaultResolution,
      globalBackgroundColor: videoConfig.backgroundColor,
      selectedEntityId: firstSlide
        ? createSlideEntityId(firstSlide.id)
        : createSlideEntityId(""),
      selectedSlide,
      openSections: videoConfig.sections.map((s: Section) => s.id),
      onConfigChange: callbacks?.onConfigChange,
      isInitialized: true,
    });

    console.log("Store initialization complete");
  },

  notifyConfigChange(newSections: Section[]) {
    const { onConfigChange, config, videoConfig } = get();
    if (!onConfigChange || !config || !videoConfig) return;

    onConfigChange(config, {
      ...videoConfig,
      sections: newSections,
      project: {
        ...videoConfig.project,
        updatedAt: new Date().toISOString(),
      },
    });
  },
});
