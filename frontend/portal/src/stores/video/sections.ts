import type { Section } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { VideoStoreSet, VideoStoreGet } from "./types";
import { createNewSection } from "./defaults";

export const createSectionActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
  addSection() {
    const { sections, videoConfig } = get();
    if (!videoConfig) return;

    const newSection = createNewSection();
    const newSections = [...sections, newSection];
    set({
      sections: newSections,
    });
    get().autoSyncVideoConfig();
  },

  setEditingSectionId: (sectionId: string | null) => set({ editingSectionId: sectionId }),
  setEditingSectionTitle: (title: string) => set({ editingSectionTitle: title }),

  removeSection(sectionId: string) {
    const { sections, selectedSlide } = get();
    const newSections = sections.filter((s: Section) => s.id !== sectionId);

    set({ sections: newSections });

    // If selected section deleted, reselect fallback
    if (selectedSlide?.section.id === sectionId) {
      const first = newSections.find((s: Section) => s.slides.length > 0);
      if (first) {
        set({ selectedSlide: { section: first, slide: first.slides[0] } });
      } else {
        set({ selectedSlide: null });
      }
    }

    get().autoSyncVideoConfig();
  },

  updateSectionTitle(sectionId: string, newTitle: string) {
    const { sections, selectedSlide } = get();

    const newSections = sections.map((s) =>
      s.id === sectionId ? { ...s, title: newTitle } : s
    );

    set({ sections: newSections, editingSectionId: null });

    if (selectedSlide?.section.id === sectionId) {
      set({
        selectedSlide: {
          ...selectedSlide,
          section: { ...selectedSlide.section, title: newTitle },
        },
      });
    }

    get().autoSyncVideoConfig();
  },

  handleSectionDragEnd(event: { active: { id: string }; over: { id: string } | null }) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const { sections } = get();

    const oldIdx = sections.findIndex((s) => s.id === active.id);
    const newIdx = sections.findIndex((s) => s.id === over.id);

    const reordered = [...sections];
    const [moved] = reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, moved);

    set({ sections: reordered });
    get().autoSyncVideoConfig();
  },
});
