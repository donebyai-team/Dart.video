import { createSlideEntityId } from "@/types/selection";
import { VideoState } from "./types";

export const initialState: VideoState = {
  config: null,
  videoConfig: null,
  sections: [],
  resolution: null,
  globalBackgroundColor: undefined,
  isInitialized: false,

  selectedEntityId: createSlideEntityId(""),
  selectedSlide: null,
  selectedObjectId: null,
  selectedStackItemId: null,

  activeTool: null,
  showScreenshots: false,
  showVoiceover: false,
  openSections: [],
  showTransitionPicker: null,
  generatingSectionVoiceover: null,
  editingSectionId: null,
  editingSectionTitle: "",
  generatingSlideVoiceover: null,

  // Streaming state
  isStreamingVideo: false,
  streamingThinkingSummary: "",
  streamingError: null,
};
