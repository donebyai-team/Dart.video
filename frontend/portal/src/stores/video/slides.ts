import { TimelineSlide } from '@/components/editor/timeline/types'
import { SlideType, Slide, TransitionDirection, TransitionType, BackgroundStyle } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { arrayMove } from '@dnd-kit/sortable'
import { createNewSlide, getDefaulVideotMetadata, createDefaultBackgroundStyle } from './defaults'
import { VideoStoreSet, VideoStoreGet } from './types'
import { getSections, updateVideoConfigSections, updateSelectedSlide, updateTotalDuration } from './utils'
import defaultEditorConfig from '@/data/editorConfig'
import { TRANSITION_DURATION_SECONDS } from '@coasterai/renderer/src/frameUtils'

export const createSlideActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
  /* ================= ADD ================= */


  // if global is available then use global or default to slide
  getSlideWithBackground(slide: Slide): BackgroundStyle {
    const { videoConfig } = get()
    if (!videoConfig?.config) return createDefaultBackgroundStyle();
    const globalBackground = videoConfig.metadata?.backgroundStyle;


    return globalBackground ? globalBackground : slide.backgroundStyle!;
  },

  addSlide(sectionId: string, type: SlideType) {
    const { videoConfig } = get()
    if (!videoConfig?.config) return

    const sections = getSections(videoConfig)

    const inheritedBg =
      [...sections.flatMap((s) => s.slides)]
        .reverse()
        .find((s) => s.backgroundStyle)?.backgroundStyle
      ??
      createDefaultBackgroundStyle();


    const newSlide = createNewSlide({
      sectionId,
      type,
      inheritedBg,
    })

    let newVideoConfig = updateVideoConfigSections(videoConfig, sections =>
      sections.map(s => (s.id === sectionId ? { ...s, slides: [...s.slides, newSlide] } : s))
    )
    // Calculate the total duration when slide is added
    newVideoConfig = updateTotalDuration(newVideoConfig)

    set({ videoConfig: newVideoConfig })

    const section = getSections(newVideoConfig).find(s => s.id === sectionId)
    if (section) {
      set({ selectedSlide: { section, slide: newSlide } })
    }

    get().autoSyncVideoConfig()
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

    get().autoSyncVideoConfig();
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

    get().autoSyncVideoConfig()
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

    get().autoSyncVideoConfig()
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

    get().autoSyncVideoConfig()
  },

  /* ================= TIMELINE ================= */

  getTimelineSlides(): TimelineSlide[] {
    const { videoConfig } = get()
    if (!videoConfig) return []

    const sections = getSections(videoConfig)

    return sections.flatMap(section =>
      section.slides.map(slide => {
        let actualDuration = slide.duration

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
            slides: section.slides.map(sl => (sl.id === selectedSlide.slide.id ? { ...sl, content: newContent } : sl))
          }
          : section
      )
    )

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        content: newContent
      }))
    })

    get().autoSyncVideoConfig()
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
                    transitionDuration:
                      transitionType === TransitionType.TRANSITION_NONE ? 0 : TRANSITION_DURATION_SECONDS
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
              transitionDuration: transitionType === TransitionType.TRANSITION_NONE ? 0 : TRANSITION_DURATION_SECONDS
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

    get().autoSyncVideoConfig()
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

    get().autoSyncVideoConfig()
  }
})
