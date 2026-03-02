import { SlideType } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { motion } from "framer-motion";
import { ImageIcon, Type, BarChart3, Sparkles, Film, Layers } from "lucide-react";

interface AddSlideMenuProps {
  onAddSlide: (type: SlideType) => void;
  onClose: () => void;
}

const slideTypeOptions: { id: SlideType; name: string; description: string; icon: React.ElementType }[] = [
  { id: SlideType.ANIMATION, name: "Text Animation", description: "Animated typography", icon: Type },
  { id: SlideType.MEDIA, name: "Video Clip", description: "Add video content", icon: Film },
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