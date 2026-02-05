import { createSlideEntityId } from "@/types/selection";
import { Slide, Section, SlideType, MetaData, AnimationSlideContent, TransitionType } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { VideoStoreSet, VideoStoreGet } from "./types";
import { EditorConfig } from "@/types/editor";
import { Video } from "@coasterai/pb/coasterai/core/v1/video_pb";

export const createInitActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
  initialize(config: EditorConfig, videoConfig: Video) {
    console.log("Store initialize called with:", {
      config: !!config,
      videoConfig: !!videoConfig,
      sections: videoConfig?.config?.sections?.length
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

    const firstSection: Section | undefined = videoConfig.config?.sections[0];
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
      transition: TransitionType.TRANSITION_NONE,
      content: {
        case: "animation",
        value: {
          $typeName: "coasterai.core.v1.AnimationSlideContent",
          templateId: "text-reveal",
          meta: {
            x: 192,
            y: 108,
            width: 1536,
            height: 864,
          } as MetaData,
          templateConfig: {
            text: "Test"
          },
        },
      },
      spotlights: [],
      zooms: [],
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
      sections: videoConfig.config?.sections,
      resolution: defaultResolution,
      globalBackgroundColor: videoConfig.metadata?.backgroundColor,
      selectedEntityId: firstSlide
        ? createSlideEntityId(firstSlide.id)
        : createSlideEntityId(""),
      selectedSlide,
      openSections: videoConfig.config?.sections.map((s: Section) => s.id),
      isInitialized: true,
    });

    console.log("Store initialization complete");
  },
});
