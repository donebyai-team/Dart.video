import { SlideType, SpotlightEffect, CanvasObjectType, CalloutEffect } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { ActiveToolType, LeftPanelTool } from '@/types/tools'
import { VideoStoreSet, VideoStoreGet } from './types'

export const createToolActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
  handleSelectTool(tool: LeftPanelTool) {
    const { resolution, selectedSlide } = get()
    if (!resolution || !selectedSlide) return
    const startTime = selectedSlide.slide.transitionDuration || 0
    const endTime = selectedSlide.slide.duration - (selectedSlide.slide.transitionDuration || 0)
    console.debug('tool selected', tool)
    set({ activeTool: tool })

    if (tool?.type === ActiveToolType.INSERT) {
      const objectId = `obj-${Date.now()}`

      if (tool.tool === CanvasObjectType.CANVAS_SPOTLIGHT) {
        const spotlightEffect: SpotlightEffect = {
          $typeName: 'coasterai.core.v1.SpotlightEffect',
          id: objectId,
          x: resolution.width / 2 - 100,
          y: resolution.height / 2 - 75,
          width: 200,
          height: 150,
          blurAmount: 10,
          borderRadius: 8,
          startTime,
          endTime,
          type: CanvasObjectType.CANVAS_SPOTLIGHT
        }

        get().addSpotlight(spotlightEffect)
        set({ selectedObjectId: spotlightEffect.id })
      } else if (tool.tool === CanvasObjectType.CANVAS_CALLOUT) {
        const calloutEffect: CalloutEffect = {
          $typeName: 'coasterai.core.v1.CalloutEffect',
          id: objectId,
          x: resolution.width / 2 - 100,
          y: resolution.height / 2 - 75,
          width: 200,
          height: 150,
          blurAmount: 10,
          borderRadius: 8,
          startTime,
          endTime,
          type: CanvasObjectType.CANVAS_CALLOUT,
          color:"#22c55e"
        }

        get().addCallout(calloutEffect)
        set({ selectedObjectId: calloutEffect.id })
      }

      // if (tool.tool === CanvasObjectType.CANVAS_CALLOUT) {
      //   const calloutAnnotation: CalloutAnnotation = {
      //     $typeName: "coasterai.core.v1.CalloutAnnotation",
      //     id: objectId,
      //     x: 100,
      //     y: 100,
      //     color: "#ef4444",
      //     opacity: 1.0,
      //     calloutStyle: "pointer",
      //   };

      //   const annotation: AnnotationObject = {
      //     $typeName: "coasterai.core.v1.AnnotationObject",
      //     annotation: {
      //       case: "callout",
      //       value: calloutAnnotation,
      //     },
      //   };

      //   get().addAnnotation(annotation);
      //   set({ selectedObjectId: calloutAnnotation.id });
      // }
    }
  },

  handleCloseTool() {
    set({ activeTool: null })
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
