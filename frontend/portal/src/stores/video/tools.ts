import { SlideType } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { ActiveToolType } from "@/types/tools";

export const createToolActions = (set, get) => ({
  handleSelectTool(tool) {
    const { resolution, selectedSlide } = get();
    if (!resolution || !selectedSlide) return;

    set({ activeTool: tool });

    if (tool?.type === ActiveToolType.INSERT) {
      const objectId = `obj-${Date.now()}`;

      if (tool.tool === "spotlight") {
        const effect = {
          id: objectId,
          type: "spotlight",
          x: resolution.width / 2 - 100,
          y: resolution.height / 2 - 75,
          width: 200,
          height: 150,
          blurAmount: 10,
          borderRadius: 8,
          startTime: 0,
          endTime: selectedSlide.slide.duration,
        };
        get().addEffect(effect);
        set({ selectedObjectId: effect.id });
      }

      if (tool.tool === "callout") {
        const annotation = {
          id: objectId,
          type: "callout",
          x: 100,
          y: 100,
          color: "#ef4444",
          opacity: 100,
          calloutStyle: "pointer",
        };
        get().addAnnotation(annotation);
        set({ selectedObjectId: annotation.id });
      }
    }
  },

  handleCloseTool() {
    set({ activeTool: null });
  },

  handleEditSlide() {
    const { selectedSlide } = get();
    if (!selectedSlide) return;

    const slide = selectedSlide.slide;
    if (slide.type === SlideType.TEXT_ANIMATION) {
      set({ activeTool: { type: ActiveToolType.TEXT_ANIMATION_SETTINGS } });
    } else if (slide.type === SlideType.VISUAL_ANIMATION || slide.type === SlideType.INFOGRAPHIC) {
      set({ activeTool: { type: ActiveToolType.VISUAL_ANIMATION_SETTINGS } });
    }
  },
});
