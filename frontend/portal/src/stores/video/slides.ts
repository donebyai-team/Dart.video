import { TimelineSlide } from '@/components/editor/timeline/types'
import { Slide, TransitionDirection, TransitionType, BackgroundStyle, Section, BackgroundStyleSchema } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { clone, create } from '@bufbuild/protobuf'
import { createNewSlide, getDefaulVideotMetadata, createDefaultBackgroundStyle, resolveBackgroundStyle } from './defaults'
import { VideoStoreSet, VideoStoreGet } from './types'
import { findSlideById, getSections, updateVideoConfigSections, updateSelectedSlide, updateTotalDuration, getPreviousSlide, updateSlideById } from './utils'
import defaultEditorConfig from '@/data/editorConfig'
import { TRANSITION_DURATION_FRAMES } from '@coasterai/renderer/src/frameUtils'

const SECTION_END_DROP_PREFIX = 'section-end:'

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

    set({ selectedSlide: newSlide });

    console.debug("added slide", newSlide.id, "after", afterSlideId);

    get().refreshPendingChanges();
    return newSlide.id;
  },

  /* ================= BACKGROUND ================= */

  updateSlideBackground: (background: BackgroundStyle) => {
    const { videoConfig, selectedSlide } = get();
    if (!videoConfig?.config || !selectedSlide) return;

    let newVideoConfig = videoConfig;

    if (background.applyAll) {
      // Remove slide overrides and set global background
      newVideoConfig = updateVideoConfigSections(videoConfig, (sections) =>
        sections.map((section) => ({
          ...section,
          slides: section.slides.map(({ backgroundStyle, ...rest }) => rest),
        }))
      );

      newVideoConfig = {
        ...newVideoConfig,
        metadata: {
          ...(videoConfig.metadata ?? getDefaulVideotMetadata(defaultEditorConfig)),
          backgroundStyle: background,
        },
      };

      set({
        videoConfig: newVideoConfig,
        selectedSlide: updateSelectedSlide(selectedSlide, ({ backgroundStyle, ...rest }) => rest),
      });
    } else {
      const globalBackground = videoConfig.metadata?.backgroundStyle;
      const { backgroundStyle: _, ...metadataWithoutBg } = 
        videoConfig.metadata ?? getDefaulVideotMetadata(defaultEditorConfig);

      // Convert inherited global backgrounds into slide-level backgrounds without
      // overwriting slides that already have their own background override.
      newVideoConfig = updateVideoConfigSections(videoConfig, (sections) =>
        sections.map((section) => ({
          ...section,
          slides: section.slides.map((slide) => {
            const isSelected = slide.id === selectedSlide.id;
            
            if (isSelected) {
              const clonedBg = clone(BackgroundStyleSchema, background);
              clonedBg.applyAll = false;
              return { ...slide, backgroundStyle: clonedBg };
            }

            if (globalBackground) {
              if (slide.backgroundStyle) {
                return slide;
              }

              const clonedGlobalBg = clone(BackgroundStyleSchema, globalBackground);
              clonedGlobalBg.applyAll = false;
              return { ...slide, backgroundStyle: clonedGlobalBg };
            }

            return slide;
          }),
        }))
      );

      set({
        videoConfig: { ...newVideoConfig, metadata: metadataWithoutBg },
        selectedSlide: updateSelectedSlide(selectedSlide, (slide) => {
          const clonedBg = clone(BackgroundStyleSchema, background);
          clonedBg.applyAll = false;
          return { ...slide, backgroundStyle: clonedBg };
        }),
      });
    }

    get().refreshPendingChanges();
  },

  /* ================= TRANSCRIPT ================= */

  updateSlideTranscript(transcript: string) {
    const { videoConfig, selectedSlide } = get()
    if (!videoConfig || !selectedSlide) return

    const newVideoConfig = updateSlideById(videoConfig, selectedSlide.id, slide => ({
      ...slide,
      transcript
    }))

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

    if (selectedSlide?.id === slideId) {
      const sections = getSections(newVideoConfig)
      const section = sections.find(s => s.id === sectionId)
      const fallback = section?.slides?.[0]

      if (fallback) {
        set({ selectedSlide: fallback })
      } else {
        const next = sections.find(s => s.slides.length > 0)
        set({
          selectedSlide: next ? next.slides[0] : null
        })
      }
    }

    get().refreshPendingChanges()
  },

  /* ================= GENERIC UPDATE ================= */

  updateSlide(updates: Partial<Slide>) {
    const { videoConfig, selectedSlide } = get()
    if (!videoConfig || !selectedSlide) return

    let newVideoConfig = updateSlideById(videoConfig, selectedSlide.id, slide => ({
      ...slide,
      ...updates
    }))

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

  updateSlideById(slideId: string, updates: Partial<Slide>) {
    const { videoConfig, selectedSlide } = get()
    if (!videoConfig) return

    let newVideoConfig = updateSlideById(videoConfig, slideId, slide => ({
      ...slide,
      ...updates
    }))

    newVideoConfig = updateTotalDuration(newVideoConfig)

    set({
      videoConfig: newVideoConfig,
      selectedSlide:
        selectedSlide?.id === slideId
          ? updateSelectedSlide(selectedSlide, slide => ({
            ...slide,
            ...updates
          }))
          : selectedSlide
    })

    get().refreshPendingChanges()
  },

  setSelectedSlideById(slideId: string) {
    const { videoConfig } = get()
    if (!videoConfig) return

    const nextSelectedSlide = findSlideById(videoConfig, slideId)
    if (!nextSelectedSlide) return

    // Keep selection anchored to the intended slide while helper flows add/remove siblings.
    set({ selectedSlide: nextSelectedSlide })
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

    const content = selectedSlide.content || {}
    const newContent = { ...content, ...updates }

    const newVideoConfig = updateSlideById(videoConfig, selectedSlide.id, slide => ({
      ...slide,
      content: newContent
    } as Slide))

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
        selectedSlide?.id === slideId
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
      set({ selectedSlide: duplicatedSlide })
    }

    get().refreshPendingChanges()
  },

  /* ================= REORDER ================= */

  // Storyboard sections expose synthetic bottom drop zones like `section-end:<id>`
  // so a dragged slide can land in an empty section or append after the last slide.
  // If `overId` is a real slide id, we insert before that slide; otherwise we append.
  reorderSlidesInSection(activeId: string, overId: string) {
    const { videoConfig, selectedSlide } = get()
    if (!videoConfig) return

    const sections = getSections(videoConfig).map(section => ({
      ...section,
      slides: [...section.slides]
    }))

    const sourceSectionIndex = sections.findIndex(section =>
      section.slides.some(slide => slide.id === activeId)
    )
    if (sourceSectionIndex === -1) return

    const sourceSlideIndex = sections[sourceSectionIndex].slides.findIndex(
      slide => slide.id === activeId
    )
    if (sourceSlideIndex === -1) return

    const [movedSlide] = sections[sourceSectionIndex].slides.splice(sourceSlideIndex, 1)
    if (!movedSlide) return

    if (overId.startsWith(SECTION_END_DROP_PREFIX)) {
      const targetSectionId = overId.slice(SECTION_END_DROP_PREFIX.length)
      const targetSectionIndex = sections.findIndex(section => section.id === targetSectionId)
      if (targetSectionIndex === -1) return

      sections[targetSectionIndex].slides.push(movedSlide)
    } else {
      const targetSectionIndex = sections.findIndex(section =>
        section.slides.some(slide => slide.id === overId)
      )
      if (targetSectionIndex === -1) return

      const targetSlideIndex = sections[targetSectionIndex].slides.findIndex(
        slide => slide.id === overId
      )
      if (targetSlideIndex === -1) return

      sections[targetSectionIndex].slides.splice(targetSlideIndex, 0, movedSlide)
    }

    const newVideoConfig = updateVideoConfigSections(videoConfig, () => sections)

    set({
      videoConfig: newVideoConfig,
      selectedSlide: selectedSlide ? findSlideById(newVideoConfig, selectedSlide.id) : null
    })

    get().refreshPendingChanges()
  }
})
