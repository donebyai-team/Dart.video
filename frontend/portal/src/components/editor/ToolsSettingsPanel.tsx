import BackgroundSettings from '@/components/editor/settings/BackgroundSettings'
import InsertSettings from '@/components/editor/settings/InsertSettings'
import { useVideoStore } from '@/stores/video'
import { ActiveToolType } from '@/types/tools'
import {
  CalloutEffect,
  EffectType,
  SpotlightEffect,
  ZoomEffect
} from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { motion } from 'framer-motion'
import AnimationEditor from './settings/AnimationEditor'
import { CodeEditor } from './settings/CodeEditor'
import { getRealSlideStartFrame } from './frame_calculations'
import { TRANSITION_DURATION_FRAMES } from '@coasterai/renderer/src/frameUtils'
import type { PatchOverlay } from '@coasterai/renderer'
import ReimagineSettings from './settings/ReimagineSettings'

interface ToolsSettingsPanelProps {
  onPreviewTemplate: () => void
  isPreviewPlaying?: boolean
  onUpdateSpotlight: (updates: Partial<SpotlightEffect>) => void
  onUpdateCallout: (updates: Partial<CalloutEffect>) => void
  onUpdateZoom: (updates: Partial<ZoomEffect>) => void
  onSpotlightApply?: () => void
  onSpotlightPlay?: () => void
  deleteSpotlight: (effectId: string) => void
  deleteCallout: (effectId: string) => void
  deleteZoom: (effectId: string) => void
  overlay: PatchOverlay
  onValuePatch: (id: string, prop: string, value: unknown) => void
  setOverlay: (overlay: PatchOverlay) => void
}

const ToolsSettingsPanel = ({
  onPreviewTemplate,
  isPreviewPlaying = false,
  onUpdateSpotlight,
  onUpdateCallout,
  onUpdateZoom,
  onSpotlightPlay,
  deleteSpotlight,
  deleteCallout,
  deleteZoom,
  overlay,
  onValuePatch,
  setOverlay,
}: ToolsSettingsPanelProps) => {

  // const videoConfigFromStore = useVideoStore(s => s.videoConfig);
  const getSlideWithBackground = useVideoStore(s => s.getSlideWithBackground)
  const activeTool = useVideoStore(s => s.activeTool)
  const selectedSlide = useVideoStore(s => s.selectedSlide)
  const selectedEffectId = useVideoStore(s => s.selectedEffectId)
  const handleCloseTool = useVideoStore(s => s.handleCloseTool)
  const spotlights = useVideoStore(s => s.getSpotlights) || []
  const callouts = useVideoStore(s => s.getCallouts) || []
  const zooms = useVideoStore(s => s.getZooms) || []
  const updateSlideBackground = useVideoStore(s => s.updateSlideBackground)
  const getSlideDurationInSeconds = useVideoStore(s => s.getSlideDurationInSeconds)
  const getTimelineSlides = useVideoStore(s => s.getTimelineSlides)
  const fps = useVideoStore(s => s.videoConfig?.metadata?.fps) || 30
 
  console.log("active tool", activeTool);

  if (activeTool.type == ActiveToolType.NONE) return null;

  const spotlightsList = spotlights() ?? [];
  const calloutsList = callouts() ?? [];
  const zoomsList = zooms() ?? [];

  let selectedObject: SpotlightEffect | CalloutEffect | ZoomEffect | undefined;

  if (activeTool.type === ActiveToolType.INSERT && selectedEffectId) {
    if (activeTool.tool === EffectType.SPOTLIGHT) {
      selectedObject = spotlightsList.find(e => e.id === selectedEffectId);
    } else if (activeTool.tool === EffectType.CALLOUT) {
      selectedObject = calloutsList.find(e => e.id === selectedEffectId);
    } else if (activeTool.tool === EffectType.ZOOM) {
      selectedObject = zoomsList.find(e => e.id === selectedEffectId);
    }
  }



  return (
    <motion.div
      key='settings'
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className='h-full'
      data-animation-settings-panel="true"
    >
      {activeTool.type === ActiveToolType.BACKGROUND && (
        <BackgroundSettings
          value={getSlideWithBackground(selectedSlide!)}
          onChange={updateSlideBackground}
          onClose={handleCloseTool}
        />
      )}

      {activeTool.type === ActiveToolType.ADD_OR_EDIT_ANIMATION && (
        <AnimationEditor
          settings={activeTool.settings ?? {}}
          overlay={overlay}
          onValuePatch={onValuePatch}
          setOverlay={setOverlay}
          onClose={handleCloseTool}
          onPlay={onPreviewTemplate}
          isPreviewPlaying={isPreviewPlaying}
        />
      )}

      {activeTool.type === ActiveToolType.ANIMATION_CODE && (
        <CodeEditor onClose={handleCloseTool} />
      )}

       {activeTool.type === ActiveToolType.REIMAGINE && (
         <ReimagineSettings onClose={handleCloseTool} setOverlay={setOverlay} />
      )}

      {activeTool.type === ActiveToolType.INSERT
        && selectedEffectId
        && selectedObject
        && activeTool.tool && (
          <InsertSettings
            tool={activeTool.tool}
            currentObject={selectedObject}
            onUpdate={updates => {
              if (!selectedEffectId || activeTool.type !== ActiveToolType.INSERT) return;

              if (activeTool.tool === EffectType.SPOTLIGHT) {
                onUpdateSpotlight(updates as Partial<SpotlightEffect>);
              } else if (activeTool.tool === EffectType.CALLOUT) {
                onUpdateCallout(updates as Partial<CalloutEffect>);
              } else if (activeTool.tool === EffectType.ZOOM) {
                onUpdateZoom(updates as Partial<ZoomEffect>);
              }
            }}
            onDelete={() => {
              if (!selectedEffectId || activeTool.type !== ActiveToolType.INSERT) return;

              if (activeTool.tool === EffectType.SPOTLIGHT) {
                deleteSpotlight(selectedEffectId);
              } else if (activeTool.tool === EffectType.CALLOUT) {
                deleteCallout(selectedEffectId);
              } else if (activeTool.tool === EffectType.ZOOM) {
                deleteZoom(selectedEffectId);
              }
              handleCloseTool();
            }}
            onClose={handleCloseTool}
            canDelete={true}
            slideDurationInSecond={getSlideDurationInSeconds(selectedSlide!)}
            slideDurationInFrames={selectedSlide?.durationInFrames}
            slideStartFrame={getRealSlideStartFrame(getTimelineSlides(), selectedSlide?.id ?? '', fps)}
            slideStartTime={0}
            transitionDurationInFrames={TRANSITION_DURATION_FRAMES}
            fps={fps}
            onPlay={onSpotlightPlay}
            isPreviewPlaying={isPreviewPlaying}
          />
        )}
    </motion.div>
  )
}

export default ToolsSettingsPanel
