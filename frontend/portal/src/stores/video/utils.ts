import { EditorConfig, SlideTypeConfig, TextAnimationSlideConfig } from "@/types/editor";
import { SlideType } from "@coasterai/pb/coasterai/core/v1/slide_pb";

// Helper functions (moved from useEditorState)
export const getSlideTypeConfig = (config: EditorConfig| null, slideType: SlideType): SlideTypeConfig | undefined => {
    return config?.slideTypes.types.find(t => t.id === slideType);
};

export const getTextAnimationConfig = (config: EditorConfig): TextAnimationSlideConfig | undefined => {
    const slideConfig = getSlideTypeConfig(config, SlideType.TEXT_ANIMATION);
    if (slideConfig?.id === SlideType.TEXT_ANIMATION) {
        return slideConfig as TextAnimationSlideConfig;
    }
    return undefined;
};