import { VideoStoreSet, VideoStoreGet } from "./types";
import { updateVideoConfigSections, updateSelectedSlide } from "./utils";

export const createVoiceoverActions = (set: VideoStoreSet, get: VideoStoreGet) => ({

  /* ================= SLIDE VOICEOVER ================= */

  handleGenerateSlideVoiceover() {
    const { selectedSlide, videoConfig } = get();
    if (!selectedSlide || !videoConfig) return;

    set({ generatingSlideVoiceover: selectedSlide.slide.id });

    setTimeout(() => {

      const newVideoConfig = updateVideoConfigSections(
        videoConfig,
        sections =>
          sections.map(section => ({
            ...section,
            slides: section.slides.map(slide =>
              slide.id === selectedSlide.slide.id
                ? { ...slide, voiceoverGenerated: true }
                : slide
            ),
          }))
      );

      set({
        videoConfig: newVideoConfig,
        selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
          ...slide,
          voiceoverGenerated: true,
        })),
        generatingSlideVoiceover: null,
      });

      get().autoSyncVideoConfig();

    }, 1500);
  },

  /* ================= UI ================= */

  setShowVoiceover: (show: boolean) =>
    set({ showVoiceover: show }),

  /* ================= SECTION VOICEOVER ================= */

  handleGenerateSectionVoiceover(sectionId: string) {
    const { videoConfig } = get();
    if (!videoConfig) return;

    set({ generatingSectionVoiceover: sectionId });

    setTimeout(() => {

      const newVideoConfig = updateVideoConfigSections(
        videoConfig,
        sections =>
          sections.map(section =>
            section.id === sectionId
              ? {
                  ...section,
                  voiceoverGenerated: true,
                  slides: section.slides.map(slide => ({
                    ...slide,
                    voiceoverGenerated: true,
                  })),
                }
              : section
          )
      );

      set({
        videoConfig: newVideoConfig,
        generatingSectionVoiceover: null,
      });

      get().autoSyncVideoConfig();

    }, 2000);
  },

});
