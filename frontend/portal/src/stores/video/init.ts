import { createSlideEntityId } from "@/types/selection";
import { VideoStoreSet, VideoStoreGet } from "./types";
import { EditorConfig } from "@/types/editor";
import { Video } from "@coasterai/pb/coasterai/core/v1/video_pb";
import { ensureVideoResolution, getInitialSelection } from "./defaults";

export const createInitActions = (
  set: VideoStoreSet,
  get: VideoStoreGet
) => ({
  initialize(config: EditorConfig, videoConfig: Video) {

    const currentState = get();

    if (currentState.isInitialized) {
      return;
    }

    console.log("Initializing video store...");

    const newVideoConfig = ensureVideoResolution(videoConfig, config);


    const selectedSlide = getInitialSelection(newVideoConfig);
    const firstSlideId = selectedSlide?.slide?.id ?? "";

    set({
      videoConfig: newVideoConfig,
      acceptedVideoConfig: structuredClone(newVideoConfig),
      hasPendingChanges: false,
      selectedEntityId: createSlideEntityId(firstSlideId),
      selectedSlide,
      isInitialized: true,
    });

    console.log("Store initialization complete");
  }
  ,
});
