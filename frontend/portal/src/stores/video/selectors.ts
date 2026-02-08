import { Resolution } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { VideoStoreSet, VideoStoreGet } from "./types";
import { Video } from "@coasterai/pb/coasterai/core/v1/video_pb";

export const createSelectors = (set: VideoStoreSet, get: VideoStoreGet) => ({
  getFPS() {
    const { videoConfig } = get();
    return Number(videoConfig?.metadata?.fps) || 30;
  },

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
