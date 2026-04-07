import { portalClient } from "@/services/grpc";
import { getConnectError } from "@/utils/error";
import { VideoStoreGet, VideoStoreSet } from "./types";
import { Video } from "@coasterai/pb/coasterai/core/v1/video_pb";
import { createSlideEntityId } from "@/types/selection";
import { getSections } from "./utils";
import { ensureVideoResolution } from "./defaults";
import defaultEditorConfig from "@/data/editorConfig";
import toast from "react-hot-toast";

// Module-level controller for the active GetVideo stream.
// Replaced on every startVideoStream call; aborted by stopVideoStream.
let activeStreamController: AbortController | null = null;

const clearStreamingState = (set: VideoStoreSet) => {
  set({
    isStreamingVideo: false,
    streamingThinkingSummary: "",
    streamingTotalSlides: 0,
  });
};

export const createStreamingActions = (set: VideoStoreSet, get: VideoStoreGet) => ({

  startVideoStream: async (videoId: string): Promise<Video | null> => {
    const STREAM_TIMEOUT = 5 * 60 * 1000;

    // Abort any previous stream before starting a new one.
    activeStreamController?.abort();

    const controller = new AbortController();
    activeStreamController = controller;

    try {
      set({
        isStreamingVideo: true,
        streamingThinkingSummary: "Thinking...",
        streamingError: null,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Stream timeout after 5 minutes')), STREAM_TIMEOUT);
      });

      // Pass the abort signal so the stream is cancelled when stopVideoStream is called.
      const stream = portalClient.getVideo({ id: videoId }, { signal: controller.signal });

      let latestVideo: Video | null = null;
      let hasReceivedData = false;

      const streamPromise = (async () => {

        for await (const response of stream) {
          hasReceivedData = true;

          if (response.video) {
            latestVideo = response.video;

            const safeVideo = ensureVideoResolution(response.video, defaultEditorConfig);
            // const currentState = get();

            // Keep the accepted snapshot aligned with server state until the user
            // starts editing locally.
            // if (!currentState.hasPendingChanges) {
            set({
              videoConfig: safeVideo,
              acceptedVideoConfig: structuredClone(safeVideo),
              hasPendingChanges: false,
            });
            // }

            const sections = getSections(safeVideo);
            const nextState = get();

            // if (!currentState.hasPendingChanges && sections.length > 0) {
            if (sections.length > 0) {

              // ✅ Auto select first slide
              if (!nextState.selectedSlide) {
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
                const currentSlideId = nextState.selectedSlide.slide.id;

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

          if (response.totalSlides > 0) {
            set({ streamingTotalSlides: response.totalSlides });
          }
        }

        if (!hasReceivedData) {
          throw new Error('No data received from video stream');
        }

        return latestVideo;
      })();

      const result = await Promise.race([streamPromise, timeoutPromise]);

      clearStreamingState(set);
      return result;

    } catch (error) {
      // If the error is due to an intentional abort (user clicked Stop), swallow it silently.
      if (controller.signal.aborted) {
        clearStreamingState(set);
        return null;
      }

      console.error('Video streaming failed:', error);
      set({
        isStreamingVideo: false,
        streamingError: getConnectError(error),
        streamingThinkingSummary: "",
        streamingTotalSlides: 0,
      });

      throw error;
    } finally {
      // Only clear the module ref if it still points to this controller.
      if (activeStreamController === controller) {
        activeStreamController = null;
      }
    }
  },

  stopVideoStream: () => {
    // Resolve videoId from current config before we clear state.
    const videoId = get().videoConfig?.id;

    // Abort the GetVideo poll stream so the backend ctx.Done() fires and
    // the poll loop exits. The agent itself is NOT stopped by the disconnect —
    // it is stopped only by the explicit StopVideo RPC call below.
    if (activeStreamController) {
      activeStreamController.abort();
      activeStreamController = null;
    }

    // Clear UI state immediately so the progress overlay disappears.
    clearStreamingState(set);

    // Tell the backend to stop the agent. Fire-and-forget — we don't wait
    // on this because the UI is already updated and the agent will stop
    // asynchronously via the Redis soft-cancel mechanism.
    if (videoId) {
      portalClient.stopVideo({ videoId }).catch(err => {
        console.warn('StopVideo RPC failed (agent may still be running):', err);
        toast.error(getConnectError(err));
      });
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
