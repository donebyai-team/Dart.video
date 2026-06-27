import { create } from "@bufbuild/protobuf";
import { BackgroundAudioSchema, Resolution, VideoMetadata } from "@coasterai/pb/coasterai/core/v1/video_pb";
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

    get().refreshPendingChanges();
  },

  setBackgroundMusic: (url?: string) => {
    const { videoConfig } = get();
    if (!videoConfig?.config) return;
    console.debug("[Music changed to]", url)

    const existingBackgroundAudio = videoConfig.metadata?.bgAudio;

    const newVideoConfig = {
        ...videoConfig,
        metadata: {
          ...videoConfig.metadata,
          backgroundAudioUrl: undefined,
          bgAudio: url
            ? create(BackgroundAudioSchema, {
                url,
                volume: existingBackgroundAudio?.volume ?? 0.8,
              })
            : null
        } as VideoMetadata
      }

    set({ videoConfig: newVideoConfig });

    get().refreshPendingChanges();
  },

  setBackgroundMusicVolume: (volume: number) => {
    const { videoConfig } = get();
    if (!videoConfig?.config) return;
    console.debug("[Music volume changed to]", volume)

    const normalizedVolume = Math.max(0, Math.min(1, volume));
    const existingBackgroundAudio = videoConfig.metadata?.bgAudio;
    const fallbackUrl = videoConfig.metadata?.backgroundAudioUrl;
    const url = existingBackgroundAudio?.url ?? fallbackUrl;

    if (!url) return;

    const newVideoConfig = {
        ...videoConfig,
        metadata: {
          ...videoConfig.metadata,
          backgroundAudioUrl: undefined,
          bgAudio: create(BackgroundAudioSchema, {
            url,
            volume: normalizedVolume,
          })
        } as VideoMetadata
      }

    set({ videoConfig: newVideoConfig });

    get().refreshPendingChanges();
  },

});
