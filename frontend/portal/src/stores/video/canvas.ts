import { CalloutEffect, SpotlightEffect, ZoomEffect } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { VideoStoreGet, VideoStoreSet } from './types'

import { updateSelectedSlide, updateSlideById } from './utils'

export const createCanvasActions = (set: VideoStoreSet, get: VideoStoreGet) => ({

  /* ================= SPOTLIGHT ================= */

  getSpotlights: () => {
    const { selectedSlide } = get()
    return selectedSlide?.spotlights || []
  },

  addSpotlight(effect: SpotlightEffect) {
    const { videoConfig, selectedSlide } = get()
    if (!selectedSlide || !videoConfig) return

    const newVideoConfig = updateSlideById(videoConfig, selectedSlide.id, slide => ({
      ...slide,
      spotlights: [...(slide.spotlights || []), effect]
    }))

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        spotlights: [...(slide.spotlights || []), effect],
      })),
    })

    get().refreshPendingChanges()
  },

  updateSpotlight(effectId: string, updates: Partial<SpotlightEffect>) {
    const { videoConfig, selectedSlide } = get()
    if (!selectedSlide || !videoConfig) return

    const newVideoConfig = updateSlideById(videoConfig, selectedSlide.id, slide => ({
      ...slide,
      spotlights: (slide.spotlights || []).map(e =>
        e?.id === effectId ? { ...e, ...updates } : e
      ),
    }))

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        spotlights: (slide.spotlights || []).map(e =>
          e?.id === effectId ? { ...e, ...updates } : e
        ),
      })),
    })

    get().refreshPendingChanges()
  },

  deleteSpotlight(effectId: string) {
    const { videoConfig, selectedSlide } = get()
    if (!selectedSlide || !videoConfig) return

    const newVideoConfig = updateSlideById(videoConfig, selectedSlide.id, slide => ({
      ...slide,
      spotlights: (slide.spotlights || []).filter(e => e?.id !== effectId),
    }))

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        spotlights: (slide.spotlights || []).filter(e => e?.id !== effectId),
      })),
      selectedEffectId: null,
    })

    get().refreshPendingChanges()
  },

  /* ================= CALLOUT ================= */

  getCallouts: () => {
    const { selectedSlide } = get()
    return selectedSlide?.callouts || []
  },

  addCallout(effect: CalloutEffect) {
    const { videoConfig, selectedSlide } = get()
    if (!selectedSlide || !videoConfig) return

    const newVideoConfig = updateSlideById(videoConfig, selectedSlide.id, slide => ({
      ...slide,
      callouts: [...(slide.callouts || []), effect]
    }))

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        callouts: [...(slide.callouts || []), effect],
      })),
    })

    get().refreshPendingChanges()
  },

  updateCallout(effectId: string, updates: Partial<CalloutEffect>) {
    const { videoConfig, selectedSlide } = get()
    if (!selectedSlide || !videoConfig) return

    const newVideoConfig = updateSlideById(videoConfig, selectedSlide.id, slide => ({
      ...slide,
      callouts: (slide.callouts || []).map(e =>
        e?.id === effectId ? { ...e, ...updates } : e
      ),
    }))

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        callouts: (slide.callouts || []).map(e =>
          e?.id === effectId ? { ...e, ...updates } : e
        ),
      })),
    })

    get().refreshPendingChanges()
  },

  deleteCallout(effectId: string) {
    const { videoConfig, selectedSlide } = get()
    if (!selectedSlide || !videoConfig) return

    const newVideoConfig = updateSlideById(videoConfig, selectedSlide.id, slide => ({
      ...slide,
      callouts: (slide.callouts || []).filter(e => e?.id !== effectId),
    }))

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        callouts: (slide.callouts || []).filter(e => e?.id !== effectId),
      })),
      selectedEffectId: null,
    })

    get().refreshPendingChanges()
  },

  /* ================= ZOOM ================= */

  getZooms: () => {
    const { selectedSlide } = get()
    return selectedSlide?.zooms || []
  },

  addZoom(effect: ZoomEffect) {
    const { videoConfig, selectedSlide } = get()
    if (!selectedSlide || !videoConfig) return

    const newVideoConfig = updateSlideById(videoConfig, selectedSlide.id, slide => ({
      ...slide,
      zooms: [...(slide.zooms || []), effect]
    }))

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        zooms: [...(slide.zooms || []), effect],
      })),
    })

    get().refreshPendingChanges()
  },

  updateZoom(effectId: string, updates: Partial<ZoomEffect>) {
    const { videoConfig, selectedSlide } = get()
    if (!selectedSlide || !videoConfig) return

    const newVideoConfig = updateSlideById(videoConfig, selectedSlide.id, slide => ({
      ...slide,
      zooms: (slide.zooms || []).map(e =>
        e?.id === effectId ? { ...e, ...updates } : e
      ),
    }))

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        zooms: (slide.zooms || []).map(e =>
          e?.id === effectId ? { ...e, ...updates } : e
        ),
      })),
    })

    get().refreshPendingChanges()
  },

  deleteZoom(effectId: string) {
    const { videoConfig, selectedSlide } = get()
    if (!selectedSlide || !videoConfig) return

    const newVideoConfig = updateSlideById(videoConfig, selectedSlide.id, slide => ({
      ...slide,
      zooms: (slide.zooms || []).filter(e => e?.id !== effectId),
    }))

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        zooms: (slide.zooms || []).filter(e => e?.id !== effectId),
      })),
      selectedEffectId: null,
    })

    get().refreshPendingChanges()
  },

})
