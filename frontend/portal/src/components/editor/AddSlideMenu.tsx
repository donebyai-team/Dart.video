import { motion } from "framer-motion";
import { ImageIcon, Type, BarChart3, Sparkles, Film, Layers } from "lucide-react";
import { SlideType } from "@/types/slides";

interface AddSlideMenuProps {
  onAddSlide: (type: SlideType) => void;
  onClose: () => void;
}

const slideTypeOptions: { id: SlideType; name: string; description: string; icon: React.ElementType }[] = [
  { id: SlideType.IMAGE, name: "Image/Screenshot", description: "Add screen with annotations", icon: ImageIcon },
  { id: SlideType.TEXT_ANIMATION, name: "Text Animation", description: "Animated typography", icon: Type },
  { id: SlideType.INFOGRAPHIC, name: "Infographic", description: "Data-driven visuals", icon: BarChart3 },
  { id: SlideType.VISUAL_ANIMATION, name: "Visual Animation", description: "AI-generated motion graphics", icon: Sparkles },
  { id: SlideType.VIDEO, name: "Video Clip", description: "Add video content", icon: Film },
  { id: SlideType.STACK, name: "Stack", description: "Layered image animations", icon: Layers },
];

const AddSlideMenu = ({ onAddSlide, onClose }: AddSlideMenuProps) => {
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-full left-0 right-0 mb-1 z-50 bg-card border border-border rounded-lg shadow-xl p-2"
      >
        <div className="space-y-0.5">
          {slideTypeOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                onAddSlide(option.id);
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors text-left"
            >
              <option.icon className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{option.name}</p>
                <p className="text-[10px] text-muted-foreground">{option.description}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </>
  );
};

export default AddSlideMenu;