import { parseEntityId } from '@/types/selection'
import {
  CanvasObjectType,
  SlideType,
  SpotlightEffect,
  StackSlideContent
} from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { ActiveToolType } from '@/types/tools'
import { VideoStoreGet, VideoStoreSet } from './types'

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
          selectedObjectId: parsed.overlayId,
          selectedStackItemId: null
        })

        // Identify tooltype if any of above is true 
        // TODO: Check why the overlayId is optional? It shouldn't be
        const toolType = getEffectTypeFromID(parsed.overlayId!, get);

        // Set the toolType if it exist
        if (toolType) {
          set({ activeTool: { type: ActiveToolType.INSERT, tool: toolType } })
        }
      } else if (parsed.type === 'stack-item') {
        set({
          selectedObjectId: null,
          selectedStackItemId: parsed.itemId,
          activeTool: { type: ActiveToolType.STACK_SETTINGS }
        })
      } else if (parsed.type === 'stack-item-overlay') {
        // set({
        //     selectedObjectId: parsed.overlayId,
        //     selectedStackItemId: parsed.itemId,
        //     activeTool: { tool: ActiveToolType.INSERT, type: ActiveToolType.INSERT },
        // });
      } else {
        set({
          selectedObjectId: null,
          selectedStackItemId: null,
          activeTool: null
        })
      }
    } catch (err) {
      console.error('Invalid entity', entityId, err)
    }
  },

  openEntitySettings(entityId: string) {
    const { sections, selectedStackItemId } = get()
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
      if (foundSlide.type === SlideType.STACK) {
        set({ activeTool: { type: ActiveToolType.STACK_SETTINGS } })

        const items = (foundSlide.content.value as StackSlideContent)?.items || []
        if (items[0] && !selectedStackItemId) {
          set({ selectedStackItemId: items[0].id })
        }
      } else if (foundSlide.type === SlideType.TEXT_ANIMATION) {
        set({ activeTool: { type: ActiveToolType.TEXT_ANIMATION_TEMPLATE } })
      }
    } else if (parsed.type === 'overlay' || parsed.type === 'stack-item-overlay') {
      const toolType = getEffectTypeFromID(parsed.overlayId!, get);

      if (toolType) {
        set({ activeTool: { type: ActiveToolType.INSERT, tool: toolType } })
      }
    }
  },

  handleSelectObject(id: string | null) {
    const { selectedSlide, selectedStackItemId } = get()
    if (!selectedSlide) return
    set({ selectedObjectId: id })

    if (id) {
      set({ selectedStackItemId: null })

      // TODO: Check why the id is optional? It shouldn't be
      const toolType = getEffectTypeFromID(id!, get);

      // Set the toolType if it exist
      if (toolType) {
        set({ activeTool: { type: ActiveToolType.INSERT, tool: toolType } })
      }
    } else {
      const slide = selectedSlide.slide
      if (slide?.type === SlideType.TEXT_ANIMATION) {
        set({ activeTool: { type: ActiveToolType.TEXT_ANIMATION_TEMPLATE } })
      } else if (slide?.type === SlideType.STACK) {
        set({ activeTool: { type: ActiveToolType.STACK_SETTINGS } })
        const first = (slide.content.value as StackSlideContent)?.items?.[0]
        if (first && !selectedStackItemId) {
          set({ selectedStackItemId: first.id })
        }
      } else {
        set({ activeTool: null })
      }
    }
  }
})

const getEffectTypeFromID = (
  effectId: string,
  get: VideoStoreGet
): CanvasObjectType => {
  const spotlights = get().getSpotlights() ?? [];
  const callouts = get().getCallouts() ?? [];

  const isCallout = callouts.some(e => e.id === effectId);
  if (isCallout) return CanvasObjectType.CANVAS_CALLOUT;

  const isSpotlight = spotlights.some(e => e.id === effectId);
  if (isSpotlight) return CanvasObjectType.CANVAS_SPOTLIGHT;

  // ideally this should never happen
  return CanvasObjectType.CANVAS_UNDEFINED;
};

