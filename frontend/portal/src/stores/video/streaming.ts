import { portalClient } from "@/services/grpc";
import { getConnectError } from "@/utils/error";
import { VideoStoreGet, VideoStoreSet } from "./types";
import { Video } from "@coasterai/pb/coasterai/core/v1/video_pb";
import { createSlideEntityId } from "@/types/selection";
import { getSections } from "./utils"; 
import { ensureVideoResolution } from "./defaults";
import defaultEditorConfig from "@/data/editorConfig";

export const createStreamingActions = (set: VideoStoreSet, get: VideoStoreGet) => ({

  startVideoStream: async (videoId: string): Promise<Video | null> => {
    const STREAM_TIMEOUT = 5 * 60 * 1000;

    try {
      set({
        isStreamingVideo: true,
        streamingThinkingSummary: "Thinking...",
        streamingError: null
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Stream timeout after 5 minutes')), STREAM_TIMEOUT);
      });

      const stream = portalClient.getVideo({ id: videoId });

      let latestVideo: Video | null = null;
      let hasReceivedData = false;

      const streamPromise = (async () => {

        for await (const response of stream) {
          hasReceivedData = true;

          if (response.video) {
            latestVideo = response.video;

            const safeVideo = ensureVideoResolution(response.video, defaultEditorConfig);

            // ✅ Single source of truth
            set({ videoConfig: safeVideo });

            const sections = getSections(response.video);
            const currentState = get();

            if (sections.length > 0) {

              // ✅ Auto select first slide
              if (!currentState.selectedSlide) {
                const firstSection = sections[0];
                const firstSlide = firstSection?.slides?.[0];

                if (firstSlide && firstSection) {
                  set({
                    selectedSlide: {
                      section: firstSection,
                      slide: firstSlide
                    },
                    selectedEntityId: createSlideEntityId(firstSlide.id)
                  });
                }
              }

              // ✅ Refresh selected slide reference
              else {
                const currentSlideId = currentState.selectedSlide.slide.id;

                let foundSlide = null;
                let foundSection = null;

                for (const section of sections) {
                  const slide = section.slides?.find(s => s.id === currentSlideId);
                  if (slide) {
                    foundSlide = slide;
                    foundSection = section;
                    break;
                  }
                }

                if (foundSlide && foundSection) {
                  set({
                    selectedSlide: {
                      section: foundSection,
                      slide: foundSlide
                    }
                  });
                }
              }
            }
          }

          if (response.thinkingSummary) {
            set({ streamingThinkingSummary: response.thinkingSummary });
          }
        }

        if (!hasReceivedData) {
          throw new Error('No data received from video stream');
        }

        return latestVideo;
      })();

      const result = await Promise.race([streamPromise, timeoutPromise]);

      set({
        isStreamingVideo: false,
        streamingThinkingSummary: ""
      });

      return result;

    } catch (error) {
      console.error('Video streaming failed:', error);

      const errorMessage = getConnectError(error);

      set({
        isStreamingVideo: false,
        streamingError: errorMessage,
        streamingThinkingSummary: ""
      });

      throw error;
    }
  },

  updateStreamingProgress: (thinkingSummary?: string) => {
    if (thinkingSummary) {
      set({ streamingThinkingSummary: thinkingSummary });
    }
  },

  setStreamingError: (error: string | null) => {
    set({ streamingError: error });
  }

});
