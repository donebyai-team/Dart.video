import React from "react";

interface PlayHeadProps {
  currentTime: number;
  pixelsPerSecond: number;
}

export const PlayHead: React.FC<PlayHeadProps> = ({ currentTime, pixelsPerSecond }) => {
  return (
    <div
      className="absolute z-10 pointer-events-none"
      style={{ left: `${currentTime * pixelsPerSecond}px`, top: 0, bottom: 0 }}
    >
      {/* Scrubber line */}
      <div className="absolute w-0.5 bg-primary" style={{ top: 0, bottom: 0 }} />
      {/* Scrubber triangle */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-primary"
        style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}
      />
    </div>
  );
};
