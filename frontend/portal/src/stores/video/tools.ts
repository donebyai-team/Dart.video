import { SlideType, EffectType, Section, Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { ActiveToolType, SelectedTool } from '@/types/tools'
import { VideoStoreSet, VideoStoreGet } from './types'
import { createCalloutEffect, createSpotlightEffect, createZoomEffect, getDefaultSelectedTool } from './defaults'

export const createToolActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
  handleSelectTool(tool: SelectedTool) {
    const { videoConfig } = get();
    const { selectedSlide } = get();

    if (!selectedSlide || !videoConfig) return;

    const resolution = videoConfig.metadata?.resolution;
    if (!resolution) return;

    const startTime = selectedSlide.slide.transitionDuration || 0;
    const endTime =
      selectedSlide.slide.duration -
      (selectedSlide.slide.transitionDuration || 0);

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
        const effect = createZoomEffect(resolution, startTime, endTime);
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
