import { TimelineSlide } from '@/components/editor/timeline/types'
import {
  createOverlayEntityId,
  createSlideEntityId,
  createStackItemEntityId,
  createStackItemOverlayEntityId
} from '@/types/selection'
import {
  Slide,
  SlideType,
  StackSlideContent,
  TransitionType
} from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { arrayMove } from '@dnd-kit/sortable'
import { slide } from '@remotion/transitions/slide'
import { VideoStoreGet, VideoStoreSet } from './types'
import { createNewSlide, getSlideTypeConfig } from './defaults'

export const createSlideActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
  addSlide(sectionId: string, type: SlideType) {
    const { sections, config } = get()
    if (!config) return

    
    const slideTypeConfig = getSlideTypeConfig(config, type)
    const inheritedBg =
      [...sections.flatMap(s => s.slides)].reverse().find(s => s.backgroundColor)?.backgroundColor ||
      slideTypeConfig?.defaultBackground ||
      config.background.defaultColor

    // Create default content based on slide type
    const newSlide = createNewSlide({
      sectionId,
      type,
      inheritedBg,
      defaultTranscript: slideTypeConfig?.defaultTranscript,
      defaultDuration: slideTypeConfig?.defaultDuration,
    });

    newSlide


    const newSections = sections.map(s => (s.id === sectionId ? { ...s, slides: [...s.slides, newSlide] } : s))

    set({ sections: newSections })
    get().autoSyncVideoConfig()

    const section = newSections.find(s => s.id === sectionId)
    if (section) {
      set({ selectedSlide: { section, slide: newSlide } })
    }

    console.debug('added slide', section, slide)
  },

  createSlideEntityId: (slideId: string) => {
    return createSlideEntityId(slideId)
  },

  createStackItemEntityId: (slideId: string, itemId: string) => createStackItemEntityId(slideId, itemId),
  createOverlayEntityId: (slideId: string, overlayId: string) => createOverlayEntityId(slideId, overlayId),
  createStackItemOverlayEntityId: (slideId: string, itemId: string, overlayId: string) =>
    createStackItemOverlayEntityId(slideId, itemId, overlayId),

  updateSlideBackground: (color: string, applyToAll = false) => {
    const { sections, selectedSlide } = get();
    if (!selectedSlide) return;

    let newSections = sections;

    if (applyToAll) {
      // Apply global background, clear per-slide backgrounds
      newSections = sections.map(section => ({
        ...section,
        slides: section.slides.map(slide => ({
          ...slide,
          backgroundColor: undefined,
        })),
      }));

      set({
        globalBackgroundColor: color,
        sections: newSections,
        selectedSlide: {
          ...selectedSlide,
          slide: {
            ...selectedSlide.slide,
            backgroundColor: undefined,
          },
        },
      });
    } else {
      // Apply only to selected slide, clear global
      newSections = sections.map(section => {
        if (section.id !== selectedSlide.section.id) return section;

        return {
          ...section,
          slides: section.slides.map(slide =>
            slide.id === selectedSlide.slide.id
              ? { ...slide, backgroundColor: color }
              : slide
          ),
        };
      });

      set({
        globalBackgroundColor: undefined,
        sections: newSections,
        selectedSlide: {
          ...selectedSlide,
          slide: {
            ...selectedSlide.slide,
            backgroundColor: color,
          },
        },
      });
    }

    get().autoSyncVideoConfig();
  }
  ,

  updateSlideTranscript: (transcript: string) => {
    const { sections, selectedSlide } = get()
    if (!selectedSlide) return

    const newSections = sections.map(section =>
      section.id === selectedSlide.section.id
        ? {
          ...section,
          slides: section.slides.map(slide =>
            slide.id === selectedSlide.slide.id
              ? {
                ...slide,
                transcript
              }
              : slide
          )
        }
        : section
    )

    set({
      sections: newSections,
      selectedSlide: {
        ...selectedSlide,
        slide: {
          ...selectedSlide.slide,
          transcript
        }
      }
    })
    get().autoSyncVideoConfig()
  },

  removeSlide(sectionId: string, slideId: string) {
    const { sections, selectedSlide } = get()
    const newSections = sections.map(s =>
      s.id === sectionId ? { ...s, slides: s.slides.filter(sl => sl.id !== slideId) } : s
    )

    set({ sections: newSections })
    get().autoSyncVideoConfig()

    if (selectedSlide?.slide.id === slideId) {
      const section = newSections.find(s => s.id === sectionId)
      const fallback = section?.slides?.[0]
      if (fallback) {
        set({ selectedSlide: { section, slide: fallback } })
      } else {
        const next = newSections.find(s => s.slides.length > 0)
        set({ selectedSlide: next ? { section: next, slide: next.slides[0] } : null })
      }
    }

    get().autoSyncVideoConfig();
  },

  updateSlide(updates: Partial<Slide>) {
    const { sections, selectedSlide } = get()
    if (!selectedSlide) return

    const newSections = sections.map(s =>
      s.id === selectedSlide.section.id
        ? {
          ...s,
          slides: s.slides.map(sl => (sl.id === selectedSlide.slide.id ? { ...sl, ...updates } : sl))
        }
        : s
    )

    set({
      sections: newSections,
      selectedSlide: {
        ...selectedSlide,
        slide: { ...selectedSlide.slide, ...updates }
      }
    })
    get().autoSyncVideoConfig()
    console.debug('slide updated', 'updates', updates)
  },

  getTimelineSlides(): TimelineSlide[] {
    const { sections } = get()
    return sections.flatMap(s =>
      s.slides.map(slide => {
        // For stack slides, calculate actual duration from nested items
        let actualDuration = slide.duration
        if (slide.type === SlideType.STACK && slide.content) {
          const stackContent = slide.content.value as StackSlideContent
          if (stackContent.items && Array.isArray(stackContent.items)) {
            actualDuration = stackContent.items.reduce((sum: number, item: any) => sum + (item.duration || 0), 0)
          }
        }

        return {
          ...slide,
          id: slide.id,
          slide: slide,
          duration: actualDuration,
          sectionColor: s.color,
          sectionTitle: s.title,
          spotlights: slide.spotlights || []
        }
      })
    )
  },

  updateSlideContent(updates: Record<string, unknown>) {
    const { sections, selectedSlide } = get()
    if (!selectedSlide) return

    const content = selectedSlide.slide.content || {}
    const newContent = { ...content, ...updates }

    const newSections = sections.map(s =>
      s.id === selectedSlide.section.id
        ? {
          ...s,
          slides: s.slides.map(sl => (sl.id === selectedSlide.slide.id ? { ...sl, content: newContent } : sl))
        }
        : s
    )

    set({
      sections: newSections,
      selectedSlide: {
        ...selectedSlide,
        slide: { ...selectedSlide.slide, content: newContent }
      }
    })
    get().autoSyncVideoConfig()
  },

  updateSlideTransition(sectionId: string, slideId: string, transitionId: TransitionType) {
    const { sections } = get()
    const newSections = sections.map(s =>
      s.id === sectionId
        ? {
          ...s,
          slides: s.slides.map(sl => (sl.id === slideId ? { ...sl, transition: transitionId } : sl))
        }
        : s
    )
    set({ sections: newSections, showTransitionPicker: null })
    get().autoSyncVideoConfig()
  },

  reorderSlidesInSection(sectionId: string, activeId: string, overId: string) {
    const { sections } = get()
    const newSections = sections.map(s => {
      if (s.id !== sectionId) return s
      const oldIndex = s.slides.findIndex(sl => sl.id === activeId)
      const newIndex = s.slides.findIndex(sl => sl.id === overId)
      return { ...s, slides: arrayMove(s.slides, oldIndex, newIndex) }
    })
    set({ sections: newSections })
    get().autoSyncVideoConfig()
  }
})
