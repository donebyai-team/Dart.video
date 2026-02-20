import { parseEntityId } from '@/types/selection'
import {
  EffectType,
  SlideType,
} from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { ActiveToolType } from '@/types/tools'
import { VideoStoreGet, VideoStoreSet } from './types'
import { getDefaultSelectedTool } from './defaults'
import { getSections } from './utils'

export const createEntitySelectionActions = (set: VideoStoreSet, get: VideoStoreGet) => ({

  /* ================= SELECT ENTITY ================= */

  handleSelectEntity(entityId: string) {
    console.debug('[VideoStore] handleSelectEntity', { entityId })

    const { videoConfig } = get()
    if (!videoConfig) return

    const sections = getSections(videoConfig)

    set({ selectedEntityId: entityId })

    try {
      const parsed = parseEntityId(entityId)
      const slideId = parsed.slideId

      let foundSlide = null
      let foundSection = null

      for (const section of sections) {
        const slide = section.slides.find(sl => sl.id === slideId)
        if (slide) {
          foundSlide = slide
          foundSection = section
          break
        }
      }

      if (!foundSlide || !foundSection) return

      set({
        selectedSlide: {
          section: foundSection,
          slide: foundSlide
        }
      })

      if (parsed.type === 'overlay') {
        set({
          selectedEffectId: parsed.overlayId,
          selectedStackItemId: null
        })

        const toolType = getEffectTypeFromID(parsed.overlayId!, get)

        if (toolType) {
          set({
            activeTool: {
              type: ActiveToolType.INSERT,
              tool: toolType
            }
          })
        }

      } else {

        set({
          selectedEffectId: null,
          selectedStackItemId: null,
          activeTool: getDefaultSelectedTool()
        })

      }

    } catch (err) {
      console.error('Invalid entity', entityId, err)
    }
  },

  /* ================= OPEN SETTINGS ================= */

  openEntitySettings(entityId: string) {

    const { videoConfig } = get()
    if (!videoConfig) return

    const sections = getSections(videoConfig)
    const parsed = parseEntityId(entityId)

    let foundSlide = null

    for (const section of sections) {
      const slide = section.slides.find(s => s.id === parsed.slideId)
      if (slide) {
        foundSlide = slide
        break
      }
    }

    if (!foundSlide) return

    console.log('Open settings for slide:', parsed, foundSlide)

    if (parsed.type === 'slide') {

      if (foundSlide.type === SlideType.TEXT_ANIMATION) {
        set({
          activeTool: {
            type: ActiveToolType.TEXT_ANIMATION_TEMPLATE
          }
        })
      }

    } else if (
      parsed.type === 'overlay' ||
      parsed.type === 'stack-item-overlay'
    ) {

      const toolType = getEffectTypeFromID(parsed.overlayId!, get)

      if (toolType) {
        set({
          activeTool: {
            type: ActiveToolType.INSERT,
            tool: toolType
          }
        })
      }

    }
  },

  /* ================= SELECT EFFECT ================= */

  handleSelectEffect(effectId: string | null) {

    const { selectedSlide } = get()
    if (!selectedSlide) return

    set({ selectedEffectId: effectId })

    if (!effectId) return

    const toolType = getEffectTypeFromID(effectId, get)

    if (toolType) {
      set({
        activeTool: {
          type: ActiveToolType.INSERT,
          tool: toolType
        }
      })
    }

  }

})

/* ================= EFFECT RESOLUTION ================= */

const getEffectTypeFromID = (
  effectId: string,
  get: VideoStoreGet
): EffectType | null => {

  const spotlights = get().getSpotlights?.() ?? []
  const callouts = get().getCallouts?.() ?? []
  const zooms = get().getZooms?.() ?? []

  if (spotlights.some(e => e.id === effectId)) {
    return EffectType.SPOTLIGHT
  }

  if (callouts.some(e => e.id === effectId)) {
    return EffectType.CALLOUT
  }

  if (zooms.some(e => e.id === effectId)) {
    return EffectType.ZOOM
  }

  return null
}
