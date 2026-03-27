import type { Section } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { VideoStoreSet, VideoStoreGet } from "./types";
import { createNewSection } from "./defaults";
import { getSections, updateVideoConfigSections } from "./utils";
import { DragEndEvent } from "@dnd-kit/core";

export const createSectionActions = (set: VideoStoreSet, get: VideoStoreGet) => ({

  /* ================= ADD ================= */

  addSection() {
    const { videoConfig } = get();
    if (!videoConfig) return;

    const newSection = createNewSection();

    const newVideoConfig = updateVideoConfigSections(videoConfig, sections => [
      ...sections,
      newSection,
    ]);

    set({
      videoConfig: newVideoConfig,
    });

    get().refreshPendingChanges();
  },

  /* ================= EDITING ================= */

  setEditingSectionId: (sectionId: string | null) =>
    set({ editingSectionId: sectionId }),

  setEditingSectionTitle: (title: string) =>
    set({ editingSectionTitle: title }),

  /* ================= REMOVE ================= */

  removeSection(sectionId: string) {
    const { videoConfig, selectedSlide } = get();
    if (!videoConfig) return;

    const currentSections = getSections(videoConfig);

    const newVideoConfig = updateVideoConfigSections(videoConfig, sections =>
      sections.filter((s: Section) => s.id !== sectionId)
    );

    const newSections = currentSections.filter(
      (s: Section) => s.id !== sectionId
    );

    set({
      videoConfig: newVideoConfig,
    });

    // Reselect fallback if needed
    if (selectedSlide?.section.id === sectionId) {
      const first = newSections.find(s => s.slides.length > 0);

      if (first) {
        set({
          selectedSlide: {
            section: first,
            slide: first.slides[0],
          },
        });
      } else {
        set({ selectedSlide: null });
      }
    }

    get().refreshPendingChanges();
  },

  /* ================= UPDATE ================= */

  updateSectionTitle(sectionId: string, newTitle: string) {
    const { videoConfig, selectedSlide } = get();
    if (!videoConfig) return;

    const newVideoConfig = updateVideoConfigSections(videoConfig, sections =>
      sections.map(section =>
        section.id === sectionId
          ? { ...section, title: newTitle }
          : section
      )
    );

    set({
      videoConfig: newVideoConfig,
      editingSectionId: null,
    });

    if (selectedSlide?.section.id === sectionId) {
      set({
        selectedSlide: {
          ...selectedSlide,
          section: {
            ...selectedSlide.section,
            title: newTitle,
          },
        },
      });
    }

    get().refreshPendingChanges();
  },

  /* ================= DRAG ================= */

  handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const { videoConfig } = get();
    if (!videoConfig) return;

    const sections = getSections(videoConfig);

    const oldIdx = sections.findIndex(s => s.id === active.id);
    const newIdx = sections.findIndex(s => s.id === over.id);

    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = [...sections];
    const [moved] = reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, moved);

    const newVideoConfig = updateVideoConfigSections(
      videoConfig,
      () => reordered
    );

    set({
      videoConfig: newVideoConfig,
    });

    get().refreshPendingChanges();
  },

  getFPS: () => {
    const { videoConfig } = get();
    return videoConfig?.metadata?.fps ?? 30;
  },

});
