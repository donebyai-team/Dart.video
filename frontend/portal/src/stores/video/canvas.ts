import { CalloutEffect, SpotlightEffect } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { SelectedSection, VideoStoreGet, VideoStoreSet } from './types'
import { Video } from '@coasterai/pb/coasterai/core/v1/video_pb'
import { updateVideoConfigSections, updateSelectedSlide } from './utils'

export const createCanvasActions = (set: VideoStoreSet, get: VideoStoreGet) => ({

  /* ================= SPOTLIGHT ================= */

  getSpotlights: () => {
    const { selectedSlide } = get()
    return selectedSlide?.slide?.spotlights || []
  },

  addSpotlight(effect: SpotlightEffect) {
    const { videoConfig, selectedSlide } = get()
    if (!selectedSlide?.slide || !selectedSlide?.section || !videoConfig) return

    const newVideoConfig = updateVideoConfigSections(videoConfig, sections =>
      sections.map(section =>
        section.id === selectedSlide.section.id
          ? {
              ...section,
              slides: section.slides.map(slide =>
                slide.id === selectedSlide.slide.id
                  ? { ...slide, spotlights: [...(slide.spotlights || []), effect] }
                  : slide
              ),
            }
          : section
      )
    )

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        spotlights: [...(slide.spotlights || []), effect],
      })),
    })

    get().autoSyncVideoConfig()
  },

  updateSpotlight(effectId: string, updates: Partial<SpotlightEffect>) {
    const { videoConfig, selectedSlide } = get()
    if (!selectedSlide?.slide || !selectedSlide?.section || !videoConfig) return

    const newVideoConfig = updateVideoConfigSections(videoConfig, sections =>
      sections.map(section =>
        section.id === selectedSlide.section.id
          ? {
              ...section,
              slides: section.slides.map(slide =>
                slide.id === selectedSlide.slide.id
                  ? {
                      ...slide,
                      spotlights: (slide.spotlights || []).map(e =>
                        e?.id === effectId ? { ...e, ...updates } : e
                      ),
                    }
                  : slide
              ),
            }
          : section
      )
    )

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        spotlights: (slide.spotlights || []).map(e =>
          e?.id === effectId ? { ...e, ...updates } : e
        ),
      })),
    })

    get().autoSyncVideoConfig()
  },

  deleteSpotlight(effectId: string) {
    const { videoConfig, selectedSlide } = get()
    if (!selectedSlide?.slide || !selectedSlide?.section || !videoConfig) return

    const newVideoConfig = updateVideoConfigSections(videoConfig, sections =>
      sections.map(section =>
        section.id === selectedSlide.section.id
          ? {
              ...section,
              slides: section.slides.map(slide =>
                slide.id === selectedSlide.slide.id
                  ? {
                      ...slide,
                      spotlights: (slide.spotlights || []).filter(e => e?.id !== effectId),
                    }
                  : slide
              ),
            }
          : section
      )
    )

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        spotlights: (slide.spotlights || []).filter(e => e?.id !== effectId),
      })),
      selectedEffectId: null,
    })

    get().autoSyncVideoConfig()
  },

  /* ================= CALLOUT ================= */

  getCallouts: () => {
    const { selectedSlide } = get()
    return selectedSlide?.slide?.callouts || []
  },

  addCallout(effect: CalloutEffect) {
    const { videoConfig, selectedSlide } = get()
    if (!selectedSlide?.slide || !selectedSlide?.section || !videoConfig) return

    const newVideoConfig = updateVideoConfigSections(videoConfig, sections =>
      sections.map(section =>
        section.id === selectedSlide.section.id
          ? {
              ...section,
              slides: section.slides.map(slide =>
                slide.id === selectedSlide.slide.id
                  ? { ...slide, callouts: [...(slide.callouts || []), effect] }
                  : slide
              ),
            }
          : section
      )
    )

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        callouts: [...(slide.callouts || []), effect],
      })),
    })

    get().autoSyncVideoConfig()
  },

  updateCallout(effectId: string, updates: Partial<CalloutEffect>) {
    const { videoConfig, selectedSlide } = get()
    if (!selectedSlide?.slide || !selectedSlide?.section || !videoConfig) return

    const newVideoConfig = updateVideoConfigSections(videoConfig, sections =>
      sections.map(section =>
        section.id === selectedSlide.section.id
          ? {
              ...section,
              slides: section.slides.map(slide =>
                slide.id === selectedSlide.slide.id
                  ? {
                      ...slide,
                      callouts: (slide.callouts || []).map(e =>
                        e?.id === effectId ? { ...e, ...updates } : e
                      ),
                    }
                  : slide
              ),
            }
          : section
      )
    )

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        callouts: (slide.callouts || []).map(e =>
          e?.id === effectId ? { ...e, ...updates } : e
        ),
      })),
    })

    get().autoSyncVideoConfig()
  },

  deleteCallout(effectId: string) {
    const { videoConfig, selectedSlide } = get()
    if (!selectedSlide?.slide || !selectedSlide?.section || !videoConfig) return

    const newVideoConfig = updateVideoConfigSections(videoConfig, sections =>
      sections.map(section =>
        section.id === selectedSlide.section.id
          ? {
              ...section,
              slides: section.slides.map(slide =>
                slide.id === selectedSlide.slide.id
                  ? {
                      ...slide,
                      callouts: (slide.callouts || []).filter(e => e?.id !== effectId),
                    }
                  : slide
              ),
            }
          : section
      )
    )

    set({
      videoConfig: newVideoConfig,
      selectedSlide: updateSelectedSlide(selectedSlide, slide => ({
        ...slide,
        callouts: (slide.callouts || []).filter(e => e?.id !== effectId),
      })),
      selectedEffectId: null,
    })

    get().autoSyncVideoConfig()
  },

})

