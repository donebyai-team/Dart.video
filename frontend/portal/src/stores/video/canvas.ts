import { CalloutEffect, SpotlightEffect } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { VideoStoreGet, VideoStoreSet } from './types'

export const createCanvasActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
  getSpotlights: () => {
    const { selectedSlide } = get()
    if (!selectedSlide) return []

    const slide = selectedSlide.slide
    return slide.spotlights
  },

  addSpotlight(effect: SpotlightEffect) {
    const { sections, selectedSlide } = get()
    if (!selectedSlide?.slide || !selectedSlide?.section) return

    const newSections = sections.map(s =>
      s.id === selectedSlide.section!.id
        ? {
            ...s,
            slides: s.slides.map(sl =>
              sl.id === selectedSlide.slide!.id ? { ...sl, spotlights: [...(sl.spotlights || []), effect] } : sl
            )
          }
        : s
    )

    set({
      sections: newSections,
      selectedSlide: {
        ...selectedSlide,
        slide: {
          ...selectedSlide.slide,
          spotlights: [...(selectedSlide.slide.spotlights || []), effect],
        },
      },
    });
    get().autoSyncSections(newSections);
  },

  updateSpotlight(effectId: string, updates: Partial<SpotlightEffect>) {
    const { sections, selectedSlide } = get()
    if (!selectedSlide?.slide || !selectedSlide?.section) return

    const newSections = sections.map(s =>
      s.id === selectedSlide.section!.id
        ? {
            ...s,
            slides: s.slides.map(sl =>
              sl.id === selectedSlide.slide!.id
                ? {
                    ...sl,
                    spotlights: (sl.spotlights || []).map(e => {
                      return e?.id === effectId ? { ...e, ...updates } : e
                    })
                  }
                : sl
            )
          }
        : s
    )

    set({
      sections: newSections,
      selectedSlide: {
        ...selectedSlide,
        slide: {
          ...selectedSlide.slide,
          spotlights: (selectedSlide.slide.spotlights || []).map((e) => {
            return e?.id === effectId ? { ...e, ...updates } : e;
          }),
        },
      },
    });
    get().autoSyncSections(newSections);
  },

  deleteSpotlight(effectId: string) {
    const { sections, selectedSlide } = get()
    if (!selectedSlide?.slide || !selectedSlide?.section) return

    const newSections = sections.map(s =>
      s.id === selectedSlide.section!.id
        ? {
            ...s,
            slides: s.slides.map(sl =>
              sl.id === selectedSlide.slide!.id
                ? {
                    ...sl,
                    spotlights: (sl.spotlights || []).filter(e => {
                      return e?.id !== effectId
                    })
                  }
                : sl
            )
          }
        : s
    )

    set({
      sections: newSections,
      selectedSlide: {
        ...selectedSlide,
        slide: {
          ...selectedSlide.slide,
          spotlights: (selectedSlide.slide.spotlights || []).filter(e => {
            return e?.id !== effectId
          })
        }
      },
      selectedObjectId: null
    })

    get().autoSyncSections(newSections);
  },

  getCallouts: () => {
    const { selectedSlide } = get()
    if (!selectedSlide) return []

    const slide = selectedSlide.slide
    return slide.callouts
  },

  addCallout(effect: CalloutEffect) {
    const { sections, selectedSlide } = get()
    if (!selectedSlide?.slide || !selectedSlide?.section) return

    const newSections = sections.map(s =>
      s.id === selectedSlide.section!.id
        ? {
            ...s,
            slides: s.slides.map(sl =>
              sl.id === selectedSlide.slide!.id ? { ...sl, callouts: [...(sl.callouts || []), effect] } : sl
            )
          }
        : s
    )

    set({
      sections: newSections,
      selectedSlide: {
        ...selectedSlide,
        slide: {
          ...selectedSlide.slide,
          callouts: [...(selectedSlide.slide.callouts || []), effect]
        }
      }
    })
  },

  updateCallout(effectId: string, updates: Partial<CalloutEffect>) {
    const { sections, selectedSlide } = get()
    if (!selectedSlide?.slide || !selectedSlide?.section) return

    const newSections = sections.map(s =>
      s.id === selectedSlide.section!.id
        ? {
            ...s,
            slides: s.slides.map(sl =>
              sl.id === selectedSlide.slide!.id
                ? {
                    ...sl,
                    callouts: (sl.callouts || []).map(e => {
                      return e?.id === effectId ? { ...e, ...updates } : e
                    })
                  }
                : sl
            )
          }
        : s
    )

    set({
      sections: newSections,
      selectedSlide: {
        ...selectedSlide,
        slide: {
          ...selectedSlide.slide,
          callouts: (selectedSlide.slide.callouts || []).map(e => {
            return e?.id === effectId ? { ...e, ...updates } : e
          })
        }
      }
    })
  },

  deleteCallout(effectId: string) {
    const { sections, selectedSlide } = get()
    if (!selectedSlide?.slide || !selectedSlide?.section) return

    const newSections = sections.map(s =>
      s.id === selectedSlide.section!.id
        ? {
            ...s,
            slides: s.slides.map(sl =>
              sl.id === selectedSlide.slide!.id
                ? {
                    ...sl,
                    callouts: (sl.callouts || []).filter(e => {
                      return e?.id !== effectId
                    })
                  }
                : sl
            )
          }
        : s
    )

    set({
      sections: newSections,
      selectedSlide: {
        ...selectedSlide,
        slide: {
          ...selectedSlide.slide,
          callouts: (selectedSlide.slide.callouts || []).filter(e => {
            return e?.id !== effectId
          })
        }
      },
      selectedObjectId: null
    })

    get().notifyConfigChange(newSections)
  }
})
