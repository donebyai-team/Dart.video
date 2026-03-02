import TextAnimationSelector from '@/components/editor/remotion/animations/suggester/TextAnimationSelector'
import BackgroundSettings from '@/components/editor/settings/BackgroundSettings'
import InsertSettings from '@/components/editor/settings/InsertSettings'
import TextAnimationTemplateSettings from '@/components/editor/settings/TextAnimationTemplateSettings'
import { useVideoStore } from '@/stores/video'
import { ActiveToolType } from '@/types/tools'
import {
  AnimationSlideContent,
  CalloutEffect,
  EffectType,
  SlideType,
  SpotlightEffect,
  ZoomEffect
} from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { motion } from 'framer-motion'

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
  deleteZoom
}: ToolsSettingsPanelProps) => {

  const videoConfigFromStore = useVideoStore(s => s.videoConfig);
  const getSlideWithBackground = useVideoStore(s => s.getSlideWithBackground)
  const activeTool = useVideoStore(s => s.activeTool)
  const selectedSlide = useVideoStore(s => s.selectedSlide)
  const selectedEffectId = useVideoStore(s => s.selectedEffectId)
  const handleCloseTool = useVideoStore(s => s.handleCloseTool)
  const getTextAnimationConfig = useVideoStore(s => s.getTextAnimationConfig)
  const spotlights = useVideoStore(s => s.getSpotlights) || []
  const callouts = useVideoStore(s => s.getCallouts) || []
  const zooms = useVideoStore(s => s.getZooms) || []
  const updateSlideBackground = useVideoStore(s => s.updateSlideBackground)
  const onUpdateTemplateProps = useVideoStore(s => s.updateTextAnimationProps)
  const onUpdateSlide = useVideoStore(s => s.updateSlide)
  const onSelectTextAnimationTemplate = useVideoStore(s => s.handleSelectTextAnimationTemplate)

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
    >
      {activeTool.type === ActiveToolType.BACKGROUND && (
        <BackgroundSettings
          value={getSlideWithBackground(selectedSlide?.slide!)}
          onChange={updateSlideBackground}
          onClose={handleCloseTool}
        />
      )}

      {activeTool.type === ActiveToolType.TEXT_ANIMATION_TEMPLATE &&
        selectedSlide?.slide.type === SlideType.ANIMATION &&
        (() => {
          const textAnimConfig = getTextAnimationConfig()
          if (!textAnimConfig) return null

          const content = selectedSlide?.slide.content.value as AnimationSlideContent
          const templateId = content?.templateId
          const templateConfig = content?.templateConfig || {}
          if (!templateId) return null

          return (
            <TextAnimationTemplateSettings
              templateId={templateId}
              templates={textAnimConfig.templates.templates}
              props={templateConfig}
              onUpdateProps={onUpdateTemplateProps}
              onClose={handleCloseTool}
              onApply={onPreviewTemplate}
            />
          )
        })()}
      {/* suggestions */}
      {activeTool.type === ActiveToolType.TEXT_ANIMATION_SETTINGS &&
        (() => {
          const textAnimConfig = getTextAnimationConfig()
          if (!textAnimConfig) return null
          return (
            <TextAnimationSelector
              selectedSlide={selectedSlide!}
              config={textAnimConfig.templates}
              onClose={handleCloseTool}
              onApply={templateId => {
                console.log('selected template', templateId)
                onSelectTextAnimationTemplate(templateId)
              }}
            />
          )
        })()}

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
          slideDuration={selectedSlide?.slide.duration}
          slideStartTime={0}
          transitionDuration={selectedSlide?.slide.transitionDuration}
          onPlay={onSpotlightPlay}
          isPreviewPlaying={isPreviewPlaying}
        />
      )}
    </motion.div>
  )
}

export default ToolsSettingsPanel
