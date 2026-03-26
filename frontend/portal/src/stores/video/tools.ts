import { SlideType, EffectType, Section, Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { ActiveToolType, SelectedTool } from '@/types/tools'
import { VideoStoreSet, VideoStoreGet } from './types'
import { createCalloutEffect, createSpotlightEffect, createZoomEffect, getDefaultSelectedTool } from './defaults'
import { getRealSlideStartFrame } from '@/components/editor/frame_calculations'

export const createToolActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
  handleSelectTool(tool: SelectedTool, currentFrame?: number) {
    const { videoConfig } = get();
    const { selectedSlide } = get();

    if (!selectedSlide || !videoConfig) return;

    const resolution = videoConfig.metadata?.resolution;
    if (!resolution) return;

    const fps = videoConfig.metadata?.fps || 30;
    const slideDurationFrames = selectedSlide.slide.durationInFrames;
    const transitionFrames = (selectedSlide.slide.transitionDuration || 0) * fps;
    
    // Default start/end for spotlight and callout (full slide minus transitions)
    const startTime = (selectedSlide.slide.transitionDuration || 0);
    const endTime = slideDurationFrames / fps - (selectedSlide.slide.transitionDuration || 0);

    set({ activeTool: tool });

    if (tool?.type === ActiveToolType.INSERT) {

      if (tool.tool === EffectType.SPOTLIGHT) {
        const effect = createSpotlightEffect(resolution, startTime, endTime);
        get().addSpotlight(effect);
        set({ selectedEffectId: effect.id });

      } else if (tool.tool === EffectType.CALLOUT) {
        const effect = createCalloutEffect(resolution, startTime, endTime);
        get().addCallout(effect);
        set({ selectedEffectId: effect.id });

      } else if (tool.tool === EffectType.ZOOM) {
        // Zoom defaults: start at current frame (relative to slide), duration 3s
        // Convert global currentFrame to slide-relative frame
        const allSlides = get().getTimelineSlides();
        const slideStartFrame = getRealSlideStartFrame(allSlides, selectedSlide.slide.id, fps);
        const relativeFrame = Math.max(0, (currentFrame ?? 0) - slideStartFrame);
        
        const zoomDuration = fps * 3; // 3 seconds
        // Clamp start frame to valid range within slide
        const zoomStartFrame = Math.max(
          transitionFrames, 
          Math.min(relativeFrame, slideDurationFrames - transitionFrames - zoomDuration)
        );
        const zoomEndFrame = Math.min(zoomStartFrame + zoomDuration, slideDurationFrames - transitionFrames);
        
        const effect = createZoomEffect(resolution, zoomStartFrame, zoomEndFrame);
        get().addZoom(effect);
        set({ selectedEffectId: effect.id });
      }

    }
  }
  ,

  handleCloseTool() {
    set({ activeTool: getDefaultSelectedTool() })
  },

  handleEditAnimation() {
    const { selectedSlide } = get()
    if (!selectedSlide) return

    const slide = selectedSlide.slide
    if (slide.type === SlideType.ANIMATION) {
      set({ activeTool: { type: ActiveToolType.ADD_OR_EDIT_ANIMATION, settings: {} } })
    }
  },

  handleViewAnimationCode() {
    const { selectedSlide } = get()
    if (!selectedSlide) return

    if (selectedSlide.slide.type === SlideType.ANIMATION) {
      set({ activeTool: { type: ActiveToolType.ANIMATION_CODE } })
    }
  },

  handleAddAnimation(sectionId: string, afterSlideId?: string) {
    set({
      activeTool: {
        type: ActiveToolType.ADD_OR_EDIT_ANIMATION,
        settings: {
          previousSlide: {
            section: { id: sectionId } as Section,
            slide: { id: afterSlideId || '' } as Slide
          }
        }
      }
    })
  }
})
