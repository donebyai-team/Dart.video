import { EffectType, Section, Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { ActiveToolType, SelectedTool, SlideType } from '@/types/tools'
import { VideoStoreSet, VideoStoreGet } from './types'
import { createCalloutEffect, createSpotlightEffect, createZoomEffect, getDefaultSelectedTool } from './defaults'
import { getRealSlideStartFrame } from '@/components/editor/frame_calculations'
import { TRANSITION_DURATION_FRAMES } from '@coasterai/renderer/src/frameUtils'

export const createToolActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
  handleSelectTool(tool: SelectedTool, currentFrame?: number) {
    const { videoConfig, getFPS } = get();
    const { selectedSlide } = get();

    if (!selectedSlide || !videoConfig) return;

    const resolution = videoConfig.metadata?.resolution;
    if (!resolution) return;

    const fps = getFPS();
    const slideDurationFrames = selectedSlide.durationInFrames;
    const transitionFrames = TRANSITION_DURATION_FRAMES

    const allSlides = get().getTimelineSlides();
    const slideStartFrame = getRealSlideStartFrame(allSlides, selectedSlide.id, fps);
    const relativeFrame = Math.max(0, (currentFrame ?? 0) - slideStartFrame);

    const zoomDuration = fps * 3; // 3 seconds
    // Clamp start frame to valid range within slide
    const zoomStartFrame = Math.max(
      transitionFrames,
      Math.min(relativeFrame, slideDurationFrames - transitionFrames - zoomDuration)
    );
    const zoomEndFrame = Math.min(zoomStartFrame + zoomDuration, slideDurationFrames - transitionFrames);


    const normalizedTool =
      tool.type === ActiveToolType.ADD_OR_EDIT_ANIMATION
        ? {
          ...tool,
          settings: tool.settings ?? {},
        }
        : tool

    set({ activeTool: normalizedTool });

    if (normalizedTool?.type === ActiveToolType.INSERT) {

      if (normalizedTool.tool === EffectType.SPOTLIGHT) {
        const effect = createSpotlightEffect(resolution, zoomStartFrame, zoomEndFrame);
        get().addSpotlight(effect);
        set({ selectedEffectId: effect.id });

      } else if (normalizedTool.tool === EffectType.CALLOUT) {
        const effect = createCalloutEffect(resolution, zoomStartFrame, zoomEndFrame);
        get().addCallout(effect);
        set({ selectedEffectId: effect.id });

      } else if (normalizedTool.tool === EffectType.ZOOM) {

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

    set({ activeTool: { type: ActiveToolType.ADD_OR_EDIT_ANIMATION, settings: {} } })
  },

  handleViewAnimationCode() {
    const { selectedSlide } = get()
    if (!selectedSlide) return

    set({ activeTool: { type: ActiveToolType.ANIMATION_CODE } })
  },

  handleAddAnimation(sectionId: string, afterSlideId?: string, slideType?: SlideType) {
    const { addSlide } = get()

    // Add an empty slide
    addSlide(sectionId, afterSlideId, slideType)
    if (slideType === SlideType.MEDIA) {
      // get().acceptVideoConfigChanges();
      return
    }

    // Open settings only for animation slides
    set({
      activeTool: {
        type: ActiveToolType.REIMAGINE,
      }
    })
  }
})
