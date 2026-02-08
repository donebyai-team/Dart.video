import { Resolution } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { VideoStoreSet, VideoStoreGet } from "./types";

export const createSelectors = (set: VideoStoreSet, get: VideoStoreGet) => ({
  setResolution: (resolution: Resolution) => {
    const { videoConfig } = get();
    if (!videoConfig?.config) return;

    const newVideoConfig = {
      ...videoConfig,
      config: {
        ...videoConfig.config,
        metadata: {
          ...(videoConfig.metadata ?? {}),
          resolution,
        },
      },
    };

    set({ videoConfig: newVideoConfig });

    get().autoSyncVideoConfig();
  },

});
