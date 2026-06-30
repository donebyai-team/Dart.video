import { create } from "zustand";
import { initialState } from "./state";
import { createSectionActions } from "./sections";
import { createSlideActions } from "./slides";
import { createCanvasActions } from "./canvas";
import { createEntitySelectionActions } from "./entitySelection";
import { createToolActions } from "./tools";
import { createSelectors } from "./selectors";
import { createInitActions } from "./init";
import { createSyncActions } from "./sync";
import { createStreamingActions } from "./streaming";
import { VideoState, VideoActions } from "./types";

export const useVideoStore = create<VideoState & VideoActions>()((set, get) => ({
    ...initialState,
    reset: () => set(initialState),
    ...createInitActions(set, get),
    ...createSyncActions(set, get),
    ...createStreamingActions(set, get),
    ...createSectionActions(set, get),
    ...createSlideActions(set, get),
    ...createCanvasActions(set, get),
    ...createEntitySelectionActions(set, get),
    ...createToolActions(set, get),
    ...createSelectors(set, get),
}));