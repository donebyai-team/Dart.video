import { createSlideEntityId } from "@/types/selection";
import type { Slide, Section } from "@/types/slides";
import { SlideType } from "@/types/slides";

export const createInitActions = (set, get) => ({
  initialize(config, videoConfig, callbacks) {
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
      config.resolution.options.find((r) => r.id === config.resolution.default) ||
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
      type: SlideType.TEXT_ANIMATION,
      transcript: "",
      duration: 2,
      content: {
        type: "text-animation",
        template_id: "text-reveal",
        template_config: {
          text: "",
          x: 192,
          y: 108,
          width: 1536,
          height: 864,
        },
      },
      effects: [],
      annotations: [],
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
      openSections: videoConfig.sections.map((s) => s.id),
      onConfigChange: callbacks?.onConfigChange,
      isInitialized: true,
    });

    console.log("Store initialization complete");
  },

  notifyConfigChange(newSections) {
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
