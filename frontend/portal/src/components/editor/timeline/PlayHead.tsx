import React from "react";

interface PlayHeadProps {
  currentTime: number;
  pixelsPerSecond: number;
  isDragging?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
}

export const PlayHead: React.FC<PlayHeadProps> = ({
  currentTime,
  pixelsPerSecond,
  isDragging = false,
  onMouseDown,
}) => {
  return (
    <div
      className="absolute z-10"
      style={{ left: `${currentTime * pixelsPerSecond}px`, top: 0, bottom: 0 }}
    >
      {/* Invisible drag handle — wider than the visual line for easier grabbing */}
      <div
        className={`absolute h-full ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ width: "24px", left: "-12px", top: 0, bottom: 0 }}
        onMouseDown={onMouseDown}
      />
      {/* Visual line */}
      <div className="absolute w-0.5 bg-primary pointer-events-none" style={{ top: 0, bottom: 0 }} />
      {/* Triangle handle */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-primary pointer-events-none"
        style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}
      />
    </div>
  );
};
