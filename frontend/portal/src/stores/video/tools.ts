import { SlideType, EffectType } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { ActiveToolType, SelectedTool } from '@/types/tools'
import { VideoStoreSet, VideoStoreGet } from './types'
import { createCalloutEffect, createSpotlightEffect, getDefaultSelectedTool } from './defaults'

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
      }

    }
  }
  ,

  handleCloseTool() {
    set({ activeTool: getDefaultSelectedTool() })
  },

  handleEditSlide() {
    const { selectedSlide } = get()
    if (!selectedSlide) return

    const slide = selectedSlide.slide
    if (slide.type === SlideType.TEXT_ANIMATION) {
      set({ activeTool: { type: ActiveToolType.TEXT_ANIMATION_SETTINGS } })
    } else if (slide.type === SlideType.VISUAL_ANIMATION || slide.type === SlideType.INFOGRAPHIC) {
      set({ activeTool: { type: ActiveToolType.VISUAL_ANIMATION_SETTINGS } })
    }
  }
})
