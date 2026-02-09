import { TimelineSlide } from '@/components/editor/timeline/types'
import { SlideType, Slide, StackSlideContent, TransitionType } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { arrayMove } from '@dnd-kit/sortable'
import { getSlideTypeConfig, createNewSlide, getDefaulVideotMetadata } from './defaults'
import { VideoStoreSet, VideoStoreGet } from './types'
import { getSections, updateVideoConfigSections, updateSelectedSlide, updateTotalDuration } from './utils'
import defaultEditorConfig from '@/data/editorConfig'

export const createSlideActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
  /* ================= ADD ================= */

  addSlide(sectionId: string, type: SlideType) {
    const { videoConfig } = get()
    if (!videoConfig?.config) return

    const sections = getSections(videoConfig)

    const slideTypeConfig = getSlideTypeConfig(defaultEditorConfig, type)

    const inheritedBg =
      [...sections.flatMap(s => s.slides)].reverse().find(s => s.backgroundColor)?.backgroundColor ||
      slideTypeConfig?.defaultBackground ||
      defaultEditorConfig.background.defaultColor

    const newSlide = createNewSlide({
      sectionId,
      type,
      inheritedBg,
      defaultTranscript: slideTypeConfig?.defaultTranscript,
      defaultDuration: slideTypeConfig?.defaultDuration
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

  updateSlideBackground(color: string, applyToAll = false) {
    const { videoConfig, selectedSlide } = get()

    if (!videoConfig || !videoConfig.config || !selectedSlide) return

    let newVideoConfig: typeof videoConfig

    if (applyToAll) {
      // Clear slide overrides
      // remove backgroundColor from the slide
      // TODO: We should not remove it as if user can click applyToAll ans then
      // again disable, in this case the previous color should be back or slide
      // will show white color
      newVideoConfig = updateVideoConfigSections(videoConfig, sections =>
        sections.map(section => ({
          ...section,
          slides: section.slides.map(slide => {
            const { backgroundColor, ...rest } = slide
            return rest
          })
        }))
      )

      // Set global background
      newVideoConfig = {
        ...videoConfig,
        metadata: {
          ...(videoConfig.metadata ?? getDefaulVideotMetadata(defaultEditorConfig)),
          backgroundColor: color
        }
      }

      set({
        videoConfig: newVideoConfig,
        selectedSlide: updateSelectedSlide(selectedSlide, slide => {
          const { backgroundColor, ...rest } = slide
          return rest
        })
      })
    } else {
      // Apply only to selected slide
      newVideoConfig = updateVideoConfigSections(videoConfig, sections =>
        sections.map(section =>
          section.id !== selectedSlide.section.id
            ? section
            : {
                ...section,
                slides: section.slides.map(slide =>
                  slide.id === selectedSlide.slide.id ? { ...slide, backgroundColor: color } : slide
                )
              }
        )
      )

      // Remove global background (PROTO SAFE = REMOVE FIELD)
      const metadata = newVideoConfig.metadata ?? getDefaulVideotMetadata(defaultEditorConfig)

      const { backgroundColor, ...metadataWithoutBg } = metadata

      newVideoConfig = {
        ...newVideoConfig,
        metadata: metadataWithoutBg
      }

      set({
        videoConfig: newVideoConfig,
        selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
          ...slide,
          backgroundColor: color
        }))
      })
    }

    get().autoSyncVideoConfig()
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

        if (slide.type === SlideType.STACK && slide.content) {
          const stackContent = slide.content.value as StackSlideContent
          if (stackContent.items) {
            actualDuration = stackContent.items.reduce((sum: number, item: any) => sum + (item.duration || 0), 0)
          }
        }

        return {
          ...slide,
          slide,
          duration: actualDuration,
          sectionColor: section.color,
          sectionTitle: section.title,
          spotlights: slide.spotlights || []
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

  updateSlideTransition(sectionId: string, slideId: string, transitionId: TransitionType) {
    const { videoConfig } = get()
    if (!videoConfig) return

    let newVideoConfig = updateVideoConfigSections(videoConfig, sections =>
      sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              slides: section.slides.map(sl =>
                sl.id === slideId
                  ? {
                      ...sl,
                      transition: transitionId,
                      //0.3 is minimum transition time except TRANSITION_NONE
                      transitionDuration: transitionId === TransitionType.TRANSITION_NONE ? 0 : 0.3
                    }
                  : sl
              )
            }
          : section
      )
    )

    newVideoConfig = updateTotalDuration(newVideoConfig)

    set({
      videoConfig: newVideoConfig,
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
