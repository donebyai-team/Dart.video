import { SlideType, EffectType } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { ActiveToolType, SelectedTool } from '@/types/tools'
import { VideoStoreSet, VideoStoreGet } from './types'
import { createCalloutEffect, createSpotlightEffect, getDefaultSelectedTool } from './utils'

export const createToolActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
  handleSelectTool(tool: SelectedTool) {
    const { resolution, selectedSlide } = get()
    if (!resolution || !selectedSlide) return
    const startTime = selectedSlide.slide.transitionDuration || 0
    const endTime = selectedSlide.slide.duration - (selectedSlide.slide.transitionDuration || 0)
    console.debug('tool selected', tool)
    set({ activeTool: tool })

    if (tool?.type === ActiveToolType.INSERT) {
      if (tool.tool === EffectType.SPOTLIGHT) {
        const spotlightEffect = createSpotlightEffect(resolution, startTime, endTime);

        get().addSpotlight(spotlightEffect)
        set({ selectedObjectId: spotlightEffect.id })
      } else if (tool.tool === EffectType.CALLOUT) {
        const calloutEffect = createCalloutEffect(resolution, startTime, endTime);

        get().addCallout(calloutEffect)
        set({ selectedObjectId: calloutEffect.id })
      }
    }
  },

  handleCloseTool() {
    set({ activeTool: getDefaultSelectedTool()})
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
