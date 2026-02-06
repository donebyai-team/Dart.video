import { EditorConfig, SlideTypeConfig, TextAnimationSlideConfig } from "@/types/editor";
import { create } from "@bufbuild/protobuf";
import { AnimationSlideContentSchema, ImageSlideContentSchema, MetaData, MetaDataSchema, Section, SectionSchema, Slide, SlideSchema, SlideType, StackAnimationMode, StackSlideContentSchema, TransitionType, VideoSlideContentSchema } from "@coasterai/pb/coasterai/core/v1/slide_pb";

// Helper functions (moved from useEditorState)
export const getSlideTypeConfig = (config: EditorConfig | null, slideType: SlideType): SlideTypeConfig | undefined => {
    return config?.slideTypes.types.find(t => t.id === slideType);
};

export const getTextAnimationConfig = (config: EditorConfig): TextAnimationSlideConfig | undefined => {
    const slideConfig = getSlideTypeConfig(config, SlideType.TEXT_ANIMATION);
    if (slideConfig?.id === SlideType.TEXT_ANIMATION) {
        return slideConfig as TextAnimationSlideConfig;
    }
    return undefined;
};

export const getDefaultMetadata = (): MetaData =>
    create(MetaDataSchema, {
        x: 192,
        y: 108,
        width: 1536,
        height: 864,
        scale: 1,
        rotation: 0,
    });

export function buildSlideContent(type: SlideType): Slide["content"] {
    switch (type) {
        case SlideType.IMAGE:
            return {
                case: "image",
                value: create(ImageSlideContentSchema, {
                    meta: getDefaultMetadata(),
                    src: "https://placehold.co/600x400/EEE/31343C",
                    style: {},
                }),
            };

        case SlideType.VIDEO:
            return {
                case: "video",
                value: create(VideoSlideContentSchema, {
                    src: "",
                    startTime: 0,
                    endTime: 10,
                }),
            };

        case SlideType.TEXT_ANIMATION:
        case SlideType.VISUAL_ANIMATION:
        case SlideType.INFOGRAPHIC: {
            const defaultTemplateId =
                type === SlideType.TEXT_ANIMATION
                    ? "number-counter"
                    : "default";

            return {
                case: "animation",
                value: create(AnimationSlideContentSchema, {
                    templateId: defaultTemplateId,
                    templateConfig: {},
                    meta: getDefaultMetadata(),
                }),
            };
        }

        case SlideType.STACK:
            return {
                case: "stack",
                value: create(StackSlideContentSchema, {
                    animationMode: StackAnimationMode.STACK,
                    items: [],
                }),
            };

        default:
            return { case: undefined };
    }
}

export function createNewSlide(params: {
    sectionId: string;
    type: SlideType;
    inheritedBg: string;
    defaultTranscript?: string;
    defaultDuration?: number;
}) {
    const {
        sectionId,
        type,
        inheritedBg,
        defaultTranscript,
        defaultDuration,
    } = params;

    return create(SlideSchema, {
        id: `${sectionId}-${Date.now()}`,
        type,
        transcript: defaultTranscript ?? "Add your script here...",
        duration: defaultDuration ?? 5,
        transition: TransitionType.TRANSITION_NONE,
        backgroundColor: inheritedBg,
        transitionDuration: 0.3,
        content: buildSlideContent(type),
        spotlights: [],
        zooms: [],
        subSlides: [],
    });
}

export const createNewSection = (): Section =>
  create(SectionSchema, {
    id: `section-${Date.now()}`,
    title: "New title",
    color: "bg-primary",
    slides: [],
  });



