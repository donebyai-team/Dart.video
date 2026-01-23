import React from "react";
import { interpolate, spring } from "remotion";

// Animation variants - LARGE geometric elements

export const RotatingSquares: React.FC<{ frame: number; durationInFrames: number }> = ({ frame, durationInFrames }) => {
  const rotation = interpolate(frame, [0, durationInFrames], [0, 180]);

  return (
    <>
      {[0, 45, 90].map((offset, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 280 - i * 60,
            height: 280 - i * 60,
            border: `4px solid rgba(255,255,255,${0.7 - i * 0.15})`,
            borderRadius: 24,
            transform: `rotate(${rotation + offset}deg)`,
            boxShadow: `0 0 40px rgba(255,255,255,${0.2 - i * 0.05})`,
          }}
        />
      ))}
    </>
  );
};

export const PulsingCircles: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  return (
    <>
      {[...Array(4)].map((_, i) => {
        const delay = i * 12;
        const pulse = spring({
          frame: (frame - delay + 100) % 60,
          fps,
          config: { damping: 20, stiffness: 80 },
        });
        const scale = interpolate(pulse, [0, 1], [0.5, 2.5]);
        const opacity = interpolate(pulse, [0, 1], [0.6, 0]);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 180,
              height: 180,
              borderRadius: "50%",
              border: "4px solid rgba(255,255,255,0.7)",
              transform: `scale(${scale})`,
              opacity,
            }}
          />
        );
      })}
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: "50%",
          backgroundColor: "rgba(255,255,255,0.85)",
          boxShadow: "0 0 60px rgba(255,255,255,0.5)",
        }}
      />
    </>
  );
};

export const FloatingShapes: React.FC<{ frame: number; durationInFrames: number }> = ({ frame, durationInFrames }) => {
  const shapes = [
    { x: -180, y: 120, size: 80, delay: 0 },
    { x: 180, y: -100, size: 70, delay: 10 },
    { x: 0, y: 180, size: 60, delay: 5 },
    { x: -140, y: -160, size: 90, delay: 15 },
    { x: 220, y: 100, size: 55, delay: 8 },
  ];

  return (
    <>
      {shapes.map((shape, i) => {
        const float = Math.sin((frame + shape.delay) * 0.1) * 25;
        const rotation = interpolate(frame, [0, durationInFrames], [0, 360 * (i % 2 === 0 ? 1 : -1)]);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${shape.x}px)`,
              top: `calc(50% + ${shape.y + float}px)`,
              width: shape.size,
              height: shape.size,
              backgroundColor: "rgba(255,255,255,0.35)",
              borderRadius: i % 2 === 0 ? "50%" : 12,
              transform: `rotate(${rotation}deg)`,
              boxShadow: "0 0 30px rgba(255,255,255,0.2)",
            }}
          />
        );
      })}
      {/* Center element */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          border: "4px solid rgba(255,255,255,0.5)",
          boxShadow: "0 0 50px rgba(255,255,255,0.3)",
        }}
      />
    </>
  );
};

export const GrowingBars: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const bars = [
    { height: 200, color: "rgba(255,255,255,0.85)", delay: 0 },
    { height: 300, color: "rgba(255,255,255,0.7)", delay: 5 },
    { height: 150, color: "rgba(255,255,255,0.8)", delay: 10 },
    { height: 250, color: "rgba(255,255,255,0.6)", delay: 15 },
  ];

  return (
    <div style={{ display: "flex", gap: 40, alignItems: "flex-end" }}>
      {bars.map((bar, i) => {
        const grow = spring({
          frame: frame - bar.delay,
          fps,
          config: { damping: 12, stiffness: 60 },
        });
        const height = interpolate(grow, [0, 1], [0, bar.height]);

        return (
          <div
            key={i}
            style={{
              width: 60,
              height,
              backgroundColor: bar.color,
              borderRadius: 12,
              boxShadow: "0 0 40px rgba(255,255,255,0.3)",
            }}
          />
        );
      })}
    </div>
  );
};

export const OrbitingDots: React.FC<{ frame: number; durationInFrames: number }> = ({ frame, durationInFrames }) => {
  const dots = 8;
  const radius = 180;

  return (
    <>
      {[...Array(dots)].map((_, i) => {
        const angle = interpolate(frame, [0, durationInFrames], [0, Math.PI * 2]) + (i * Math.PI * 2) / dots;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${x}px - 16px)`,
              top: `calc(50% + ${y}px - 16px)`,
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: `rgba(255,255,255,${0.9 - i * 0.08})`,
              boxShadow: "0 0 20px rgba(255,255,255,0.4)",
            }}
          />
        );
      })}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          border: "4px solid rgba(255,255,255,0.7)",
          boxShadow: "0 0 50px rgba(255,255,255,0.3)",
        }}
      />
    </>
  );
};
