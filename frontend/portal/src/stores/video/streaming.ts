import { portalClient } from "@/services/grpc";
import { getConnectError } from "@/utils/error";
import { VideoStoreGet, VideoStoreSet } from "./types";
import { Video } from "@coasterai/pb/coasterai/core/v1/video_pb";
import { createSlideEntityId } from "@/types/selection";

export const createStreamingActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
  startVideoStream: async (videoId: string): Promise<Video | null> => {
    const STREAM_TIMEOUT = 5*60*1000; // 60 seconds timeout for longer streams
    
    try {
      set({ 
        isStreamingVideo: true, 
        streamingThinkingSummary: "Thinking...",
        streamingError: null 
      });

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Stream timeout after 60 seconds')), STREAM_TIMEOUT);
      });

      // Create the streaming request
      const stream = portalClient.getVideo({ id: videoId });
      
      let latestVideo = null;
      let hasReceivedData = false;

      // Race between stream processing and timeout
      const streamPromise = (async () => {
        // Process each streaming response
        for await (const response of stream) {
          hasReceivedData = true;
          
          if (response.video) {
            latestVideo = response.video;
            
            // Update the video config in the store immediately for real-time UI updates
            set({ videoConfig: response.video });
            
            // Also update sections immediately for real-time storyboard updates
            if (response.video.config?.sections) {
              const currentState = get();
              set({ sections: response.video.config.sections });
              
              // If no slide is currently selected and we have sections, select the first slide
              if (!currentState.selectedSlide && response.video.config.sections.length > 0) {
                const firstSection = response.video.config.sections[0];
                const firstSlide = firstSection?.slides?.[0];
                
                if (firstSlide && firstSection) {
                  console.log('Auto-selecting first slide during streaming:', firstSlide.id);
                  set({
                    selectedSlide: { section: firstSection, slide: firstSlide },
                    selectedEntityId: createSlideEntityId(firstSlide.id)
                  });
                }
              }
              // If we already have a selected slide but it might be outdated, update it
              else if (currentState.selectedSlide && response.video.config.sections.length > 0) {
                const currentSlideId = currentState.selectedSlide.slide.id;
                let foundSlide = null;
                let foundSection = null;
                
                // Find the current slide in the updated sections
                for (const section of response.video.config.sections) {
                  const slide = section.slides?.find(s => s.id === currentSlideId);
                  if (slide) {
                    foundSlide = slide;
                    foundSection = section;
                    break;
                  }
                }
                
                // Update the selected slide with the latest data
                if (foundSlide && foundSection) {
                  set({
                    selectedSlide: { section: foundSection, slide: foundSlide }
                  });
                }
              }
            }
          }

          if (response.thinkingSummary) {
            set({ streamingThinkingSummary: response.thinkingSummary });
          }
        }

        // Check if we received any data
        if (!hasReceivedData) {
          throw new Error('No data received from video stream');
        }

        return latestVideo;
      })();

      // Wait for either stream completion or timeout
      const result = await Promise.race([streamPromise, timeoutPromise]);

      // Stream completed successfully
      set({ 
        isStreamingVideo: false,
        streamingThinkingSummary: ""
      });

      // Return the final video for initialization
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