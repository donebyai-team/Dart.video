import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface AddSlideButtonProps {
  onAddSlide: () => void;
  disabled?: boolean;
  variant?: "button" | "inline" | "between";
  className?: string;
}

const AddSlideButton = ({
  onAddSlide,
  disabled = false,
  variant = "button",
  className = ""
}: AddSlideButtonProps) => {
  if (variant === "between") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
            className={`relative z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium transition-colors bg-muted hover:bg-muted/80 text-muted-foreground mr-1 ${className}`}
          >
            <Plus className="w-2.5 h-2.5" />
            Add scene
          </button>
        </DropdownMenuTrigger>        
      </DropdownMenu>
    );
  }

  if (variant === "inline") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={() => onAddSlide()}
            disabled={disabled}
            className={`w-full flex items-center justify-center gap-1 py-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          >
            <Plus className="w-3 h-3" />
            Add scene
          </button>
        </DropdownMenuTrigger>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddSlide()}
          className={`w-full gap-2 ${className}`}
          disabled={disabled}
        >
          <Plus className="w-3 h-3" />
          Add Slide
        </Button>
      </DropdownMenuTrigger>
    </DropdownMenu>
  );
};

export default AddSlideButton;
