import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    closestCenter,
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { motion } from "framer-motion";
import {
    ChevronDown,
    GripVertical,
    Pencil,
    Play,
    RefreshCw,
    Trash2,
    Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import AddSlideButton from "./AddSlideButton";
import SortableSlideCard from "./SortableSlideCard";
import TransitionPicker from "./TransitionPicker";
import { ImageIcon, Type, BarChart3, Sparkles, Film, Layers } from "lucide-react";
import { Section, Slide, SlideType, TransitionType } from "@coasterai/pb/coasterai/core/v1/slide_pb";

interface StoryboardSectionProps {
    section: Section;
    index: number;
    selectedSlideId: string;
    editingSectionId: string | null;
    editingSectionTitle: string;
    generatingSectionVoiceover: string | null;
    showTransitionPicker: string | null;
    isFirstSection: boolean;
    onSelectSlide: (section: Section, slide: Slide) => void;
    onRemoveSection: () => void;
    onRemoveSlide: (slideId: string) => void;
    onStartEditTitle: () => void;
    onEditTitleChange: (value: string) => void;
    onSaveTitle: () => void;
    onCancelEditTitle: () => void;
    onGenerateVoiceover: () => void;
    onPlayVoiceover: () => void;
    onShowTransitionPicker: (slideId: string | null) => void;
    onUpdateTransition: (slideId: string, transitionId: TransitionType) => void;
    onAddSlide: (type: SlideType) => void;
    onReorderSlides: (activeId: string, overId: string) => void;
}

const StoryboardSection = ({
    section,
    selectedSlideId,
    editingSectionId,
    editingSectionTitle,
    generatingSectionVoiceover,
    showTransitionPicker,
    isFirstSection,
    onSelectSlide,
    onRemoveSection,
    onRemoveSlide,
    onStartEditTitle,
    onEditTitleChange,
    onSaveTitle,
    onCancelEditTitle,
    onGenerateVoiceover,
    onPlayVoiceover,
    onShowTransitionPicker,
    onUpdateTransition,
    onAddSlide,
    onReorderSlides,
}: StoryboardSectionProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: section.id });

    const allSlideTypes = [
        { id: SlideType.IMAGE, name: "Image/Screenshot", description: "Add screen with annotations", icon: ImageIcon },
        { id: SlideType.TEXT_ANIMATION, name: "Text Animation", description: "Animated typography", icon: Type },
        { id: SlideType.INFOGRAPHIC, name: "Infographic", description: "Data-driven visuals", icon: BarChart3 },
        { id: SlideType.VISUAL_ANIMATION, name: "Visual Animation", description: "AI-generated motion graphics", icon: Sparkles },
        { id: SlideType.VIDEO, name: "Video Clip", description: "Add video content", icon: Film },
        { id: SlideType.STACK, name: "Stack", description: "Layered image animations", icon: Layers },
    ];

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : undefined,
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            onReorderSlides(active.id as string, over.id as string);
        }
    };

    return (
        <div ref={setNodeRef} style={style}>
            <Collapsible open={true}>
                <div className="flex items-center gap-1">
                    {/* Section drag handle */}
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical className="w-3 h-3 text-muted-foreground/50" />
                    </div>

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
                        <CollapsibleTrigger className="flex-1">
                            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors group">
                                <div className={`w-2 h-2 rounded-full ${section.color}`} />
                                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex-1 text-left">
                                    {section.title}
                                </span>
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
                                <span className="text-[10px] text-muted-foreground mr-1">
                                    {section.slides.length}
                                </span>
                                <ChevronDown
                                    className={`w-3 h-3 text-muted-foreground transition-transform`}
                                />
                            </div>
                        </CollapsibleTrigger>
                    )}

                    {/* Section voiceover controls */}
                    <TooltipProvider delayDuration={200}>
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
                    </TooltipProvider>
                </div>

                <CollapsibleContent>
                    <div className="pl-6 pr-1 py-1 space-y-1">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={section.slides.map((s) => s.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {section.slides.map((slide, slideIndex) => {
                                    const showTransition = !isFirstSection || slideIndex > 0;

                                    return (
                                        <div key={slide.id} className="space-y-1">
                                            {/* Transition Picker is rendered BEFORE the slide it controls */}
                                            {showTransition && (
                                                <TransitionPicker
                                                    currentTransitionType={slide.transition || TransitionType.TRANSITION_NONE}
                                                    isOpen={showTransitionPicker === slide.id}
                                                    onToggle={() =>
                                                        onShowTransitionPicker(
                                                            showTransitionPicker === slide.id ? null : slide.id
                                                        )
                                                    }
                                                    onSelect={(transitionId) =>
                                                        onUpdateTransition(slide.id, transitionId)
                                                    }
                                                    onClose={() => onShowTransitionPicker(null)}
                                                />
                                            )}

                                            <SortableSlideCard
                                                slide={slide}
                                                isSelected={selectedSlideId === slide.id}
                                                index={slideIndex}
                                                onSelect={() => onSelectSlide(section, slide)}
                                                onDelete={() => onRemoveSlide(slide.id)}
                                            />
                                        </div>
                                    );
                                })}
                            </SortableContext>
                        </DndContext>

                        {/* Add slide button */}
                        <AddSlideButton
                            slideTypes={allSlideTypes}
                            onAddSlide={onAddSlide}
                            variant="inline"
                        />
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
};

export default StoryboardSection;
