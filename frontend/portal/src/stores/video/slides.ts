import { Slide, SlideType, StackSlideContent, TransitionType, ImageSlideContent, VideoSlideContent, AnimationSlideContent, StackAnimationMode } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { arrayMove } from "@dnd-kit/sortable";
import { getSlideTypeConfig } from "./utils";
import { createOverlayEntityId, createSlideEntityId, createStackItemEntityId, createStackItemOverlayEntityId } from "@/types/selection";
import { VideoStoreSet, VideoStoreGet } from "./types";
import { TimelineSlide } from "@/components/editor/timeline/types";
import { slide } from "@remotion/transitions/slide";



export const createSlideActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
    addSlide(sectionId: string, type: SlideType) {
        const { sections, config } = get();
        if (!config) return;

        const slideTypeConfig = getSlideTypeConfig(config, type);
        const inheritedBg =
            [...sections.flatMap(s => s.slides)]
                .reverse()
                .find(s => s.backgroundColor)?.backgroundColor ||
            slideTypeConfig?.defaultBackground ||
            config.background.defaultColor;

        // Create default content based on slide type
        let content: Slide['content'];
        
        switch (type) {
            case SlideType.IMAGE:
                content = {
                    case: "image",
                    value: {
                        $typeName: "coasterai.core.v1.ImageSlideContent",
                        src: "",
                        x: 0,
                        y: 0,
                        width: 1920,
                        height: 1080,
                        rotation: 0,
                    } as ImageSlideContent
                };
                break;
                
            case SlideType.VIDEO:
                content = {
                    case: "video",
                    value: {
                        $typeName: "coasterai.core.v1.VideoSlideContent",
                        src: "",
                        startTime: 0,
                        endTime: 10,
                    } as VideoSlideContent
                };
                break;
                
            case SlideType.TEXT_ANIMATION:
            case SlideType.VISUAL_ANIMATION:
            case SlideType.INFOGRAPHIC:
                const defaultTemplateId = type === SlideType.TEXT_ANIMATION ? "number-counter" : "default";
                content = {
                    case: "animation",
                    value: {
                        $typeName: "coasterai.core.v1.AnimationSlideContent",
                        templateId: defaultTemplateId,
                        templateConfig: {},
                    } as AnimationSlideContent
                };
                break;
                
            case SlideType.STACK:
                content = {
                    case: "stack",
                    value: {
                        $typeName: "coasterai.core.v1.StackSlideContent",
                        animationMode: StackAnimationMode.STACK,
                        items: [],
                    } as StackSlideContent
                };
                break;
                
            default:
                content = { case: undefined, value: undefined };
                break;
        }

        const newSlide: Slide = {
            $typeName: "coasterai.core.v1.Slide",
            id: `${sectionId}-${Date.now()}`,
            type,
            transcript: slideTypeConfig?.defaultTranscript || "Add your script here...",
            duration: slideTypeConfig?.defaultDuration || 5,
            transition: TransitionType.TRANSITION_NONE,
            backgroundColor: inheritedBg,
            transitionDuration: 0.3,
            content,
            effects: [],
            annotations: [],
            subSlides: [],
        };

        const newSections = sections.map((s) =>
            s.id === sectionId ? { ...s, slides: [...s.slides, newSlide] } : s
        );

        set({ sections: newSections });
        get().notifyConfigChange(newSections);

        const section = newSections.find((s) => s.id === sectionId);
        if (section) {
            set({ selectedSlide: { section, slide: newSlide } });
        }

        console.debug("added slide", section, slide)
    },

    createSlideEntityId: (slideId: string) => {
        return createSlideEntityId(slideId)
    },

    createStackItemEntityId: (slideId: string, itemId: string) => createStackItemEntityId(slideId, itemId),
    createOverlayEntityId: (slideId: string, overlayId: string) => createOverlayEntityId(slideId, overlayId),
    createStackItemOverlayEntityId: (slideId: string, itemId: string, overlayId: string) => createStackItemOverlayEntityId(slideId, itemId, overlayId),

    updateSlideBackground: (color: string, applyToAll = false) => {
        const { sections, selectedSlide, videoConfig, config, onConfigChange } = get();
        if (!selectedSlide) return;

        if (applyToAll) {
            // Set global background color and clear individual slide backgrounds
            set({ globalBackgroundColor: color });
            const newSections = sections.map(section => ({
                ...section,
                slides: section.slides.map(slide => ({
                    ...slide,
                    backgroundColor: undefined // Clear individual backgrounds, global will apply
                }))
            }));
            set({
                sections: newSections,
                selectedSlide: {
                    ...selectedSlide,
                    slide: {
                        ...selectedSlide.slide,
                        backgroundColor: undefined
                    }
                }
            });

            // Notify parent with updated videoConfig
            if (onConfigChange && config && videoConfig) {
                onConfigChange(config, {
                    ...videoConfig,
                    backgroundColor: color,
                    sections: newSections,
                    project: {
                        ...videoConfig.project,
                        updatedAt: new Date().toISOString()
                    }
                });
            }
        } else {
            // Clear global background and set individual slide background
            set({ globalBackgroundColor: undefined });
            const newSections = sections.map(section => section.id === selectedSlide.section.id ? {
                ...section,
                slides: section.slides.map(slide => slide.id === selectedSlide.slide.id ? {
                    ...slide,
                    backgroundColor: color
                } : slide)
            } : section);

            set({
                sections: newSections,
                selectedSlide: {
                    ...selectedSlide,
                    slide: {
                        ...selectedSlide.slide,
                        backgroundColor: color
                    }
                }
            });
        }
    },

    updateSlideTranscript: (transcript: string) => {
        const { sections, selectedSlide } = get();
        if (!selectedSlide) return;

        const newSections = sections.map(section => section.id === selectedSlide.section.id ? {
            ...section,
            slides: section.slides.map(slide => slide.id === selectedSlide.slide.id ? {
                ...slide,
                transcript
            } : slide)
        } : section);

        set({
            sections: newSections,
            selectedSlide: {
                ...selectedSlide,
                slide: {
                    ...selectedSlide.slide,
                    transcript
                }
            }
        });
    },

    removeSlide(sectionId: string, slideId: string) {
        const { sections, selectedSlide } = get();
        const newSections = sections.map((s) =>
            s.id === sectionId
                ? { ...s, slides: s.slides.filter((sl) => sl.id !== slideId) }
                : s
        );

        set({ sections: newSections });

        if (selectedSlide?.slide.id === slideId) {
            const section = newSections.find((s) => s.id === sectionId);
            const fallback = section?.slides?.[0];
            if (fallback) {
                set({ selectedSlide: { section, slide: fallback } });
            } else {
                const next = newSections.find((s) => s.slides.length > 0);
                set({ selectedSlide: next ? { section: next, slide: next.slides[0] } : null });
            }
        }
    },

    updateSlide(updates: Partial<Slide>) {        
        const { sections, selectedSlide } = get();
        if (!selectedSlide) return;

        const newSections = sections.map((s) =>
            s.id === selectedSlide.section.id
                ? {
                    ...s,
                    slides: s.slides.map((sl) =>
                        sl.id === selectedSlide.slide.id ? { ...sl, ...updates } : sl
                    ),
                }
                : s
        );

        set({
            sections: newSections,
            selectedSlide: {
                ...selectedSlide,
                slide: { ...selectedSlide.slide, ...updates },
            },
        });
        console.debug("slide updated", "updates", updates)
    },

    getTimelineSlides(): TimelineSlide[] {
        const { sections } = get();
        return sections.flatMap(s => s.slides.map(slide => {
            // For stack slides, calculate actual duration from nested items
            let actualDuration = slide.duration;
            if (slide.type === SlideType.STACK && slide.content) {
                const stackContent = slide.content.value as StackSlideContent;
                if (stackContent.items && Array.isArray(stackContent.items)) {
                    actualDuration = stackContent.items.reduce((sum: number, item: any) => sum + (item.duration || 0), 0);
                }
            }

            return {
                ...slide,
                id: slide.id,
                slide: slide,
                duration: actualDuration,
                sectionColor: s.color,
                sectionTitle: s.title,
                effects: slide.effects || [],
                annotations: slide.annotations || [],
            };
        }))
    },

    updateSlideContent(updates: Record<string, unknown>) {
        const { sections, selectedSlide } = get();
        if (!selectedSlide) return;

        const content = selectedSlide.slide.content || {};
        const newContent = { ...content, ...updates };

        const newSections = sections.map((s) =>
            s.id === selectedSlide.section.id
                ? {
                    ...s,
                    slides: s.slides.map((sl) =>
                        sl.id === selectedSlide.slide.id
                            ? { ...sl, content: newContent }
                            : sl
                    ),
                }
                : s
        );

        set({
            sections: newSections,
            selectedSlide: {
                ...selectedSlide,
                slide: { ...selectedSlide.slide, content: newContent },
            },
        });
    },

    updateSlideTransition(sectionId: string, slideId: string, transitionId: TransitionType) {
        const { sections } = get();
        const newSections = sections.map((s) =>
            s.id === sectionId
                ? {
                    ...s,
                    slides: s.slides.map((sl) =>
                        sl.id === slideId ? { ...sl, transition: transitionId } : sl
                    ),
                }
                : s
        );
        set({ sections: newSections, showTransitionPicker: null });
    },

    reorderSlidesInSection(sectionId: string, activeId: string, overId: string) {
        const { sections } = get();
        const newSections = sections.map((s) => {
            if (s.id !== sectionId) return s;
            const oldIndex = s.slides.findIndex((sl) => sl.id === activeId);
            const newIndex = s.slides.findIndex((sl) => sl.id === overId);
            return { ...s, slides: arrayMove(s.slides, oldIndex, newIndex) };
        });
        set({ sections: newSections });
    },
});
