import TextAnimationSelector from '@/components/editor/remotion/animations/suggester/TextAnimationSelector'
import VisualAnimationSelector from '@/components/editor/remotion/animations/suggester/VisualAnimationSelector'
import BackgroundSettings from '@/components/editor/settings/BackgroundSettings'
import InsertSettings from '@/components/editor/settings/InsertSettings'
import StackSlideSettings from '@/components/editor/settings/StackSlideSettings'
import TextAnimationTemplateSettings from '@/components/editor/settings/TextAnimationTemplateSettings'
import { useVideoStore } from '@/stores/video'
import { ActiveToolType } from '@/types/tools'
import {
  AnimationSlideContent,
  CalloutEffect,
  CanvasObjectType,
  SlideType,
  SpotlightEffect
} from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { motion } from 'framer-motion'

interface ToolsSettingsPanelProps {
  onPreviewTemplate: () => void
  onUpdateSpotlight?: (updates: Partial<SpotlightEffect>) => void
  onUpdateCallout?: (updates: Partial<CalloutEffect>) => void
  onSpotlightApply?: () => void
  onSpotlightPlay?: () => void
  deleteSpotlight?: (effectId: string) => void
  deleteCallout?: (effectId: string) => void
  selectedStackItemId?: string | null
  onSelectStackItem?: (itemId: string) => void
}

const ToolsSettingsPanel = ({
  onPreviewTemplate,
  onUpdateSpotlight,
  onUpdateCallout,
  onSpotlightPlay,
  selectedStackItemId,
  onSelectStackItem,
  deleteSpotlight,
  deleteCallout
}: ToolsSettingsPanelProps) => {
  const activeTool = useVideoStore(s => s.activeTool)
  const selectedSlide = useVideoStore(s => s.selectedSlide)
  const selectedObjectId = useVideoStore(s => s.selectedObjectId)
  const globalBackgroundColor = useVideoStore(s => s.globalBackgroundColor)
  const handleCloseTool = useVideoStore(s => s.handleCloseTool)
  const getTextAnimationConfig = useVideoStore(s => s.getTextAnimationConfig)
  const spotlights = useVideoStore(s => s.getSpotlights)
  const callouts = useVideoStore(s => s.getCallouts)
  const updateSlideBackground = useVideoStore(s => s.updateSlideBackground)
  const onUpdateTemplateProps = useVideoStore(s => s.handleUpdateTemplateProps)
  const onUpdateSlide = useVideoStore(s => s.updateSlide)
  const onSelectTextAnimationTemplate = useVideoStore(s => s.handleSelectTextAnimationTemplate)

  console.log('active tool', activeTool)

  if (!activeTool) return null
  const selectedObject =
    activeTool.type === ActiveToolType.INSERT && selectedObjectId
      ? activeTool.tool === CanvasObjectType.CANVAS_SPOTLIGHT
        ? spotlights().find(e => {
            return e.id === selectedObjectId
          })
        : callouts().find(e => {
            return e.id === selectedObjectId
          })
      : undefined

  const deleteFunction =
    activeTool.type === ActiveToolType.INSERT &&
    (activeTool.tool === CanvasObjectType.CANVAS_SPOTLIGHT
      ? deleteSpotlight
      : activeTool.tool === CanvasObjectType.CANVAS_CALLOUT
        ? deleteCallout
        : undefined)

  const updateFunction =
    activeTool.type === ActiveToolType.INSERT &&
    (activeTool.tool === CanvasObjectType.CANVAS_SPOTLIGHT
      ? onUpdateSpotlight
      : activeTool.tool === CanvasObjectType.CANVAS_CALLOUT
        ? onUpdateCallout
        : undefined)

  return (
    <motion.div
      key='settings'
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className='h-full'
    >
      {activeTool?.type === ActiveToolType.BACKGROUND && (
        <BackgroundSettings
          currentColor={selectedSlide?.slide.backgroundColor || '#0f172a'}
          globalBackgroundColor={globalBackgroundColor}
          onChange={updateSlideBackground}
          onClose={handleCloseTool}
        />
      )}

      {activeTool?.type === ActiveToolType.TEXT_ANIMATION_TEMPLATE &&
        selectedSlide?.slide.type === SlideType.TEXT_ANIMATION &&
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

      {activeTool?.type === ActiveToolType.VISUAL_ANIMATION_SETTINGS &&
        (selectedSlide?.slide.type === SlideType.VISUAL_ANIMATION ||
          selectedSlide?.slide.type === SlideType.INFOGRAPHIC) && (
          <VisualAnimationSelector
            selectedSlide={selectedSlide}
            onClose={handleCloseTool}
            onApply={animationId => {
              console.log('Applied animation:', animationId)
              // TODO: Implement actual animation application logic here
              // For now we just close the panel or verify the selection
            }}
          />
        )}
      {/* suggestions */}
      {activeTool?.type === ActiveToolType.TEXT_ANIMATION_SETTINGS &&
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

      {activeTool?.type === ActiveToolType.STACK_SETTINGS &&
        selectedSlide?.slide.type === SlideType.STACK &&
        onUpdateSlide && (
          <StackSlideSettings
            slide={selectedSlide?.slide}
            section={selectedSlide?.section}
            onUpdateSlide={onUpdateSlide}
            selectedItemId={selectedStackItemId}
            onSelectItem={onSelectStackItem}
            onClose={handleCloseTool}
            onPreview={onSpotlightPlay}
          />
        )}

      {activeTool?.type === ActiveToolType.INSERT && selectedObjectId && (
        <InsertSettings
          tool={activeTool?.tool}
          currentObject={selectedObject}
          onUpdate={updates => {

            if (selectedObjectId && updateFunction) {
              updateFunction(updates as Partial<SpotlightEffect> & Partial<CalloutEffect>)
            }
          }}
          onDelete={() => {
            if (selectedObjectId && deleteFunction) {
              deleteFunction(selectedObjectId)
              handleCloseTool()
            }
          }}
          onClose={handleCloseTool}
          canDelete={true}
          // Spotlight-specific props
          slideDuration={selectedSlide?.slide.duration}
          slideStartTime={0}
          transitionDuration={selectedSlide?.slide.transitionDuration}
          onPlay={onSpotlightPlay}
        />
      )}
    </motion.div>
  )
}

export default ToolsSettingsPanel
