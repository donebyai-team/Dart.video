import type { Section } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { VideoStoreSet, VideoStoreGet } from "./types";
import { createNewSection } from "./defaults";
import { findSlideLocation, getSections, updateVideoConfigSections } from "./utils";

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
    if (selectedSlide && findSlideLocation(videoConfig, selectedSlide.id)?.section.id === sectionId) {
      const first = newSections.find(s => s.slides.length > 0);

      if (first) {
        set({ selectedSlide: first.slides[0] });
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

    get().refreshPendingChanges();
  },

  getFPS: () => {
    const { videoConfig } = get();
    return videoConfig?.metadata?.fps ?? 30;
  },

});
