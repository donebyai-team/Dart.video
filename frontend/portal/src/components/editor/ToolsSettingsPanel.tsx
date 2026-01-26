import { motion } from "framer-motion";
import BackgroundSettings from "@/components/editor/settings/BackgroundSettings";
import InsertSettings from "@/components/editor/settings/InsertSettings";
import TextAnimationTemplateSettings from "@/components/editor/settings/TextAnimationTemplateSettings";
import StackSlideSettings from "@/components/editor/settings/StackSlideSettings";
import VisualAnimationSelector from "@/components/editor/remotion/animations/suggester/VisualAnimationSelector";
import TextAnimationSelector from "@/components/editor/remotion/animations/suggester/TextAnimationSelector";
import { ActiveToolType } from "@/types/tools";
import { useVideoStore } from "@/stores/video";
import { AnimationSlideContent, AnnotationObject, CanvasObject, SlideEffect, SlideType } from "@coasterai/pb/coasterai/core/v1/slide_pb";

interface ToolsSettingsPanelProps {
    onPreviewTemplate: () => void;
    onUpdateCanvasObject: (updates: Partial<CanvasObject>) => void;
    onUpdateEffect?: (updates: Partial<SlideEffect>) => void;
    onUpdateAnnotation?: (updates: Partial<AnnotationObject>) => void;
    onDeleteCanvasObject: () => void;
    onSpotlightApply?: () => void;
    onSpotlightPlay?: () => void;
    selectedStackItemId?: string | null;
    onSelectStackItem?: (itemId: string) => void;
}

const ToolsSettingsPanel = ({
    onPreviewTemplate,
    onUpdateCanvasObject,
    onUpdateEffect,
    onUpdateAnnotation,
    onDeleteCanvasObject,
    onSpotlightApply,
    onSpotlightPlay,
    selectedStackItemId,
    onSelectStackItem,
}: ToolsSettingsPanelProps) => {
    const activeTool = useVideoStore(s => s.activeTool);
    const selectedSlide = useVideoStore(s => s.selectedSlide);
    const selectedObjectId = useVideoStore(s => s.selectedObjectId);
    const globalBackgroundColor = useVideoStore(s => s.globalBackgroundColor);
    const handleCloseTool = useVideoStore(s => s.handleCloseTool);
    const getTextAnimationConfig = useVideoStore(s => s.getTextAnimationConfig);

    const updateSlideBackground = useVideoStore(s => s.updateSlideBackground);
    const onUpdateTemplateProps = useVideoStore(s => s.handleUpdateTemplateProps);
    const onUpdateSlide = useVideoStore(s => s.updateSlide);
    const onSelectTextAnimationTemplate = useVideoStore(s => s.handleSelectTextAnimationTemplate);
    console.log("active tool", activeTool)

    if (!activeTool) return null;

    const effectiveCanvasObjects = useVideoStore(s => s.getEffectiveCanvasObjects);
    const selectedObject = selectedObjectId
        ? effectiveCanvasObjects().find(e => {
            switch (e.effect.case) {
                case "spotlight":
                case "zoom":
                    return e.effect.value.id === selectedObjectId;
                default:
                    return false;
            }
        })
        : undefined;



    return (
        <motion.div
            key="settings"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
        >
            {activeTool?.type === ActiveToolType.BACKGROUND && (
                <BackgroundSettings
                    currentColor={selectedSlide?.slide.backgroundColor || "#0f172a"}
                    globalBackgroundColor={globalBackgroundColor}
                    onChange={updateSlideBackground}
                    onClose={handleCloseTool}
                />
            )}

            {activeTool?.type === ActiveToolType.TEXT_ANIMATION_TEMPLATE &&
                selectedSlide?.slide.type === SlideType.TEXT_ANIMATION &&
                (() => {
                    const textAnimConfig = getTextAnimationConfig();
                    if (!textAnimConfig) return null;

                    const content = selectedSlide?.slide.content.value as AnimationSlideContent;
                    const templateId = content?.templateId;
                    const templateConfig = content?.templateConfig || {};
                    console.log("ewrfwefwef tem", templateConfig)
                    if (!templateId) return null;
                    console.log("ewrfwefwef tem", templateId)

                    return (
                        <TextAnimationTemplateSettings
                            templateId={templateId}
                            templates={textAnimConfig.templates.templates}
                            props={templateConfig}
                            onUpdateProps={onUpdateTemplateProps}
                            onClose={handleCloseTool}
                            onApply={onPreviewTemplate}
                        />
                    );
                })()}

            {activeTool?.type === ActiveToolType.VISUAL_ANIMATION_SETTINGS && (
                selectedSlide?.slide.type === SlideType.VISUAL_ANIMATION || selectedSlide?.slide.type === SlideType.INFOGRAPHIC
            ) && (
                    <VisualAnimationSelector
                        selectedSlide={selectedSlide}
                        onClose={handleCloseTool}
                        onApply={(animationId) => {
                            console.log("Applied animation:", animationId);
                            // TODO: Implement actual animation application logic here
                            // For now we just close the panel or verify the selection
                        }}
                    />
                )}
            {/* suggestions */}
            {activeTool?.type === ActiveToolType.TEXT_ANIMATION_SETTINGS && (() => {
                const textAnimConfig = getTextAnimationConfig();
                if (!textAnimConfig) return null;
                return (
                    <TextAnimationSelector
                        selectedSlide={selectedSlide!}
                        config={textAnimConfig.templates}
                        onClose={handleCloseTool}
                        onApply={(templateId) => {
                            console.log("selected template", templateId)
                            onSelectTextAnimationTemplate(templateId);
                        }}
                    />
                );
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
                    onChange={(updates) => {
                        if (selectedObjectId) {
                            onUpdateCanvasObject(updates);
                        }
                    }}
                    onChangeEffect={(updates) => {
                        if (selectedObjectId && onUpdateEffect) {
                            onUpdateEffect(updates);
                        }
                    }}
                    onChangeAnnotation={(updates) => {
                        if (selectedObjectId && onUpdateAnnotation) {
                            onUpdateAnnotation(updates);
                        }
                    }}
                    onDelete={() => {
                        if (selectedObjectId) {
                            onDeleteCanvasObject();
                            handleCloseTool();
                        }
                    }}
                    onClose={handleCloseTool}
                    canDelete={true}
                    // Spotlight-specific props
                    slideDuration={selectedSlide?.slide.duration}
                    slideStartTime={0}
                    onApply={selectedObject?.effect.case === "spotlight" ? onSpotlightApply : undefined}
                    onPlay={selectedObject?.effect.case === "spotlight" ? onSpotlightPlay : undefined}
                />
            )}
        </motion.div>
    );
};

export default ToolsSettingsPanel;
