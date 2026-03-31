import { TimelineSlide } from '@/components/editor/timeline/types'
import { Slide, TransitionDirection, TransitionType, BackgroundStyle, Section } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { arrayMove } from '@dnd-kit/sortable'
import { createNewSlide, getDefaulVideotMetadata, createDefaultBackgroundStyle, resolveBackgroundStyle } from './defaults'
import { VideoStoreSet, VideoStoreGet } from './types'
import { getSections, updateVideoConfigSections, updateSelectedSlide, updateTotalDuration, getPreviousSlide } from './utils'
import defaultEditorConfig from '@/data/editorConfig'
import { TRANSITION_DURATION_FRAMES } from '@coasterai/renderer/src/frameUtils'

export const createSlideActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
  /* ================= ADD ================= */

  setShowTransitionPicker: (slideId: string | null) =>
    set({ showTransitionPicker: slideId }),

  // if global is available then use global or default to slide
  getSlideWithBackground(slide: Slide): BackgroundStyle {
    const { videoConfig } = get();

    if (!videoConfig?.config) {
      return createDefaultBackgroundStyle();
    }

    const globalBackground = videoConfig.metadata?.backgroundStyle;

    return resolveBackgroundStyle(slide, globalBackground);
  },

  addSlide(sectionId: string, afterSlideId?: string): string {
    const { videoConfig } = get();
    if (!videoConfig?.config) return "";

    const sections = getSections(videoConfig);
    const previousSlide = getPreviousSlide(sections, sectionId);

    const globalBackground = videoConfig.metadata?.backgroundStyle;

    const inheritedBg =
      globalBackground ??
      previousSlide?.backgroundStyle ??
      createDefaultBackgroundStyle();

    const newSlide = createNewSlide({
      inheritedBg,
    });

    let newVideoConfig = updateVideoConfigSections(videoConfig, sections =>
      sections.map(s => {
        if (s.id !== sectionId) return s;
        if (!afterSlideId) return { ...s, slides: [...s.slides, newSlide] };
        const idx = s.slides.findIndex(sl => sl.id === afterSlideId);
        const insertAt = idx === -1 ? s.slides.length : idx + 1;
        const updated = [...s.slides];
        updated.splice(insertAt, 0, newSlide);
        return { ...s, slides: updated };
      })
    );

    newVideoConfig = updateTotalDuration(newVideoConfig);

    set({ videoConfig: newVideoConfig });

    const section = getSections(newVideoConfig).find(s => s.id === sectionId);

    if (section) {
      set({ selectedSlide: { section, slide: newSlide } });
    }

    console.debug("added slide", newSlide.id, "after", afterSlideId);

    get().refreshPendingChanges();
    return newSlide.id;
  },

  /* ================= BACKGROUND ================= */

  updateSlideBackground: (background: BackgroundStyle) => {
    const { videoConfig, selectedSlide } = get();
    if (!videoConfig || !videoConfig.config || !selectedSlide) return;

    let newVideoConfig = videoConfig;

    /* =========================
       APPLY TO ALL (GLOBAL)
       ========================= */

    if (background.applyAll) {
      // 1️⃣ Remove slide overrides
      newVideoConfig = updateVideoConfigSections(videoConfig, (sections) =>
        sections.map((section) => ({
          ...section,
          slides: section.slides.map((slide) => {
            const { backgroundStyle, ...rest } = slide;
            return rest;
          }),
        }))
      );

      // 2️⃣ Set global background
      newVideoConfig = {
        ...newVideoConfig,
        metadata: {
          ...(videoConfig.metadata ??
            getDefaulVideotMetadata(defaultEditorConfig)),
          backgroundStyle: background,
        },
      };

      // 3️⃣ Remove selected override
      set({
        videoConfig: newVideoConfig,
        selectedSlide: updateSelectedSlide(selectedSlide, (slide) => {
          const { backgroundStyle, ...rest } = slide;
          return rest;
        }),
      });
    }

    /* =========================
       APPLY TO SELECTED ONLY
       ========================= */

    else {
      const globalBackground = videoConfig.metadata?.backgroundStyle;

      // 1️⃣ Remove global background from metadata
      const metadata = videoConfig.metadata ??
        getDefaulVideotMetadata(defaultEditorConfig);

      const { backgroundStyle: _, ...metadataWithoutBg } = metadata;

      // 2️⃣ Push global background down to all slides except selected
      newVideoConfig = updateVideoConfigSections(videoConfig, (sections) =>
        sections.map((section) => ({
          ...section,
          slides: section.slides.map((slide) => {
            if (
              slide.id === selectedSlide.slide.id &&
              section.id === selectedSlide.section.id
            ) {
              // Selected slide → new background
              return {
                ...slide,
                backgroundStyle: {
                  ...background,
                  applyAll: false,
                },
              };
            }

            // Other slides → inherit previous global (if existed)
            if (globalBackground) {
              return {
                ...slide,
                backgroundStyle: {
                  ...globalBackground,
                  applyAll: false,
                },
              };
            }

            return slide;
          }),
        }))
      );

      // 3️⃣ Update config without global background
      newVideoConfig = {
        ...newVideoConfig,
        metadata: metadataWithoutBg,
      };

      set({
        videoConfig: newVideoConfig,
        selectedSlide: updateSelectedSlide(selectedSlide, (slide) => ({
          ...slide,
          backgroundStyle: {
            ...background,
            applyAll: false,
          },
        })),
      });
    }

    get().refreshPendingChanges();
  },

  /* ================= TRANSCRIPT ================= */

  updateSlideTranscript(transcript: string) {
    const { videoConfig, selectedSlide } = get()
    if (!videoConfig || !selectedSlide) return

    const newVideoConfig = updateVideoConfigSections(videoConfig, sections =>
      sections.map(section =>
        section.id === selectedSlide.section.id
          ? {
            ...section,
            slides: section.slides.map(slide =>
              slide.id === selectedSlide.slide.id ? { ...slide, transcript } : slide
            )
          }
          : section
      )
    )

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        transcript
      }))
    })

    get().refreshPendingChanges()
  },

  /* ================= REMOVE ================= */

  removeSlide(sectionId: string, slideId: string) {
    const { videoConfig, selectedSlide } = get()
    if (!videoConfig) return

    let newVideoConfig = updateVideoConfigSections(videoConfig, sections =>
      sections.map(section =>
        section.id === sectionId ? { ...section, slides: section.slides.filter(sl => sl.id !== slideId) } : section
      )
    )
    // Calculate the total duration when slide is removed
    newVideoConfig = updateTotalDuration(newVideoConfig)

    set({ videoConfig: newVideoConfig })

    if (selectedSlide?.slide.id === slideId) {
      const sections = getSections(newVideoConfig)
      const section = sections.find(s => s.id === sectionId)
      const fallback = section?.slides?.[0]

      if (fallback) {
        set({ selectedSlide: { section, slide: fallback } })
      } else {
        const next = sections.find(s => s.slides.length > 0)
        set({
          selectedSlide: next ? { section: next, slide: next.slides[0] } : null
        })
      }
    }

    get().refreshPendingChanges()
  },

  /* ================= GENERIC UPDATE ================= */

  updateSlide(updates: Partial<Slide>) {
    const { videoConfig, selectedSlide } = get()
    if (!videoConfig || !selectedSlide) return

    let newVideoConfig = updateVideoConfigSections(videoConfig, sections =>
      sections.map(section =>
        section.id === selectedSlide.section.id
          ? {
            ...section,
            slides: section.slides.map(sl => (sl.id === selectedSlide.slide.id ? { ...sl, ...updates } : sl))
          }
          : section
      )
    )

    newVideoConfig = updateTotalDuration(newVideoConfig)

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        ...updates
      }))
    })

    get().refreshPendingChanges()
  },

  getSlideDurationInSeconds: (slide: Slide) => {
    return slide.durationInFrames / get().getFPS()
  },

  /* ================= TIMELINE ================= */

  getTimelineSlides(): TimelineSlide[] {
    const { videoConfig } = get()
    if (!videoConfig) return []

    const sections = getSections(videoConfig)

    return sections.flatMap(section =>
      section.slides.map(slide => {
        let actualDuration = get().getSlideDurationInSeconds(slide)

        return {
          ...slide,
          slide,
          duration: actualDuration,
          sectionColor: section.color,
          sectionTitle: section.title,
          spotlights: slide.spotlights || [],
          callouts: slide.callouts || [],
          zooms: slide.zooms || [],
        }
      })
    )
  },

  /* ================= CONTENT ================= */

  updateSlideContent(updates: Record<string, unknown>) {
    const { videoConfig, selectedSlide } = get()
    if (!videoConfig || !selectedSlide) return

    const content = selectedSlide.slide.content || {}
    const newContent = { ...content, ...updates }

    const newVideoConfig = updateVideoConfigSections(videoConfig, sections =>
      sections.map(section =>
        section.id === selectedSlide.section.id
          ? {
            ...section,
            slides: section.slides.map(sl => (sl.id === selectedSlide.slide.id ? { ...sl, content: newContent } as Slide : sl))
          }
          : section
      )
    )

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        content: newContent
      } as Slide))
    })

    get().refreshPendingChanges()
  },

  /* ================= TRANSITION ================= */

  updateSlideTransition(sectionId: string, slideId: string, transitionType: TransitionType, direction?: TransitionDirection) {
    const { videoConfig, selectedSlide } = get()
    if (!videoConfig) return

    let newVideoConfig = updateVideoConfigSections(videoConfig, sections =>
      sections.map(section =>
        section.id === sectionId
          ? {
            ...section,
            slides: section.slides.map(sl =>
              sl.id === slideId
                ? (() => {
                  const updatedSlide: any = {
                    ...sl,
                    transition: transitionType,
                    direction: direction,
                    //TRANSITION_DURATION_SECONDS is minimum transition time 
                    transitionDurationInFrames:
                      transitionType === TransitionType.TRANSITION_NONE ? 0 : TRANSITION_DURATION_FRAMES
                  }

                  if (direction !== undefined) {
                    updatedSlide.direction = direction
                  } else {
                    delete updatedSlide.direction
                  }

                  return updatedSlide
                })()
                : sl
            )
          }
          : section
      )
    )

    newVideoConfig = updateTotalDuration(newVideoConfig)

    set({
      videoConfig: newVideoConfig,
      // Keep selectedSlide in sync when transition is edited from storyboard controls.
      selectedSlide:
        selectedSlide?.slide.id === slideId
          ? updateSelectedSlide(selectedSlide, slide => {
            const updatedSlide: any = {
              ...slide,
              transition: transitionType,
              transitionDurationInFrames: transitionType === TransitionType.TRANSITION_NONE ? 0 : TRANSITION_DURATION_FRAMES
            }

            if (direction !== undefined) {
              updatedSlide.direction = direction
            } else {
              delete updatedSlide.direction
            }

            return updatedSlide
          })
          : selectedSlide,
      showTransitionPicker: null
    })

    get().refreshPendingChanges()
  },

  /* ================= DUPLICATE ================= */

  duplicateSlide(sectionId: string, slideId: string) {
    const { videoConfig } = get()
    if (!videoConfig?.config) return

    const sections = getSections(videoConfig)
    const section = sections.find(s => s.id === sectionId)
    if (!section) return

    const sourceSlide = section.slides.find(sl => sl.id === slideId)
    if (!sourceSlide) return

    const duplicatedSlide: Slide = {
      ...structuredClone(sourceSlide),
      id: `${slideId}-duplicate`,
    }

    let newVideoConfig = updateVideoConfigSections(videoConfig, sections =>
      sections.map(s => {
        if (s.id !== sectionId) return s
        const idx = s.slides.findIndex(sl => sl.id === slideId)
        const updated = [...s.slides]
        updated.splice(idx + 1, 0, duplicatedSlide)
        return { ...s, slides: updated }
      })
    )

    newVideoConfig = updateTotalDuration(newVideoConfig)

    set({ videoConfig: newVideoConfig })

    const updatedSection = getSections(newVideoConfig).find(s => s.id === sectionId)
    if (updatedSection) {
      set({ selectedSlide: { section: updatedSection, slide: duplicatedSlide } })
    }

    get().refreshPendingChanges()
  },

  /* ================= REORDER ================= */

  reorderSlidesInSection(sectionId: string, activeId: string, overId: string) {
    const { videoConfig } = get()
    if (!videoConfig) return

    const sections = getSections(videoConfig)

    const newVideoConfig = updateVideoConfigSections(videoConfig, sections =>
      sections.map(section => {
        if (section.id !== sectionId) return section

        const oldIndex = section.slides.findIndex(sl => sl.id === activeId)
        const newIndex = section.slides.findIndex(sl => sl.id === overId)

        return {
          ...section,
          slides: arrayMove(section.slides, oldIndex, newIndex)
        }
      })
    )

    set({ videoConfig: newVideoConfig })

    get().refreshPendingChanges()
  }
})
