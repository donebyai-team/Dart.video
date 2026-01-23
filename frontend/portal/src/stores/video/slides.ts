import { Slide, SlideType, TransitionType } from "@/types/slides";
import { arrayMove } from "@dnd-kit/sortable";
import { getSlideTypeConfig } from "./utils";
import { createOverlayEntityId, createSlideEntityId, createStackItemEntityId, createStackItemOverlayEntityId } from "@/types/selection";



export const createSlideActions = (set, get) => ({
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

        const newSlide = {
            id: `${sectionId}-${Date.now()}`,
            type,
            transcript: slideTypeConfig?.defaultTranscript || "Add your script here...",
            duration: slideTypeConfig?.defaultDuration || 5,
            transition: config.transitions.default as TransitionType,
            backgroundColor: inheritedBg,
            effects: [],
            annotations: [],
        };

        const newSections = sections.map((s) =>
            s.id === sectionId ? { ...s, slides: [...s.slides, newSlide] } : s
        );

        set({ sections: newSections });
        get().notifyConfigChange(newSections);

        const section = newSections.find((s) => s.id === sectionId);
        set({ selectedSlide: { section, slide: newSlide } });
    },

    createSlideEntityId: (slideId: string) => {
        return createSlideEntityId(slideId)
    },

    createStackItemEntityId: (slideId: string, itemId: string) => createStackItemEntityId(slideId, itemId),
    createOverlayEntityId: (slideId: string, overlayId: string) => createOverlayEntityId(slideId, overlayId),
    createStackItemOverlayEntityId: (slideId: string, itemId: string, overlayId: string) => createStackItemOverlayEntityId(slideId, itemId, overlayId),

    updateSlideBackground: (color, applyToAll = false) => {
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

    updateSlideTranscript: (transcript) => {
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
    },

    updateSlideContent(updates) {
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

    updateSlideTransition(sectionId: string, slideId: string, transitionId: string) {
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
