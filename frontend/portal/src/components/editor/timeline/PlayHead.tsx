import React from "react";

interface PlayHeadProps {
  displayTime: number;
  pixelsPerSecond: number;
  isDragging: boolean;
  handleScrubberMouseDown: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}

export const PlayHead: React.FC<PlayHeadProps> = ({
  displayTime,
  pixelsPerSecond,
  isDragging,
  handleScrubberMouseDown,
}) => {
  return (
    <div
      className="absolute z-10"
      style={{
        left: `${displayTime * pixelsPerSecond}px`,
        top: 0,
        bottom: 0,
      }}
    >
      {/* Invisible drag area for easier grabbing */}
      <div
        className={`absolute h-full ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{
          width: "32px",
          left: "-16px", // Center the drag area
          top: 0,
          bottom: 0,
        }}
        onMouseDown={handleScrubberMouseDown}
      />

      {/* Visual scrubber line */}
      <div
        className="absolute w-0.5 bg-primary pointer-events-none"
        style={{ top: 0, bottom: 0 }}
      />

      {/* Visual scrubber triangle */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-primary pointer-events-none"
        style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}
      />
    </div>
  );
};
