import {
    useDroppable,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
    Clapperboard,
    ChevronDown,
    Image,
    Pencil,
    Plus,
    Trash2,
    Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import SortableSlideCard from "./SortableSlideCard";
import TransitionPicker from "./TransitionPicker";
import {
    Section,
    Slide,
    TransitionDirection,
    TransitionType
} from "@coasterai/pb/coasterai/core/v1/slide_pb";
import {
    getSlideTransitionDirectionValue,
    isDirectionSupportedTransition
} from "@coasterai/renderer";
import { SlideType } from "@/types/tools";

interface StoryboardSectionProps {
    section: Section;
    index: number;
    selectedSlideId: string;
    editingSectionId: string | null;
    editingSectionTitle: string;
    showTransitionPicker: string | null;
    isLastSection: boolean;
    onSelectSlide: (section: Section, slide: Slide) => void;
    onRemoveSection: () => void;
    onRemoveSlide: (slideId: string) => void;
    onDuplicateSlide: (slideId: string) => void;
    onStartEditTitle: () => void;
    onEditTitleChange: (value: string) => void;
    onSaveTitle: () => void;
    onCancelEditTitle: () => void;
    onShowTransitionPicker: (slideId: string | null) => void;
    onUpdateTransition: (slideId: string, transitionId: TransitionType, direction?: TransitionDirection) => void;
    onAddSlide: (afterSlideId?: string, slideType?: SlideType) => void;
}

const StoryboardSection = ({
    section,
    selectedSlideId,
    editingSectionId,
    editingSectionTitle,
    showTransitionPicker,
    isLastSection,
    onSelectSlide,
    onRemoveSection,
    onRemoveSlide,
    onDuplicateSlide,
    onStartEditTitle,
    onEditTitleChange,
    onSaveTitle,
    onCancelEditTitle,
    onShowTransitionPicker,
    onUpdateTransition,
    onAddSlide,
}: StoryboardSectionProps) => {
    const {
        setNodeRef: setSectionEndRef,
        isOver: isOverSectionEnd,
    } = useDroppable({
        id: `section-end:${section.id}`,
    });

    return (
        <div>
            <Collapsible open={true}>
                <div className="flex items-center gap-1">
                    {editingSectionId === section.id ? (
                        <div className="flex-1 flex items-center gap-1 px-2">
                            <div className={`w-2 h-2 rounded-full ${section.color}`} />
                            <Input
                                value={editingSectionTitle}
                                onChange={(e) => onEditTitleChange(e.target.value)}
                                onBlur={onSaveTitle}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") onSaveTitle();
                                    if (e.key === "Escape") onCancelEditTitle();
                                }}
                                className="h-6 text-xs font-semibold uppercase tracking-wide"
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors group">
                            <CollapsibleTrigger asChild>
                                <button type="button" className="flex-1 flex items-center gap-2 min-w-0">
                                    <div className={`w-2 h-2 rounded-full ${section.color}`} />
                                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex-1 text-left truncate">
                                        {section.title}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground mr-1">
                                        {section.slides.length} scenes
                                    </span>
                                    <ChevronDown
                                        className={`w-3 h-3 text-muted-foreground transition-transform`}
                                    />
                                </button>
                            </CollapsibleTrigger>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStartEditTitle();
                                }}
                            >
                                <Pencil className="w-2.5 h-2.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveSection();
                                }}
                            >
                                <Trash2 className="w-2.5 h-2.5" />
                            </Button>
                        </div>
                    )}

                    {/* Section voiceover controls */}
                    {/* <TooltipProvider delayDuration={200}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onGenerateVoiceover();
                                    }}
                                    disabled={generatingSectionVoiceover === section.id}
                                >
                                    {generatingSectionVoiceover === section.id ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{
                                                duration: 1,
                                                repeat: Infinity,
                                                ease: "linear",
                                            }}
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                        </motion.div>
                                    ) : (
                                        <Volume2 className="w-3 h-3" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-[10px]">
                                {section.voiceoverGenerated ? "Regenerate" : "Generate"} section voiceover
                            </TooltipContent>
                        </Tooltip>

                        {section.voiceoverGenerated && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onPlayVoiceover();
                                        }}
                                    >
                                        <Play className="w-3 h-3" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="text-[10px]">
                                    Play section voiceover
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </TooltipProvider> */}
                </div>

                <CollapsibleContent>
                    <div className="pl-6 pr-1 py-1 space-y-1">
                        <SortableContext
                            items={section.slides.map((s) => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {section.slides.map((slide, slideIndex) => {
                                const isLastSlideInSection = slideIndex === section.slides.length - 1;
                                const showTransition = !(isLastSection && isLastSlideInSection);
                                const currentDirection = getSlideTransitionDirectionValue(slide);

                                return (
                                    <div key={slide.id} className="space-y-1">
                                        <SortableSlideCard
                                            slide={slide}
                                            isSelected={selectedSlideId === slide.id}
                                            index={slideIndex}
                                            onSelect={() => onSelectSlide(section, slide)}
                                            onDelete={() => onRemoveSlide(slide.id)}
                                            onDuplicate={() => onDuplicateSlide(slide.id)}
                                        />

                                        {/* Between-slide controls: transition + add slide */}
                                        <div className="relative flex items-center justify-center py-2">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        onClick={() => onAddSlide(slide.id, SlideType.ANIMATION)}
                                                        className="relative z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium transition-colors bg-muted hover:bg-muted/80 text-muted-foreground mr-1"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        Add scene
                                                    </button>
                                                </DropdownMenuTrigger>
                                                {/* <DropdownMenuContent align="start" className="w-40 bg-popover">
                                                    <DropdownMenuItem onSelect={() => onAddSlide(slide.id, SlideType.ANIMATION)}>
                                                        <Clapperboard className="w-3.5 h-3.5 mr-2" />
                                                        Animation
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => onAddSlide(slide.id, SlideType.MEDIA)}>
                                                        <div className="flex items-center mr-2">
                                                            <Image className="w-3.5 h-3.5" />
                                                        </div>
                                                        Image/Video
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent> */}
                                            </DropdownMenu>

                                            {showTransition && (
                                                <TransitionPicker
                                                    currentTransitionType={slide.transition || TransitionType.TRANSITION_NONE}
                                                    currentDirection={currentDirection}
                                                    isOpen={showTransitionPicker === slide.id}
                                                    onToggle={() =>
                                                        onShowTransitionPicker(
                                                            showTransitionPicker === slide.id ? null : slide.id
                                                        )
                                                    }
                                                    onSelectTransition={(transitionId) => {
                                                        const defaultDirection =
                                                            isDirectionSupportedTransition(transitionId)
                                                                ? (currentDirection ?? TransitionDirection.FROM_RIGHT)
                                                                : undefined;
                                                        onUpdateTransition(slide.id, transitionId, defaultDirection);
                                                    }}
                                                    onSelectDirection={(direction) =>
                                                        onUpdateTransition(slide.id, slide.transition, direction)
                                                    }
                                                    onClose={() => onShowTransitionPicker(null)}
                                                    inline
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </SortableContext>

                        <div
                            ref={setSectionEndRef}
                            className={`rounded-md border border-dashed px-3 py-2 text-[10px] text-muted-foreground transition-colors ${isOverSectionEnd ? "border-primary bg-primary/5 text-primary" : "border-border/60"
                                }`}
                        >
                            {/* {section.slides.length === 0 ? "Drop scene here" : "Drop at end of section"} */}
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
};

export default StoryboardSection;
