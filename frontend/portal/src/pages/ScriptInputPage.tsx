import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ScriptSection {
  id: string;
  title: string;
  voiceover: string;
  referenceText: string;
}

const defaultSections: ScriptSection[] = [
  { id: "hook", title: "Hook", voiceover: "", referenceText: "" },
  { id: "challenge", title: "Challenge", voiceover: "", referenceText: "" },
  { id: "outcome", title: "Outcome", voiceover: "", referenceText: "" },
  { id: "category-intro", title: "Category Intro", voiceover: "", referenceText: "" },
  { id: "product-intro", title: "Product Intro", voiceover: "", referenceText: "" },
  { id: "x-factor-1", title: "X-Factor 1", voiceover: "", referenceText: "" },
  { id: "x-factor-2", title: "X-Factor 2", voiceover: "", referenceText: "" },
  { id: "x-factor-3", title: "X-Factor 3", voiceover: "", referenceText: "" },
  { id: "x-factor-4", title: "X-Factor 4", voiceover: "", referenceText: "" },
  { id: "social-proof", title: "Social Proof", voiceover: "", referenceText: "" },
  { id: "cta", title: "CTA", voiceover: "", referenceText: "" },
];

interface SortableSectionCardProps {
  section: ScriptSection;
  isOpen: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdateField: (field: "voiceover" | "referenceText", value: string) => void;
  onUpdateTitle: (title: string) => void;
}

const SortableSectionCard = ({
  section,
  isOpen,
  onToggle,
  onRemove,
  onUpdateField,
  onUpdateTitle,
}: SortableSectionCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`overflow-hidden ${isDragging ? "shadow-lg" : ""}`}>
        <Collapsible open={isOpen} onOpenChange={onToggle}>
          <div className="flex items-center gap-2 p-3 bg-muted/50 border-b border-border">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab hover:bg-muted p-1 rounded"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            <CollapsibleTrigger asChild>
              <button className="p-1 hover:bg-muted rounded">
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <Input
              value={section.title}
              onChange={(e) => onUpdateTitle(e.target.value)}
              className="h-8 font-medium bg-transparent border-none shadow-none focus-visible:ring-1 px-2"
            />
            {section.voiceover.trim() && (
              <span className="text-xs text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                Filled
              </span>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto">
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Section</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove "{section.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onRemove}>Remove</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <CollapsibleContent>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">
                  Voiceover Script <span className="text-destructive">*</span>
                </label>
                <Textarea
                  placeholder="Enter the voiceover text for this section..."
                  value={section.voiceover}
                  onChange={(e) => onUpdateField("voiceover", e.target.value)}
                  className="min-h-[100px] text-sm resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">
                  Reference Design <span className="text-muted-foreground">(optional)</span>
                </label>
                <Textarea
                  placeholder="Describe the visuals you want to show (e.g., 'Show product dashboard with key metrics highlighted')..."
                  value={section.referenceText}
                  onChange={(e) => onUpdateField("referenceText", e.target.value)}
                  className="min-h-[80px] text-sm resize-none"
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};

const ScriptInputPage = () => {
  const router = useRouter();
  
  const [sections, setSections] = useState<ScriptSection[]>(defaultSections);
  const [openSections, setOpenSections] = useState<string[]>(["hook"]);

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
      setSections((prev) => {
        const oldIndex = prev.findIndex((s) => s.id === active.id);
        const newIndex = prev.findIndex((s) => s.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const removeSection = (sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    setOpenSections((prev) => prev.filter((id) => id !== sectionId));
  };

  const updateSectionField = (
    sectionId: string,
    field: "voiceover" | "referenceText",
    value: string
  ) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, [field]: value } : section
      )
    );
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, title } : section
      )
    );
  };

  const addSection = () => {
    const newSection: ScriptSection = {
      id: `section-${Date.now()}`,
      title: "New Section",
      voiceover: "",
      referenceText: "",
    };
    setSections((prev) => [...prev, newSection]);
    setOpenSections((prev) => [...prev, newSection.id]);
  };

  const handleGenerateStoryboard = () => {
    // For now, navigate to editor with a placeholder ID
    // In a real app, you'd create a new video and get its ID
    router.push("/editor/new");
  };

  const filledSections = sections.filter((s) => s.voiceover.trim()).length;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Video className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold">CoasterAI</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {filledSections}/{sections.length} sections filled
          </span>
          <Button
            className="btn-accent-gradient"
            onClick={handleGenerateStoryboard}
            disabled={filledSections === 0}
          >
            Generate Storyboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Script Editor</h1>
            <p className="text-muted-foreground mt-1">
              Define your video sections and voiceover script. We'll create the storyboard with slides automatically.
            </p>
          </div>

          <div className="space-y-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {sections.map((section) => (
                  <SortableSectionCard
                    key={section.id}
                    section={section}
                    isOpen={openSections.includes(section.id)}
                    onToggle={() => toggleSection(section.id)}
                    onRemove={() => removeSection(section.id)}
                    onUpdateField={(field, value) =>
                      updateSectionField(section.id, field, value)
                    }
                    onUpdateTitle={(title) => updateSectionTitle(section.id, title)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <Button
            variant="outline"
            className="w-full mt-4 gap-2"
            onClick={addSection}
          >
            <Plus className="w-4 h-4" />
            Add Section
          </Button>
        </motion.div>
      </main>
    </div>
  );
};

export default ScriptInputPage;
