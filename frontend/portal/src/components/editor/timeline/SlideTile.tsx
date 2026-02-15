import { cn } from "@/lib/utils";
import type { SlideItem } from "./types";

interface SlideTileProps {
  slideItem: SlideItem;
  isSelected: boolean;
  isHighlighted: boolean;
  pixelsPerSecond: number;
  onClick: () => void;
  onHover: (info: { name: string; timeRange: string } | null) => void;
}

export function SlideTile({
  slideItem,
  isSelected,
  isHighlighted,
  pixelsPerSecond,
  onClick,
  onHover,
}: SlideTileProps) {
  const width = slideItem.duration * pixelsPerSecond;
  const left = slideItem.startTime * pixelsPerSecond;

  const handleMouseEnter = () => {
    const endTime = slideItem.startTime + slideItem.duration;
    onHover({
      name: slideItem.label,
      timeRange: `${slideItem.startTime.toFixed(1)}s - ${endTime.toFixed(1)}s`,
    });
  };

  const handleMouseLeave = () => {
    onHover(null);
  };

  // Helper to lighten/darken color for gradient
  const adjustColor = (color: string, percent: number) => {
    // Simple approach: add transparency for darkening
    return color + Math.round(255 * (1 - percent / 100)).toString(16).padStart(2, '0');
  };

  return (
    <div
      className={cn(
        "absolute top-0 h-8 cursor-pointer transition-all overflow-hidden",
        "border border-white/20 shadow-sm",
        "hover:shadow-md hover:scale-[1.02] hover:z-10",
        isHighlighted && "opacity-100 shadow-lg",
        !isHighlighted && "opacity-60",
        isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background shadow-lg"
      )}
      style={{
        left: `${left}px`,
        width: `${width}px`,
        background: `linear-gradient(135deg, ${slideItem.color} 0%, ${adjustColor(slideItem.color, 15)} 100%)`,
      }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="h-full flex items-center justify-center px-2 text-xs font-semibold text-white truncate drop-shadow-sm">
        {slideItem.label}
      </div>
    </div>
  );
}
