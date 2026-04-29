import { EditorConfig } from "@/types/editor";
import { ActiveToolType, SelectedTool } from "@/types/tools";
import {
    AnimationSlideContentSchema,
    BackgroundStyle,
    BackgroundStyleSchema,
    CalloutEffect,
    CalloutEffectSchema,
    Section, SectionSchema,
    Slide, SlideSchema, SlideStatus,
    SpotlightEffect, SpotlightEffectSchema,
    TransitionType,
    ZoomEffect,
    ZoomEffectSchema,
} from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { Resolution, ResolutionSchema, Video, VideoMetadata, VideoMetadataSchema, VideoSchema } from "@coasterai/pb/coasterai/core/v1/video_pb";
import { clone, create } from "@bufbuild/protobuf";
import { SelectedSection } from "./types";
import { TRANSITION_DURATION_FRAMES } from "@coasterai/renderer/src/frameUtils";

export function resolveBackgroundStyle(
    slide?: Slide,
    globalBackground?: BackgroundStyle
): BackgroundStyle {
    return (
        slide?.backgroundStyle ??
        globalBackground ??
        createDefaultBackgroundStyle()
    );
}

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

export function createNewSlide(params: { inheritedBg: BackgroundStyle }) {
    const {
        inheritedBg,
    } = params;

    return create(SlideSchema, {
        id: `slide-${crypto.randomUUID()}`,
        transcript: "",
        slideStatus: SlideStatus.PENDING,
        durationInFrames: 5 * 30,
        transition: TransitionType.TRANSITION_NONE,
        backgroundStyle: inheritedBg,
        transitionDurationInFrames: TRANSITION_DURATION_FRAMES,
        content: create(AnimationSlideContentSchema, {}),
        spotlights: [],
        callouts: [],
        zooms: [],
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
    startFrame: number,
    endFrame: number
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
        startFrame,
        endFrame,
    });
};

export const createCalloutEffect = (
    resolution: Resolution,
    startFrame: number,
    endFrame: number
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
        startFrame,
        endFrame,
        color: "#22c55e"
    });
};

export const createZoomEffect = (
    resolution: Resolution,
    startFrame: number,
    endFrame: number
): ZoomEffect => {
    return create(ZoomEffectSchema, {
        id: `zoom-effect-${Date.now()}`,
        x: resolution.width / 2,
        y: resolution.height / 2,
        zoomLevel: 1.2,
        startFrame,
        endFrame,
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

    // If metadata missing → clone video and add full metadata
    if (!video.metadata) {
        const cloned = clone(VideoSchema, video);
        cloned.metadata = getDefaulVideotMetadata(config);
        return cloned;
    }

    // If resolution missing → clone video and inject resolution
    if (!video.metadata.resolution) {
        const cloned = clone(VideoSchema, video);
        cloned.metadata = create(VideoMetadataSchema, {
            ...video.metadata,
            resolution: defaultResolution,
        });
        return cloned;
    }

    // Already valid → return original (important for avoiding extra renders)
    return video;
};






