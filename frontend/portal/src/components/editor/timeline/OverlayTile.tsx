import { cn } from "@/lib/utils";
import type { OverlayItem } from "./types";
import { getOverlayName } from "./OverlayTracks";

interface OverlayTileProps {
  overlayItem: OverlayItem;
  isSelected: boolean;
  isHighlighted: boolean;
  pixelsPerSecond: number;
  onClick: () => void;
  onHover: (info: { name: string; timeRange: string } | null) => void;
}

export function OverlayTile({
  overlayItem,
  isSelected,
  isHighlighted,
  pixelsPerSecond,
  onClick,
  onHover,
}: OverlayTileProps) {
  const width = overlayItem.duration * pixelsPerSecond;
  const left = overlayItem.startTime * pixelsPerSecond;

  const handleMouseEnter = () => {
    const endTime = overlayItem.startTime + overlayItem.duration;
    onHover({
      name: `${overlayItem.overlayType}`,
      timeRange: `${overlayItem.startTime.toFixed(1)}s - ${endTime.toFixed(1)}s`,
    });
  };

  const handleMouseLeave = () => {
    onHover(null);
  };

  return (
    <div
      className={cn(
        "absolute top-0 h-8 rounded cursor-pointer transition-all",
        "bg-gradient-to-r from-violet-500/70 to-purple-500/70",
        "border border-violet-400/40 shadow-sm",
        "hover:from-violet-500/90 hover:to-purple-500/90",
        "hover:border-violet-400/60 hover:shadow-md hover:scale-[1.02]",
        isHighlighted && "opacity-100 shadow-md",
        !isHighlighted && "opacity-60",
        isSelected && "ring-2 ring-violet-400 ring-offset-1 ring-offset-background shadow-lg"
      )}
      style={{
        left: `${left}px`,
        width: `${width}px`,
      }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="px-2 py-1 text-xs font-semibold text-white truncate drop-shadow-sm">
        {getOverlayName(overlayItem.overlayType)}
      </div>
    </div>
  );
}
