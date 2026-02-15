import { Resolution, VideoMetadata } from "@coasterai/pb/coasterai/core/v1/video_pb";
import { VideoStoreSet, VideoStoreGet } from "./types";

export const createSelectors = (set: VideoStoreSet, get: VideoStoreGet) => ({
  setResolution: (resolution: Resolution) => {
    const { videoConfig } = get();
    if (!videoConfig?.config) return;
    console.debug("[Resolution changed to]", resolution)

    const newVideoConfig = {
        ...videoConfig,
        metadata: {
          ...videoConfig.metadata,
          resolution: resolution
        } as VideoMetadata
      }

    set({ videoConfig: newVideoConfig });

    get().autoSyncVideoConfig();
  },

  setBackgroundMusic: (url?: string) => {
    const { videoConfig } = get();
    if (!videoConfig?.config) return;
    console.debug("[Music changed to]", url)

    const newVideoConfig = {
        ...videoConfig,
        metadata: {
          ...videoConfig.metadata,
          backgroundAudioUrl: url
        } as VideoMetadata
      }

    set({ videoConfig: newVideoConfig });

    get().autoSyncVideoConfig();
  },

});
