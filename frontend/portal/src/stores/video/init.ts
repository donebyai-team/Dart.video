import { createSlideEntityId } from "@/types/selection";
import { VideoStoreSet, VideoStoreGet } from "./types";
import { EditorConfig } from "@/types/editor";
import { Video, VideoSchema } from "@coasterai/pb/coasterai/core/v1/video_pb";
import { ensureVideoResolution, getInitialSelection } from "./defaults";
import { clone } from "@bufbuild/protobuf";

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
    const firstSlideId = selectedSlide?.id ?? "";

    set({
      videoConfig: newVideoConfig,
      acceptedVideoConfig: clone(VideoSchema, newVideoConfig),
      hasPendingChanges: false,
      isSyncing: false,
      undoStack: [],
      selectedEntityId: createSlideEntityId(firstSlideId),
      selectedSlide,
      isInitialized: true,
    });

    console.log("Store initialization complete");
  }
  ,
});
