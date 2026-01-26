
import { ActiveToolType } from "@/types/tools";
import { Slide, SlideType } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { getSlideTypeConfig } from "./utils";
import { getDefaultTemplateProps } from "@/types/textAnimationTemplates";
import { VideoStoreSet, VideoStoreGet } from "./types";

export const createTextAnimationActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
  getTextAnimationConfig() {
    const { config } = get();
    const slideConfig = getSlideTypeConfig(config, SlideType.TEXT_ANIMATION);
    return slideConfig?.id === SlideType.TEXT_ANIMATION ? slideConfig : undefined;
  },

  setShowTransitionPicker: (slideId: string| null) => set({ showTransitionPicker: slideId }),

  handleSelectTextAnimationTemplate(templateId: string) {
    const { config, selectedSlide, sections } = get();
    if (!config || !selectedSlide) return;

    const textConfig = get().getTextAnimationConfig();
    const templates = textConfig?.templates.templates || [];
    const defaultProps = getDefaultTemplateProps(templates, templateId);

    const slide = selectedSlide.slide;

    if (slide.content.case !== "animation") return;

    const newTemplateConfig = {
      ...slide.content.value.templateConfig,
      ...defaultProps,
    };

    const newSections = sections.map((s) =>
      s.id === selectedSlide.section.id
        ? {
          ...s,
          slides: s.slides.map((sl) =>
            sl.id === slide.id
              ? {
                ...sl,
                content: {
                  case: "animation",
                  value: {
                    ...sl.content.value,
                    templateId, // update template selection
                    templateConfig: newTemplateConfig,
                  },
                },
              }
              : sl
          ),
        }
        : s
    );

    set({
      sections: sections,
      selectedSlide: {
        ...selectedSlide,
        slide: {
          ...slide,
          content: {
            case: "animation",
            value: {
              ...slide.content.value,
              templateId,
              ...newTemplateConfig,
            },
          },
        } as Slide,
      },
      activeTool: { type: ActiveToolType.TEXT_ANIMATION_TEMPLATE },
    });
  },


  handleUpdateTemplateProps(newProps: Record<string, string | number>) {
    const { sections, selectedSlide } = get();
    if (!selectedSlide) return;

    const slide = selectedSlide.slide;

    if (slide.content.case !== "animation") return;

    const prev = slide.content.value;
    const newConfig = { ...prev.templateConfig, ...newProps };

    const newSections = sections.map((s) =>
      s.id === selectedSlide.section.id
        ? {
          ...s,
          slides: s.slides.map((sl) =>
            sl.id === slide.id
              ? {
                ...sl,
                content: {
                  case: "animation",
                  value: {
                    ...sl.content.value,
                    templateConfig: newConfig,
                  },
                },
              }
              : sl
          ),
        }
        : s
    );

    set({
      sections: sections,
      selectedSlide: {
        ...selectedSlide,
        slide: {
          ...slide,
          content: {
            case: "animation",
            value: {
              ...prev,
              templateConfig: newConfig,
            },
          },
        } as Slide,
      },
    });
  }

});
