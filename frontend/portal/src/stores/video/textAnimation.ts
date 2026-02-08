
import { ActiveToolType } from "@/types/tools";
import { Slide, SlideType } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { getSlideTypeConfig } from "./defaults";
import { getDefaultTemplateProps } from "@/types/textAnimationTemplates";
import { VideoStoreSet, VideoStoreGet } from "./types";
import { JsonObject } from "@bufbuild/protobuf";

export const createTextAnimationActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
  getTextAnimationConfig() {
    const { config } = get();
    const slideConfig = getSlideTypeConfig(config, SlideType.TEXT_ANIMATION);
    return slideConfig?.id === SlideType.TEXT_ANIMATION ? slideConfig : undefined;
  },

  setShowTransitionPicker: (slideId: string | null) => set({ showTransitionPicker: slideId }),

  handleSelectTextAnimationTemplate(templateId: string) {
    const { config, selectedSlide, sections } = get();
    if (!config || !selectedSlide) return;

    const slide = selectedSlide.slide;
    if (slide.content.case !== "animation") return;

    const textConfig = get().getTextAnimationConfig();
    const templates = textConfig?.templates.templates ?? [];
    const defaultProps = getDefaultTemplateProps(templates, templateId);

    const currentAnimation = slide.content.value;

    const newTemplateConfig = {
      ...currentAnimation.templateConfig,
      ...defaultProps,
    };

    const newAnimationContent = {
      case: "animation" as const,
      value: {
        ...currentAnimation,
        templateId,
        templateConfig: newTemplateConfig,
      },
    };

    const newSections = sections.map(section =>
      section.id !== selectedSlide.section.id
        ? section
        : {
          ...section,
          slides: section.slides.map(sl =>
            sl.id !== slide.id
              ? sl
              : {
                ...sl,
                content: newAnimationContent,
              }
          ),
        }
    );

    set({
      sections: newSections,
      selectedSlide: {
        ...selectedSlide,
        slide: {
          ...slide,
          content: newAnimationContent,
        },
      },
      activeTool: { type: ActiveToolType.TEXT_ANIMATION_TEMPLATE },
    });

    get().autoSyncVideoConfig();
  }
  ,


  updateTextAnimationProps(newProps: JsonObject) {
    const { sections, selectedSlide } = get();
    if (!selectedSlide) return;

    const slide = selectedSlide.slide;
    if (slide.content.case !== "animation") return;

    const prevAnimation = slide.content.value;

    const newTemplateConfig = {
      ...prevAnimation.templateConfig,
      ...newProps,
    };

    const newAnimationContent = {
      case: "animation" as const,
      value: {
        ...prevAnimation,
        templateConfig: newTemplateConfig,
      },
    };

    const newSections = sections.map(section =>
      section.id !== selectedSlide.section.id
        ? section
        : {
          ...section,
          slides: section.slides.map(sl =>
            sl.id !== slide.id
              ? sl
              : {
                ...sl,
                content: newAnimationContent,
              }
          ),
        }
    );

    set({
      sections: newSections,
      selectedSlide: {
        ...selectedSlide,
        slide: {
          ...slide,
          content: newAnimationContent,
        },
      },
    });

    get().autoSyncVideoConfig();

    console.debug("UPDATED slide props", newProps);
  }
});
