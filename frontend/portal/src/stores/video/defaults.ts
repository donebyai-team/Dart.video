import { EditorConfig, SlideTypeConfig, TextAnimationSlideConfig } from "@/types/editor";
import { ActiveToolType, SelectedTool } from "@/types/tools";
import { create } from "@bufbuild/protobuf";
import { AnimationSlideContentSchema,
    BackgroundStyle,
    BackgroundStyleSchema,
    CalloutEffect,
    CalloutEffectSchema,
    MediaSlideContentSchema,
    MediaType,
    MetaData, MetaDataSchema,
    Section, SectionSchema,
    Slide, SlideSchema, SlideStatus, SlideType,
    SpotlightEffect, SpotlightEffectSchema,
    StackAnimationMode,
    StackSlideContentSchema,
    TransitionType,
    ZoomEffect,
    ZoomEffectSchema,
 } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { Resolution, ResolutionSchema, Video, VideoMetadata, VideoMetadataSchema } from "@coasterai/pb/coasterai/core/v1/video_pb";
import { SelectedSection } from "./types";
import { TRANSITION_DURATION_SECONDS } from "@/components/editor/frame_calculations";

// Helper functions (moved from useEditorState)
export const getSlideTypeConfig = (config: EditorConfig | null, slideType: SlideType): SlideTypeConfig | undefined => {
    return config?.slideTypes.types.find(t => t.id === slideType);
};

/**
 * Returns a default BackgroundStyle with a solid color.
 */
export function createDefaultBackgroundStyle(
  hex: string = "transparent",
  applyAll: boolean = false
) {
  return create(BackgroundStyleSchema, {
    style: {
      case: "solid",
      value: {
        hex,
      },
    },
    applyAll,
  });
}

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
        case SlideType.MEDIA:
            return {
                case: "media",
                value: create(MediaSlideContentSchema, {
                    mediaType: MediaType.IMAGE,
                    meta: getDefaultMetadata(),                    
                    src: "https://placehold.co/600x400?text=Upload+a+screenshot+or+short+clip+of+your+product&font=roboto",
                    style: {},
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
    inheritedBg: BackgroundStyle;
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
        transcript: "",
        slideStatus: SlideStatus.GENERATED,
        duration: defaultDuration ?? 5,
        transition: TransitionType.TRANSITION_NONE,
        backgroundStyle: inheritedBg,
        transitionDuration: TRANSITION_DURATION_SECONDS,
        content: buildSlideContent(type),
        spotlights: [],
        callouts: [],
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

export const createSpotlightEffect = (
    resolution: Resolution,
    startTimeInSec: number,
    endTimeInSec: number
): SpotlightEffect => {
    const width = 200;
    const height = 150;

    return create(SpotlightEffectSchema, {
        id: `spotlight-effect-${Date.now()}`,
        x: resolution.width / 2 - width / 2,
        y: resolution.height / 2 - height / 2,
        width,
        height,
        blurAmount: 10,
        borderRadius: 8,
        startTime: startTimeInSec,
        endTime: endTimeInSec,
    });
};

export const createCalloutEffect = (
    resolution: Resolution,
    startTimeInSec: number,
    endTimeInSec: number
): CalloutEffect => {
    const width = 200;
    const height = 150;

    return create(CalloutEffectSchema, {
        id: `callout-effect-${Date.now()}`,
        x: resolution.width / 2 - width / 2,
        y: resolution.height / 2 - height / 2,
        width,
        height,
        blurAmount: 10,
        borderRadius: 8,
        startTime: startTimeInSec,
        endTime: endTimeInSec,
        color: "#22c55e"
    });
};

export const createZoomEffect = (
    resolution: Resolution,
    startTimeInSec: number,
    endTimeInSec: number
): ZoomEffect => {
    return create(ZoomEffectSchema, {
        id: `zoom-effect-${Date.now()}`,
        x: resolution.width / 2,
        y: resolution.height / 2,
        zoomLevel: 2,
        startTime: startTimeInSec,
        endTime: endTimeInSec,
    });
};

export const getDefaultSelectedTool = (): SelectedTool => {
    return { type: ActiveToolType.NONE }
}

export const getDefaultResolution = (config: EditorConfig): Resolution => {
    const fallback = config?.resolution?.options?.[0];

    const selected =
        config?.resolution?.options?.find(
            r => r.id === config?.resolution?.default
        ) ?? fallback;

    // Absolute last fallback (never return undefined)
    const safe = selected ?? {
        id: "16:9",
        name: "Landscape",
        aspect: "16/9",
        width: 1920,
        height: 1080,
    };

    return create(ResolutionSchema, safe);
};


export const getInitialSelection = (videoConfig: Video): SelectedSection | null => {
    const firstSection = videoConfig.config?.sections?.[0];
    const firstSlide = firstSection?.slides?.[0];

    if (!firstSection) return null;

    if (firstSlide) {
        return { section: firstSection, slide: firstSlide };
    }

    // Section exists but no slides
    return null;
}

export const getDefaulVideotMetadata = (config: EditorConfig): VideoMetadata => {
    return create(VideoMetadataSchema, {
        fps: 30,
        resolution: getDefaultResolution(config)
    });
}

export const ensureVideoResolution = (
    video: Video,
    config: EditorConfig
): Video => {

    const defaultResolution = getDefaultResolution(config);

    // If metadata missing → create full metadata
    if (!video.metadata) {
        return {
            ...video,
            metadata: getDefaulVideotMetadata(config),
        };
    }

    // If resolution missing → clone + inject resolution
    if (!video.metadata.resolution) {
        return {
            ...video,
            metadata: create(VideoMetadataSchema, {
                ...video.metadata,
                resolution: defaultResolution,
            }),
        };
    }

    // Already valid → return original (important for avoiding extra renders)
    return video;
};







