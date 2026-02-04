import { Clock,  Palette, Type, ChevronDown, RefreshCw, Wand2, Sparkles, BarChart3, ImageIcon, Film, Focus, CircleDot, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { useVideoStore } from "@/stores/video";
import { SlideType, Slide, StackSlideContent, CanvasObjectType } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { ActiveToolType } from "@/types/tools";
import DurationChangeComponent from "./remotion/components/DurationChangeComponent";

interface PlayerToolbarProps {
  onDurationChange: (newDuration: number) => void;
  minDuration?: number;
  maxDuration?: number;
}

const slideTypeLabels: Record<SlideType, { label: string; icon: React.ElementType }> = {
  [SlideType.IMAGE]: { label: "Image", icon: ImageIcon },
  [SlideType.TEXT_ANIMATION]: { label: "Text Animation", icon: Type },
  [SlideType.INFOGRAPHIC]: { label: "Infographic", icon: BarChart3 },
  [SlideType.VISUAL_ANIMATION]: { label: "Visual Animation", icon: Sparkles },
  [SlideType.VIDEO]: { label: "Video", icon: Film },
  [SlideType.STACK]: { label: "Stack", icon: Layers },
};

const insertTools: { id: CanvasObjectType; name: string; icon: React.ElementType }[] = [
  { id: CanvasObjectType.CANVAS_CALLOUT, name: "Callout", icon: Focus },
  { id: CanvasObjectType.CANVAS_SPOTLIGHT, name: "Spotlight", icon: CircleDot },
];

const isMediaType = (type: SlideType) => type === SlideType.IMAGE || type === SlideType.VIDEO;

const PlayerToolbar = ({
  onDurationChange,
  minDuration = 1,
  maxDuration = 60,
}: PlayerToolbarProps) => {

  const onChangeVisual = useVideoStore(s => s.handleEditSlide);
  const onChangeTextAnimation = useVideoStore(s => s.handleEditSlide);
  const activeTool = useVideoStore(s => s.activeTool);
  const onSelectTool = useVideoStore(s => s.handleSelectTool);
  const selectedSlide = useVideoStore(s => s.selectedSlide);
  const selectedStackItemId = useVideoStore(s => s.selectedStackItemId);

  // Determine which slide to show in toolbar (could be a stack item)
  if (!selectedSlide) return
  let slide = selectedSlide.slide;
  if (selectedSlide?.slide?.type === SlideType.STACK && selectedStackItemId) {
    const content = selectedSlide.slide.content.value as StackSlideContent;
    const selectedItem = content?.items?.find((item: Slide) => item.id === selectedStackItemId);
    if (selectedItem) {
      slide = selectedItem;
    }
  }

  const [editValue, setEditValue] = useState(slide.duration.toString());

  const TypeIcon = slideTypeLabels[slide.type].icon;
  const currentBg = slide.backgroundColor || "#0f172a";
  const isBackgroundActive = activeTool?.type === ActiveToolType.BACKGROUND;
  const activeInsertTool = activeTool?.type === ActiveToolType.INSERT ? activeTool.tool : null;
  const showChangeVisualButton = slide.type === SlideType.VISUAL_ANIMATION || slide.type === SlideType.INFOGRAPHIC;
  const changeButtonLabel = slide.type === SlideType.INFOGRAPHIC ? "Change Infographic" : "Change Visual";

  const handleEditComplete = () => {
    const newDuration = parseFloat(editValue);
    if (!isNaN(newDuration) && newDuration >= minDuration && newDuration <= maxDuration) {
      onDurationChange(newDuration);
    } else {
      setEditValue(slide.duration.toString());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleEditComplete();
    } else if (e.key === "Escape") {
      setEditValue(slide.duration.toString());
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 border-b border-border bg-background">
      {/* Left side: Slide info and editing tools */}
      <div className="flex items-center gap-2">
        {/* Slide type indicator */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <TypeIcon className="w-4 h-4" />
          <span className="text-xs font-medium">{slideTypeLabels[slide.type].label}</span>
        </div>

        <div className="h-4 w-px bg-border mx-1" />

        {/* Background tool */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isBackgroundActive ? "secondary" : "ghost"}
                size="sm"
                className="gap-2 h-8"
                onClick={() => onSelectTool(isBackgroundActive ? null : { type: ActiveToolType.BACKGROUND })}
              >
                <div
                  className="w-4 h-4 rounded border border-border"
                  style={{ background: currentBg }}
                />
                <Palette className="w-4 h-4" />
                <span className="text-xs">Background</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Change background color
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Change Animation button for text-animation slides */}
        {slide.type === SlideType.TEXT_ANIMATION && onChangeTextAnimation && (
          <>
            <div className="h-4 w-px bg-border mx-1" />
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 h-8"
                    onClick={onChangeTextAnimation}
                  >
                    <Wand2 className="w-4 h-4" />
                    <span className="text-xs">Change Animation</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Choose text animation template
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}

        {/* Insert Tools Dropdown - only for image/video slides */}
        {isMediaType(slide.type) && (
          <>
            <div className="h-4 w-px bg-border mx-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={activeInsertTool ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2 h-8"
                >
                  {activeInsertTool ? (
                    <>
                      {(() => {
                        const tool = insertTools.find(t => t.id === activeInsertTool);
                        const Icon = tool?.icon || Type;
                        return <Icon className="w-4 h-4" />;
                      })()}
                      <span className="text-xs">{insertTools.find(t => t.id === activeInsertTool)?.name}</span>
                    </>
                  ) : (
                    <>
                      <Type className="w-4 h-4" />
                      <span className="text-xs">Insert</span>
                    </>
                  )}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40 bg-popover">
                {insertTools.map((tool) => (
                  <DropdownMenuItem
                    key={tool.id}
                    onClick={() => onSelectTool({ type: ActiveToolType.INSERT, tool: tool.id })}
                    className="gap-2"
                  >
                    <tool.icon className="w-4 h-4" />
                    {tool.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        {/* Change Visual/Infographic button */}
        {showChangeVisualButton && onChangeVisual && (
          <>
            <div className="h-4 w-px bg-border mx-1" />
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 h-8"
                    onClick={onChangeVisual}
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-xs">{changeButtonLabel}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {changeButtonLabel}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>

      {/* Right side: Duration control */}
      <div className="flex items-center gap-2">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Duration:</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Slide duration in seconds
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DurationChangeComponent
          value={slide.duration}
          onValueChange={val => {
            onDurationChange(val);
          }}
          max={maxDuration}
          min={minDuration}
          step={0.1}
        />
      </div>
    </div>
  );
};

export default PlayerToolbar;
