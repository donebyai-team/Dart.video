import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SlideType } from "@/types/slides";

interface SlideTypeOption {
  id: SlideType;
  name: string;
  description?: string;
  icon: React.ElementType;
}

interface AddSlideButtonProps {
  slideTypes: SlideTypeOption[];
  onAddSlide: (type: SlideType) => void;
  disabled?: boolean;
  variant?: "button" | "inline";
  className?: string;
}

const AddSlideButton = ({ 
  slideTypes, 
  onAddSlide, 
  disabled = false,
  variant = "button",
  className = ""
}: AddSlideButtonProps) => {
  if (variant === "inline") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={disabled}
            className={`w-full flex items-center justify-center gap-1 py-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          >
            <Plus className="w-3 h-3" />
            Add slide
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48 bg-popover">
          {slideTypes.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => onAddSlide(option.id)}
              className="gap-2"
            >
              <option.icon className="w-4 h-4" />
              <div>
                <p className="text-sm font-medium">{option.name}</p>
                {option.description && (
                  <p className="text-[10px] text-muted-foreground">{option.description}</p>
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`w-full gap-2 ${className}`}
          disabled={disabled}
        >
          <Plus className="w-3 h-3" />
          Add Slide
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-48">
        {slideTypes.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => onAddSlide(option.id)}
            className="gap-2"
          >
            <option.icon className="w-4 h-4" />
            <span>{option.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AddSlideButton;
