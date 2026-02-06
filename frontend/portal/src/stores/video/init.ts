import { createSlideEntityId } from "@/types/selection";
import { VideoStoreSet, VideoStoreGet } from "./types";
import { EditorConfig } from "@/types/editor";
import { Video } from "@coasterai/pb/coasterai/core/v1/video_pb";
import { getDefaultResolution, getInitialSelection } from "./utils";

export const createInitActions = (
  set: VideoStoreSet,
  get: VideoStoreGet
) => ({
  initialize(config: EditorConfig, videoConfig: Video) {
    console.log("Store initialize called", {
      hasConfig: !!config,
      hasVideoConfig: !!videoConfig,
      sectionCount: videoConfig?.config?.sections?.length ?? 0,
    });

    const currentState = get();

    // Prevent double initialization (React Strict Mode safe)
    if (
      currentState.isInitialized &&
      currentState.config === config &&
      currentState.videoConfig === videoConfig
    ) {
      console.log("Skipping duplicate initialization");
      return;
    }

    console.log("Initializing video store...");

    const resolution = getDefaultResolution(config);
    const selectedSlide = getInitialSelection(videoConfig);

    const firstSlideId = selectedSlide?.slide?.id ?? "";

    set({
      config,
      videoConfig,
      sections: videoConfig.config?.sections ?? [],
      resolution,
      globalBackgroundColor: videoConfig.metadata?.backgroundColor,
      selectedEntityId: createSlideEntityId(firstSlideId),
      selectedSlide,
      isInitialized: true,
    });

    console.log("Store initialization complete");
  },
});

