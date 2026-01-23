import { cn } from "@/lib/utils";
import type { TransitionItem } from "./types";

interface TransitionTileProps {
  transitionItem: TransitionItem;
  pixelsPerSecond: number;
  onClick: () => void;
  onHover: (info: { name: string; timeRange: string } | null) => void;
}

export function TransitionTile({
  transitionItem,
  pixelsPerSecond,
  onClick,
  onHover,
}: TransitionTileProps) {
  const width = transitionItem.duration * pixelsPerSecond;
  const left = transitionItem.startTime * pixelsPerSecond;

  const handleMouseEnter = () => {
    const endTime = transitionItem.startTime + transitionItem.duration;
    onHover({
      name: `Transition: ${transitionItem.transitionType}`,
      timeRange: `${transitionItem.startTime.toFixed(1)}s - ${endTime.toFixed(1)}s`,
    });
  };

  const handleMouseLeave = () => {
    onHover(null);
  };

  return (
    <div
      className={cn(
        "absolute top-0 h-12 cursor-pointer transition-all",
        "bg-gradient-to-r from-primary/30 via-primary/40 to-primary/30",
        "border-l-2 border-r-2 border-primary/50",
        "hover:from-primary/40 hover:via-primary/50 hover:to-primary/40",
        "hover:border-primary/70 hover:shadow-md",
        "backdrop-blur-sm"
      )}
      style={{
        left: `${left}px`,
        width: `${width}px`,
      }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-primary-foreground/90 font-medium">→</div>
      </div>
    </div>
  );
}
