
import { ActiveToolType } from "@/types/tools";
import { SlideType } from "@/types/slides";
import { getSlideTypeConfig } from "./utils";
import { getDefaultTemplateProps } from "@/types/textAnimationTemplates";

export const createTextAnimationActions = (set, get) => ({
  getTextAnimationConfig() {
    const { config } = get();
    const slideConfig = getSlideTypeConfig(config, SlideType.TEXT_ANIMATION);
    return slideConfig?.id === SlideType.TEXT_ANIMATION ? slideConfig : undefined;
  },

  setShowTransitionPicker: (slideId) => set({ showTransitionPicker: slideId }),

  handleSelectTextAnimationTemplate(templateId) {
    const { config, selectedSlide, sections } = get();
    if (!config || !selectedSlide) return;

    const textConfig = get().getTextAnimationConfig();
    const templates = textConfig?.templates.templates || [];
    const defaultProps = getDefaultTemplateProps(templates, templateId);

    const currentContent = selectedSlide.slide.content || {};
    const currentCfg = currentContent.template_config || {};

    const newSections = sections.map((s) =>
      s.id === selectedSlide.section.id
        ? {
            ...s,
            slides: s.slides.map((sl) =>
              sl.id === selectedSlide.slide.id
                ? {
                    ...sl,
                    content: {
                      type: "text-animation",
                      template_id: templateId,
                      template_config: {
                        x: currentCfg.x,
                        y: currentCfg.y,
                        width: currentCfg.width,
                        height: currentCfg.height,
                        ...defaultProps,
                        text: String(defaultProps.text || sl.transcript || ""),
                      },
                    },
                  }
                : sl
            ),
          }
        : s
    );

    set({
      sections: newSections,
      selectedSlide: {
        ...selectedSlide,
        slide: {
          ...selectedSlide.slide,
          content: {
            type: SlideType.TEXT_ANIMATION,
            template_id: templateId,
            template_config: {
              x: currentCfg.x,
              y: currentCfg.y,
              width: currentCfg.width,
              height: currentCfg.height,
              ...defaultProps,
              text: String(defaultProps.text || selectedSlide.slide.transcript || ""),
            },
          },
        },
      },
      activeTool: { type: ActiveToolType.TEXT_ANIMATION_TEMPLATE },
    });
  },

  handleUpdateTemplateProps(newProps) {
    const { sections, selectedSlide } = get();
    if (!selectedSlide) return;

    const content = selectedSlide.slide.content;
    if (!content?.template_id) return;

    const cfg = content.template_config || {};

    const updatedCfg = { ...cfg, ...newProps };

    const newSections = sections.map((s) =>
      s.id === selectedSlide.section.id
        ? {
            ...s,
            slides: s.slides.map((sl) =>
              sl.id === selectedSlide.slide.id
                ? {
                    ...sl,
                    content: { ...content, template_config: updatedCfg },
                  }
                : sl
            ),
          }
        : s
    );

    set({
      sections: newSections,
      selectedSlide: {
        ...selectedSlide,
        slide: {
          ...selectedSlide.slide,
          content: { ...content, template_config: updatedCfg },
        },
      },
    });
  },
});
