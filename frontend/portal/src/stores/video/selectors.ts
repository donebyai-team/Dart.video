import { Resolution } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { VideoStoreSet, VideoStoreGet } from "./types";

export const createSelectors = (set: VideoStoreSet, get: VideoStoreGet) => ({
  getFPS() {
    const { videoConfig } = get();
    return videoConfig?.fps || 30;
  },

  setResolution: (resolution: Resolution) => set({ resolution }),
});
