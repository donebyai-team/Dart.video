import { useRef, useEffect } from "react";
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
import { Plus } from "lucide-react";
import StoryboardSection from "./StoryboardSection";
import { Section, Slide, SlideType } from "@/types/slides";
import { useVideoStore } from "@/stores/video";

interface StoryboardPanelProps {    
    onSelectSlide: (section: Section, slide: Slide) => void;   
    onStartEditTitle: (sectionId: string, title: string) => void;
    onSaveTitle: () => void;
}

const StoryboardPanel = ({
    onSelectSlide,
    onStartEditTitle,
    onSaveTitle,
}: StoryboardPanelProps) => {
    const storyboardRef = useRef<HTMLDivElement>(null);

    const sections = useVideoStore(s => s.sections);
    const selectedSlideId = useVideoStore(s => s.selectedSlide.slide.id);
    const editingSectionId = useVideoStore(s => s.editingSectionId);
    const editingSectionTitle = useVideoStore(s => s.editingSectionTitle);
    const generatingSectionVoiceover = useVideoStore(s => s.generatingSectionVoiceover);
    const showTransitionPicker = useVideoStore(s => s.showTransitionPicker);

    const openSections = useVideoStore(s => s.openSections);
    const onSectionDragEnd = useVideoStore(s => s.handleSectionDragEnd);
    const onReorderSlides = useVideoStore(s => s.reorderSlidesInSection);
    const onToggleSection = useVideoStore(s => s.toggleSection);

    const onRemoveSection = useVideoStore(s => s.removeSection);
    const onRemoveSlide = useVideoStore(s => s.removeSlide);
    const onEditTitleChange = useVideoStore(s => s.setEditingSectionTitle);

    const onCancelEditTitle = useVideoStore(s => s.setEditingSectionId);
    const onGenerateVoiceover = useVideoStore(s => s.handleGenerateSectionVoiceover);
      const onShowTransitionPicker = useVideoStore(s => s.setShowTransitionPicker);
    const onUpdateTransition = useVideoStore(s => s.updateSlideTransition);
    const onAddSlide = useVideoStore(s => s.addSlide);
    const onAddSection = useVideoStore(s => s.addSection);


    const prevSectionsLength = useRef(sections.length);

    // Auto-scroll to bottom directly in the panel when a new section is added
    useEffect(() => {
        if (sections.length > prevSectionsLength.current) {
            setTimeout(() => {
                storyboardRef.current?.scrollTo({
                    top: storyboardRef.current.scrollHeight,
                    behavior: "smooth"
                });
            }, 100);
        }
        prevSectionsLength.current = sections.length;
    }, [sections.length]);

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

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-muted/10">
            <div
                className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4"
                ref={storyboardRef}
            >
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={onSectionDragEnd}
                >
                    <SortableContext
                        items={sections.map((s) => s.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {sections.map((section, index) => (
                            <StoryboardSection
                                key={section.id}
                                section={section}
                                index={index}
                                isFirstSection={index === 0}
                                isOpen={openSections.includes(section.id)}
                                selectedSlideId={selectedSlideId}
                                editingSectionId={editingSectionId}
                                editingSectionTitle={editingSectionTitle}
                                generatingSectionVoiceover={generatingSectionVoiceover}
                                showTransitionPicker={showTransitionPicker}

                                onToggle={() => onToggleSection(section.id)}
                                onSelectSlide={onSelectSlide}
                                onRemoveSection={() => onRemoveSection(section.id)}
                                onRemoveSlide={(slideId) => onRemoveSlide(section.id, slideId)}

                                onStartEditTitle={() => onStartEditTitle(section.id, section.title)}
                                onEditTitleChange={onEditTitleChange}
                                onSaveTitle={onSaveTitle}
                                onCancelEditTitle={()=> {
                                    onCancelEditTitle(null)
                                }}

                                onGenerateVoiceover={() => onGenerateVoiceover(section.id)}
                                onPlayVoiceover={()=> {
                                    console.log("NOT IMPLEMENTED")
                                }}

                                onShowTransitionPicker={onShowTransitionPicker}
                                onUpdateTransition={(slideId, transitionId) =>
                                    onUpdateTransition(section.id, slideId, transitionId)
                                }

                                onAddSlide={(type) => onAddSlide(section.id, type)}
                                onReorderSlides={(activeId, overId) =>
                                    onReorderSlides(section.id, activeId, overId)
                                }
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>

            <div className="p-3 border-t border-border bg-card/50 backdrop-blur-sm">
                <button
                    onClick={onAddSection}
                    className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-border rounded-lg text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-muted/50 transition-all group"
                >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Section</span>
                </button>
            </div>
        </div>
    );
};

export default StoryboardPanel;
