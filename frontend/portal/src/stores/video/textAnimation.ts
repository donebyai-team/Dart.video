import { ActiveToolType } from "@/types/tools";
import { AnimationSlideContent, SlideType } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { getSlideTypeConfig } from "./defaults";
import { getDefaultTemplateProps } from "@/types/textAnimationTemplates";
import { VideoStoreSet, VideoStoreGet } from "./types";
import { JsonObject } from "@bufbuild/protobuf";
import { updateVideoConfigSections, updateSelectedSlide } from "./utils";
import defaultEditorConfig from "@/data/editorConfig";

export const createTextAnimationActions = (set: VideoStoreSet, get: VideoStoreGet) => ({

  /* ================= CONFIG ================= */

  getTextAnimationConfig() {
    const slideConfig = getSlideTypeConfig(
      defaultEditorConfig,
      SlideType.ANIMATION
    );

    return slideConfig?.id === SlideType.ANIMATION
      ? slideConfig
      : undefined;
  },

  setShowTransitionPicker: (slideId: string | null) =>
    set({ showTransitionPicker: slideId }),

  /* ================= TEMPLATE SELECT ================= */

  handleSelectTextAnimationTemplate(templateId: string) {
    console.debug("local template changed to", templateId)
    const { videoConfig, selectedSlide } = get();
    if (!videoConfig?.config || !selectedSlide) return;

    const slide = selectedSlide.slide;
    if (slide.content.case !== "animation") return;

    const textConfig = get().getTextAnimationConfig();
    const templates = textConfig?.templates.templates ?? [];

    const defaultProps = getDefaultTemplateProps(templates, templateId);

    const currentAnimation = slide.content.value;

    const newTemplateConfig = {
      // ...currentAnimation.templateConfig, // Remove it so that the previous config is removed
      ...defaultProps,
    };

    const newAnimationContent = {
      case: "animation" as const,
      value: {
        ...currentAnimation,
        templateId,
        templateUrl: "", // IMP: set it to empty so that we don't search for invallid url
        templateConfig: newTemplateConfig,
      } as AnimationSlideContent,
    };

    const newVideoConfig = updateVideoConfigSections(
      videoConfig,
      sections =>
        sections.map(section =>
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
        )
    );

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        content: newAnimationContent,
      })),
      activeTool: { type: ActiveToolType.TEXT_ANIMATION_TEMPLATE },
    });

    get().autoSyncVideoConfig();
  },

  /* ================= PROP UPDATE ================= */

  updateTextAnimationProps(newProps: JsonObject) {
    const { videoConfig, selectedSlide } = get();
    if (!videoConfig || !selectedSlide) return;

    const slide = selectedSlide.slide;
    if (slide.content.case !== "animation") return;

    const prevAnimation = slide.content.value;

    const newTemplateConfig = {
      ...newProps,
    };

    const newAnimationContent = {
      case: "animation" as const,
      value: {
        ...prevAnimation,
        templateConfig: newTemplateConfig,
      } as AnimationSlideContent,
    };

    const newVideoConfig = updateVideoConfigSections(
      videoConfig,
      sections =>
        sections.map(section =>
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
        )
    );

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        content: newAnimationContent,
      })),
    });

    get().autoSyncVideoConfig();

    console.debug("UPDATED slide props", newProps);
  },

});
