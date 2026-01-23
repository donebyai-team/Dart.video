import { parseEntityId } from "@/types/selection";
import { SlideType } from "@/types/slides";
import { ActiveToolType } from "@/types/tools";

export const createEntitySelectionActions = (set, get) => ({
    handleSelectEntity(entityId) {
        console.debug("[VideoStore] handleSelectEntity", { entityId });
        const { sections } = get();
        set({ selectedEntityId: entityId });

        try {
            const parsed = parseEntityId(entityId);
            const slideId = parsed.slideId;

            let foundSlide = null;
            let foundSection = null;

            for (const section of sections) {
                const slide = section.slides.find((sl) => sl.id === slideId);
                if (slide) {
                    foundSlide = slide;
                    foundSection = section;
                    break;
                }
            }

            if (!foundSlide) return;

            set({ selectedSlide: { section: foundSection, slide: foundSlide } });

            if (parsed.type === "overlay") {
                set({
                    selectedObjectId: parsed.overlayId,
                    selectedStackItemId: null,
                });

                const obj = get()
                    .getEffectiveCanvasObjects()
                    .find((o) => o.id === parsed.overlayId);

                set({
                    activeTool: obj
                        ? { type: ActiveToolType.INSERT, tool: obj.type }
                        : null,
                });
            } else if (parsed.type === "stack-item") {
                set({
                    selectedObjectId: null,
                    selectedStackItemId: parsed.itemId,
                    activeTool: { type: "stack-settings" },
                });
            } else if (parsed.type === "stack-item-overlay") {
                set({
                    selectedObjectId: parsed.overlayId,
                    selectedStackItemId: parsed.itemId,
                    activeTool: { type: ActiveToolType.INSERT },
                });
            } else {
                set({
                    selectedObjectId: null,
                    selectedStackItemId: null,
                    activeTool: null,
                });
            }
        } catch (err) {
            console.error("Invalid entity", entityId, err);
        }
    },

    openEntitySettings(entityId: string) {
        const { sections, selectedStackItemId } = get();
        const parsed = parseEntityId(entityId);

        let foundSlide = null;
        for (const section of sections) {
            const slide = section.slides.find((s) => s.id === parsed.slideId);
            if (slide) {
                foundSlide = slide;
                break;
            }
        }
        if (!foundSlide) return;

        console.log("Open settings for slide:", parsed, foundSlide)

        if (parsed.type === "slide") {
            if (foundSlide.type === SlideType.STACK) {
                set({ activeTool: { type: ActiveToolType.STACK_SETTINGS } });

                const items = (foundSlide.content as any)?.items || [];
                if (items[0] && !selectedStackItemId) {
                    set({ selectedStackItemId: items[0].id });
                }
            } else if (foundSlide.type === SlideType.TEXT_ANIMATION) {
                set({ activeTool: { type: ActiveToolType.TEXT_ANIMATION_TEMPLATE } });
            }
        } else if (parsed.type === "overlay" || parsed.type === "stack-item-overlay") {
            const obj = get()
                .getEffectiveCanvasObjects()
                .find((o) => o.id === parsed.overlayId);

            if (obj) {
                set({ activeTool: { type: ActiveToolType.INSERT, tool: obj.type } });
            }
        }
    },

    handleSelectObject(id) {
        const { selectedSlide, selectedStackItemId } = get();
        if (!selectedSlide) return;

        set({ selectedObjectId: id });

        if (id) {
            set({ selectedStackItemId: null });
            const obj = get()
                .getEffectiveCanvasObjects()
                .find((o) => o.id === id);

            if (obj) {
                set({ activeTool: { type: ActiveToolType.INSERT, tool: obj.type } });
            }
        } else {
            const slide = selectedSlide.slide;
            if (slide.type === SlideType.TEXT_ANIMATION) {
                set({ activeTool: { type: ActiveToolType.TEXT_ANIMATION_TEMPLATE } });
            } else if (slide.type === SlideType.STACK) {
                set({ activeTool: { type: ActiveToolType.STACK_SETTINGS } });
                const first = (slide.content as any)?.items?.[0];
                if (first && !selectedStackItemId) {
                    set({ selectedStackItemId: first.id });
                }
            } else {
                set({ activeTool: null });
            }
        }
    },
});
