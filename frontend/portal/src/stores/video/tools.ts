import { EffectType, Section, Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { ActiveToolType, SelectedTool, SlideType } from '@/types/tools'
import { VideoStoreSet, VideoStoreGet } from './types'
import { createCalloutEffect, createSpotlightEffect, createZoomEffect, getDefaultSelectedTool } from './defaults'
import { getRealSlideStartFrame } from '@/components/editor/frame_calculations'
import { TRANSITION_DURATION_FRAMES } from '@coasterai/renderer/src/frameUtils'

// Centralized guard for any action that would replace the current active tool.
// We only interrupt the transition when Reimagine is open and scene generation is still running.
export const shouldChangeActiveTool = (get: VideoStoreGet, nextToolType?: ActiveToolType) => {
  const { activeTool, sceneGenerationRunning } = get()

  if (
    activeTool.type !== ActiveToolType.REIMAGINE
    || !sceneGenerationRunning
    || nextToolType === ActiveToolType.REIMAGINE
  ) {
    return true
  }

  // This can be reached from store actions, so guard browser-only confirmation usage.
  if (typeof window === 'undefined') return false

  return window.confirm('Scene generation is in progress. Are you sure you want to stop?')
}

export const createToolActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
  handleSelectTool(tool: SelectedTool, currentFrame?: number) {
    const { videoConfig, getFPS } = get();
    const { selectedSlide } = get();

    if (!selectedSlide || !videoConfig) return;
    if (!shouldChangeActiveTool(get, tool.type)) return;

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
    if (!shouldChangeActiveTool(get, ActiveToolType.NONE)) return
    set({ activeTool: getDefaultSelectedTool() })
  },

  handleEditAnimation() {
    const { selectedSlide } = get()
    if (!selectedSlide) return
    if (!shouldChangeActiveTool(get, ActiveToolType.ADD_OR_EDIT_ANIMATION)) return

    set({ activeTool: { type: ActiveToolType.ADD_OR_EDIT_ANIMATION, settings: {} } })
  },

  handleViewAnimationCode() {
    const { selectedSlide } = get()
    if (!selectedSlide) return
    if (!shouldChangeActiveTool(get, ActiveToolType.ANIMATION_CODE)) return

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
