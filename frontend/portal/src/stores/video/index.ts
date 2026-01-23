import { create } from "zustand";
import { initialState } from "./state";
import { createSectionActions } from "./sections";
import { createSlideActions } from "./slides";
import { createCanvasActions } from "./canvas";
import { createEntitySelectionActions } from "./entitySelection";
import { createToolActions } from "./tools";
import { createVoiceoverActions } from "./voiceover";
import { createTextAnimationActions } from "./textAnimation";
import { createSelectors } from "./selectors";
import { createInitActions } from "./init";
import { VideoState, VideoActions } from "./types";

export const useVideoStore = create<VideoState & VideoActions>()((set, get) => ({
    ...initialState,
    ...createInitActions(set, get),
    ...createSectionActions(set, get),
    ...createSlideActions(set, get),
    ...createCanvasActions(set, get),
    ...createEntitySelectionActions(set, get),
    ...createToolActions(set, get),
    ...createVoiceoverActions(set, get),
    ...createTextAnimationActions(set, get),
    ...createSelectors(set, get),
}));