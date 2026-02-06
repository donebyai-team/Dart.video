import { parseEntityId } from '@/types/selection'
import {
  EffectType,
  SlideType,
} from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { ActiveToolType } from '@/types/tools'
import { VideoStoreGet, VideoStoreSet } from './types'
import { getDefaultSelectedTool } from './defaults'

export const createEntitySelectionActions = (set: VideoStoreSet, get: VideoStoreGet) => ({
  handleSelectEntity(entityId: string) {
    console.debug('[VideoStore] handleSelectEntity', { entityId })
    const { sections } = get()
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

      set({ selectedSlide: { section: foundSection, slide: foundSlide } })
      if (parsed.type === 'overlay') {
        set({
          selectedEffectId: parsed.overlayId,
          selectedStackItemId: null
        })

        // Identify tooltype if any of above is true 
        // TODO: Check why the overlayId is optional? It shouldn't be
        const toolType = getEffectTypeFromID(parsed.overlayId!, get);

        // Set the toolType if it exist
        if (toolType) {
          set({ activeTool: { type: ActiveToolType.INSERT, tool: toolType } })
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

  openEntitySettings(entityId: string) {
    const { sections } = get()
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
      // TODO: Add more as per slide type
      if (foundSlide.type === SlideType.TEXT_ANIMATION) {
        set({ activeTool: { type: ActiveToolType.TEXT_ANIMATION_TEMPLATE } })
      }
    } else if (parsed.type === 'overlay' || parsed.type === 'stack-item-overlay') {
      const toolType = getEffectTypeFromID(parsed.overlayId!, get);

      if (toolType) {
        set({ activeTool: { type: ActiveToolType.INSERT, tool: toolType } })
      }
    }
  },

  handleSelectEffect(effectId: string | null) {
    const { selectedSlide } = get()
    if (!selectedSlide) return
    set({ selectedEffectId: effectId })

    // TODO: Check why the id is optional? It shouldn't be
    const toolType = getEffectTypeFromID(effectId!, get);
    // Set the toolType if it exist
    if (toolType) {
      set({ activeTool: { type: ActiveToolType.INSERT, tool: toolType } })
    }
  }
})

const getEffectTypeFromID = (
  effectId: string,
  get: VideoStoreGet
): EffectType => {
  const spotlights = get().getSpotlights() ?? [];
  const callouts = get().getCallouts() ?? [];

  const isCallout = callouts.some(e => e.id === effectId);
  if (isCallout) return EffectType.CALLOUT;

  const isSpotlight = spotlights.some(e => e.id === effectId);
  if (isSpotlight) return EffectType.SPOTLIGHT;

  // ideally this should never happen
  return EffectType.UNDEFINED;
};

