import React, { useEffect } from "react";
import { Layers, Eye, X, Play, ImageIcon, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import SortableSlideCard from "@/components/editor/SortableSlideCard";
import AddSlideButton from "@/components/editor/AddSlideButton";
import { Slide, Section, StackAnimationMode, StackSlideContent, SlideType } from "@coasterai/pb/coasterai/core/v1/slide_pb";

interface StackSlideSettingsProps {
  slide: Slide;
  section: Section;
  onUpdateSlide: (updates: Partial<Slide>) => void;
  onSelectItem?: (itemId: string) => void;
  selectedItemId?: string | null;
  onClose?: () => void;
  onPreview?: () => void;
}

const animationModes: {
  id: StackAnimationMode;
  name: string;
  description: string;
}[] = [{
  id: StackAnimationMode.STACK,
  name: "Stack",
  description: "Images animate by stacking on top with overlap"
}, {
  id: StackAnimationMode.REVEAL,
  name: "Reveal",
  description: "Images already stacked, revealed one by one"
}];
const MIN_ITEMS = 2;
const MAX_ITEMS = 4;

const StackSlideSettings: React.FC<StackSlideSettingsProps> = ({
  slide,
  onUpdateSlide,
  onSelectItem,
  selectedItemId,
  onClose,
  onPreview
}) => {
  const content = slide.content.value as StackSlideContent | undefined;
  const items = content?.items || [];
  const animationMode = content?.animationMode || StackAnimationMode.STACK;

  const stackSlideTypes = [
    { id: SlideType.IMAGE, name: "Image/Screenshot", description: "Add screen with annotations", icon: ImageIcon },
    { id: SlideType.VIDEO, name: "Video Clip", description: "Add video content", icon: Film },
  ];

  // Auto-select first item if nothing is selected
  useEffect(() => {
    if (items.length > 0 && !selectedItemId) {
      onSelectItem?.(items[0].id);
    }
  }, [items, selectedItemId, onSelectItem]);

  const updateContent = (updates: Partial<StackSlideContent>) => {
//     onUpdateSlide({
//       content: {
//         case: "image",
//         value: {
// $typeName: "coasterai.core.v1.ImageSlideContent",
//         animationMode: content?.animationMode || StackAnimationMode.STACK,
//         items: content?.items || [],
//         }      
//         ...updates
//       }
//     });
  };

  const addItem = (type: SlideType) => {
    if (items.length >= MAX_ITEMS) return;
    if (type !== SlideType.IMAGE && type !== SlideType.VIDEO) return;

    const newItem: Slide = {
      id: `${slide.id}-item-${Date.now()}`,
      type,
      transcript: `Slide ${items.length + 1}`,
      duration: 2.5,
      $typeName: "coasterai.core.v1.Slide",
      annotations: [],
      subSlides: [],
      effects: [],
      backgroundColor: slide.backgroundColor,
      content: type === SlideType.IMAGE ? {
        case: "image",
        value: {
          $typeName: "coasterai.core.v1.ImageSlideContent",
          src: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop",
          x: 192,
          y: 108,
          width: 1536,
          height: 864,
          rotation: 0,
        }
      } : {
        case: "video",
        value: {
          $typeName: "coasterai.core.v1.VideoSlideContent",
          src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        }
      },
    };
    updateContent({
      items: [...items, newItem]
    });
    // Auto-select the newly added item
    setTimeout(() => {
      onSelectItem?.(newItem.id);
    }, 0);
  };

  const removeItem = (itemId: string) => {
    if (items.length <= MIN_ITEMS) return;
    updateContent({
      items: items.filter(i => i.id !== itemId)
    });
  };

  const updateItemImage = (itemId: string, imageSrc: string) => {
    updateContent({
      items: items.map((i: Slide) => i.id === itemId ? {
        ...i,
        content: {
          ...(i.content as any),
          src: imageSrc
        }
      } as Slide : i)
    });
  };
  const setAnimationMode = (mode: StackAnimationMode) => {
    updateContent({
      animationMode: mode
    });
  };
  return <div className="h-full flex flex-col bg-card">
    {/* Header */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Stack Settings</h3>
      </div>
      {onClose && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>

    {/* Content */}
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* Slides Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Slides
          </Label>
          <span className="text-[10px] text-muted-foreground">
            {items.length}/{MAX_ITEMS}
          </span>
        </div>

        <div className="space-y-2">
          {items.map((item: Slide, index: number) => {
            return (
              <div key={item.id}>
                <SortableSlideCard
                  slide={item}
                  isSelected={selectedItemId === item.id}
                  index={index}
                  onSelect={() => onSelectItem?.(item.id)}
                  onDelete={() => removeItem(item.id)}
                />
              </div>
            );
          })}
        </div>

        {/* Add Slide Button */}
        <AddSlideButton
          slideTypes={stackSlideTypes}
          onAddSlide={addItem}
          disabled={items.length >= MAX_ITEMS}
          variant="button"
        />

        <p className="text-[10px] text-muted-foreground text-center">
          Min {MIN_ITEMS} / Max {MAX_ITEMS} slides
        </p>

        {/* Image Upload for selected item */}
        {selectedItemId && items.find((i: Slide) => i.id === selectedItemId) && (
          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-xs font-medium">Image</Label>
            <div className="space-y-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = URL.createObjectURL(file);
                    updateItemImage(selectedItemId, url);
                  }
                }}
                className="h-10 text-xs cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Animation Section */}
      <div className="space-y-3">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Animation
        </Label>

        <div className="grid grid-cols-2 gap-2">
          {animationModes.map(mode => <button key={mode.id} onClick={() => setAnimationMode(mode.id)} className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${animationMode === mode.id ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/50"}`}>
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${animationMode === mode.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {mode.id === StackAnimationMode.STACK ? <Layers className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </div>
            <span className="text-xs font-medium">{mode.name}</span>
          </button>)}
        </div>

        <p className="text-[10px] text-muted-foreground">
          {animationModes.find(m => m.id === animationMode)?.description}
        </p>

        {/* Preview Button */}
        {onPreview && (
          <Button
            variant="default"
            size="sm"
            className="w-full gap-2"
            onClick={onPreview}
          >
            <Play className="w-3 h-3" />
            Preview Animation
          </Button>
        )}
      </div>
    </div>
  </div>;
};
export default StackSlideSettings;