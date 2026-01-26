import { VideoStoreSet, VideoStoreGet } from "./types";

export const createVoiceoverActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
    handleGenerateSlideVoiceover() {
        const { selectedSlide, sections } = get();
        if (!selectedSlide) return;

        set({ generatingSlideVoiceover: selectedSlide.slide.id });

        setTimeout(() => {
            const newSections = sections.map((s) => ({
                ...s,
                slides: s.slides.map((sl) =>
                    sl.id === selectedSlide.slide.id ? { ...sl, voiceoverGenerated: true } : sl
                ),
            }));

            set({
                sections: newSections,
                selectedSlide: {
                    ...selectedSlide,
                    slide: { ...selectedSlide.slide, voiceoverGenerated: true },
                },
                generatingSlideVoiceover: null,
            });
        }, 1500);
    },

    setShowVoiceover: (show: boolean) => set({ showVoiceover: show }),

    handleGenerateSectionVoiceover(sectionId: string) {
        const { sections } = get();
        set({ generatingSectionVoiceover: sectionId });

        setTimeout(() => {
            const newSections = sections.map((s) =>
                s.id === sectionId
                    ? {
                        ...s,
                        voiceoverGenerated: true,
                        slides: s.slides.map((sl) => ({ ...sl, voiceoverGenerated: true })),
                    }
                    : s
            );

            set({
                sections: newSections,
                generatingSectionVoiceover: null,
            });
        }, 2000);
    },
});
