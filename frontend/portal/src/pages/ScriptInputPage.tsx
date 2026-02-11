import { useState, useEffect } from "react";
import toast from "react-hot-toast";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { Script, ScriptItem } from "@coasterai/pb/coasterai/core/v1/video_pb";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import { GripVertical, Plus, X } from "lucide-react";

/* ---------------- Constants ---------------- */

const MIN_SECTIONS = 3;

/* ---------------- Default ---------------- */
const defaultScriptItems: ScriptItem[] = [
  { name: "Hook", voiceover: "", reference: "" } as ScriptItem,
  { name: "Challenge", voiceover: "", reference: "" } as ScriptItem,
  { name: "Outcome", voiceover: "", reference: "" } as ScriptItem,
  { name: "Category Intro", voiceover: "", reference: "" } as ScriptItem,
  { name: "Product Intro", voiceover: "", reference: "" } as ScriptItem,
  { name: "X-Factor 1", voiceover: "", reference: "" } as ScriptItem,
  { name: "X-Factor 2", voiceover: "", reference: "" } as ScriptItem,
  { name: "Social Proof", voiceover: "", reference: "" } as ScriptItem,
  { name: "CTA", voiceover: "", reference: "" } as ScriptItem,
];

/* ---------------- Sortable Item ---------------- */

function SortableItem({
  item,
  index,
  isActive,
  onClick,
  onDelete,
  disableDelete,
}: any) {

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isFilled = !!item.voiceover?.trim();

  return (
    <div ref={setNodeRef} style={style}>
      <div
        onClick={onClick}
        className={`
          group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
          transition
          ${isActive
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted"
          }
        `}
      >

        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="opacity-40 group-hover:opacity-100 cursor-grab"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Name */}
        <span className="flex-1 truncate text-sm font-medium">
          {item.name}
        </span>

        {/* Filled Indicator */}
        {isFilled && (
          <span className="text-xs text-emerald-500">●</span>
        )}

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(index);
          }}
          disabled={disableDelete}
          className={`
            ml-1 p-1 rounded-md transition
            ${disableDelete
              ? "opacity-30 cursor-not-allowed"
              : "opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
            }
            ${isActive ? "opacity-100" : ""}
          `}
        >
          <X className="w-3.5 h-3.5" />
        </button>

      </div>
    </div>
  );
}


const getVoiceoverHint = (name?: string) => {
  if (!name) return "Write narration for this section.";

  const key = name.toLowerCase();

  if (key.includes("hook"))
    return "Grab attention in the first 3 seconds. Ask a question, show a bold claim, or highlight a pain point.";

  if (key.includes("challenge"))
    return "Describe the user's problem or pain clearly and emotionally.";

  if (key.includes("outcome") || key.includes("solution"))
    return "Show the transformation or result after using the product.";

  if (key.includes("cta"))
    return "Tell the viewer exactly what to do next (Try now, Sign up, Learn more).";

  return "Write clear narration for this section.";
};


/* ---------------- Component ---------------- */

export default function ScriptEditorDialog({
  open,
  onOpenChange,
  onSave,
  initialScript,
}: any) {

  /* ---------------- State ---------------- */

  const [script, setScript] = useState<Script>({
    items: defaultScriptItems,
  } as Script);

  const [selectedIndex, setSelectedIndex] = useState(0);

  /* ---------------- Sensors ---------------- */

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  /* ---------------- Reset From Parent ---------------- */

  useEffect(() => {
    if (open) {
      setScript({
        items:
          initialScript?.items?.length
            ? [...initialScript.items]
            : [...defaultScriptItems],
      } as Script);

      setSelectedIndex(0);
    }
  }, [open, initialScript]);

  /* ---------------- Derived ---------------- */

  const selectedItem = script.items[selectedIndex];

  const filledSections = script.items.filter(
    (i) => i.voiceover?.trim()
  ).length;

  const hasMinSections = script.items.length >= MIN_SECTIONS;

  /* ---------------- Actions ---------------- */

  const updateItem = (index: number, patch: Partial<ScriptItem>) => {
    setScript((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    }));
  };

  const addSection = () => {
    const newItem: ScriptItem = {
      name: "New Section",
      voiceover: "",
      reference: "",
    } as ScriptItem;

    setScript((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    setSelectedIndex(script.items.length);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = active.id;
    const newIndex = over.id;

    setScript((prev) => ({
      ...prev,
      items: arrayMove(prev.items, oldIndex, newIndex),
    }));

    if (selectedIndex === oldIndex) setSelectedIndex(newIndex);
  };

  const handleSave = () => {
    if (!hasMinSections) {
      toast.error(`Minimum ${MIN_SECTIONS} sections required`);
      return;
    }

    onSave(script);
    onOpenChange(false);
  };

  const removeSection = (index: number) => {
    if (script.items.length <= MIN_SECTIONS) {
      toast.error(`Minimum ${MIN_SECTIONS} sections required`);
      return;
    }

    setScript((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));

    // Fix selection
    setSelectedIndex((prevIndex) => {
      if (prevIndex > index) return prevIndex - 1;
      if (prevIndex === index) return Math.max(0, prevIndex - 1);
      return prevIndex;
    });
  };


  /* ---------------- UI ---------------- */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-2 overflow-hidden">

        <div className="flex h-[500px]">

          {/* Sidebar */}
          <div className="w-64 border-r bg-muted/20 flex flex-col">

            <div className="flex-1 overflow-y-auto p-3 space-y-1">

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={script.items.map((_, i) => i)}
                  strategy={verticalListSortingStrategy}
                >
                  {script.items.map((item, index) => (
                    <SortableItem
                      key={index}
                      item={item}
                      index={index}
                      isActive={index === selectedIndex}
                      disableDelete={script.items.length <= MIN_SECTIONS}
                      onClick={() => setSelectedIndex(index)}
                      onDelete={removeSection}
                    />
                  ))}

                </SortableContext>
              </DndContext>

            </div>

            <div className="p-3 border-t">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={addSection}
              >
                <Plus className="w-4 h-4" />
                Add Section
              </Button>
            </div>

          </div>

          {/* Editor */}
          <div className="flex-1 flex flex-col">

            {selectedItem && (
              <>
                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6">

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Voiceover Script
                    </label>

                    <Textarea
                      className="min-h-[100px]"
                      placeholder={getVoiceoverHint(selectedItem?.name)}
                      value={selectedItem.voiceover ?? ""}
                      onChange={(e) =>
                        updateItem(selectedIndex, {
                          voiceover: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Visual Reference
                    </label>

                    <Textarea
                      className="min-h-[100px]"
                      placeholder="Any reference you may want to refer"
                      value={selectedItem.reference ?? ""}
                      onChange={(e) =>
                        updateItem(selectedIndex, {
                          reference: e.target.value,
                        })
                      }
                    />
                  </div>

                </div>

                <div className="px-8 py-5 border-t flex justify-between items-center bg-muted/10">

                  <span className="text-sm text-muted-foreground">
                    {filledSections}/{script.items.length} filled
                  </span>

                  <Button
                    className="btn-accent-gradient px-6"
                    disabled={!hasMinSections}
                    onClick={handleSave}
                  >
                    Add Script
                  </Button>

                </div>
              </>
            )}

          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
}
