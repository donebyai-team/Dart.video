import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface AnimatedBackgroundProps {
  width: number;
  height: number;
  particleCount?: number;
  color?: string;
}

/**
 * AnimatedBackground Component
 * Renders animated background particles that float upward
 * Used across all slide types for visual consistency
 */
export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  width,
  height,
  particleCount = 3,
  color = "rgba(99, 102, 241, 0.08)",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {[...Array(particleCount)].map((_, i) => {
        const delay = i * 10;
        const opacity = interpolate(
          frame - delay,
          [0, 20, durationInFrames - 10, durationInFrames],
          [0, 0.08, 0.08, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const y = interpolate(frame, [0, durationInFrames], [height, -100]);
        
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${20 + i * 25}%`,
              top: y,
              width: 150 + i * 40,
              height: 150 + i * 40,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
              opacity,
            }}
          />
        );
      })}
    </div>
  );
};

export default AnimatedBackground;
