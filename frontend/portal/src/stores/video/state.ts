import { createSlideEntityId } from "@/types/selection";
import { VideoState } from "./types";
import { getDefaultSelectedTool } from "./defaults";

export const initialState: VideoState = {
  // main state
  videoConfig: null,


  // TODO: move these into a separate states maybe
  // only needed while editing
  isInitialized: false,
  selectedEntityId: createSlideEntityId(""),
  selectedSlide: null,
  selectedEffectId: null,
  selectedStackItemId: null,

  activeTool: getDefaultSelectedTool(),
  showScreenshots: false,
  showVoiceover: false,
  showTransitionPicker: null,
  generatingSectionVoiceover: null,
  editingSectionId: null,
  editingSectionTitle: "",
  generatingSlideVoiceover: null,

  // Streaming state
  isStreamingVideo: false,
  streamingThinkingSummary: "",
  streamingTotalSlides: 0,
  streamingError: null,
};
