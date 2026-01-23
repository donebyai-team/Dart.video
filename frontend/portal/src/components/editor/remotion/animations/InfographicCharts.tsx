import React from "react";
import { interpolate, spring } from "remotion";

// Infographic chart components for data visualization

export const AnimatedBarChart: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const bars = [
    { height: 280, color: "#3b82f6" },
    { height: 400, color: "#10b981" },
    { height: 200, color: "#f97316" },
    { height: 320, color: "#8b5cf6" },
    { height: 240, color: "#ec4899" },
  ];

  return (
    <div style={{ display: "flex", gap: 36, alignItems: "flex-end" }}>
      {bars.map((bar, i) => {
        const delay = i * 6;
        const grow = spring({
          frame: frame - delay,
          fps,
          config: { damping: 12, stiffness: 60 },
        });
        const height = interpolate(grow, [0, 1], [0, bar.height]);

        return (
          <div
            key={i}
            style={{
              width: 80,
              height,
              background: `linear-gradient(180deg, ${bar.color}, ${bar.color}88)`,
              borderRadius: "12px 12px 0 0",
              boxShadow: `0 0 50px ${bar.color}66`,
            }}
          />
        );
      })}
    </div>
  );
};

export const AnimatedPieChart: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const progress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 50 },
  });

  const segments = [
    { percent: 35, color: "#3b82f6" },
    { percent: 25, color: "#10b981" },
    { percent: 20, color: "#f97316" },
    { percent: 20, color: "#8b5cf6" },
  ];

  let currentAngle = -90;

  return (
    <svg width="400" height="400" viewBox="0 0 400 400">
      {segments.map((segment, i) => {
        const angle = (segment.percent / 100) * 360 * progress;
        const startAngle = currentAngle;
        currentAngle += angle;

        const startRad = (startAngle * Math.PI) / 180;
        const endRad = ((startAngle + angle) * Math.PI) / 180;

        const x1 = 200 + 160 * Math.cos(startRad);
        const y1 = 200 + 160 * Math.sin(startRad);
        const x2 = 200 + 160 * Math.cos(endRad);
        const y2 = 200 + 160 * Math.sin(endRad);

        const largeArc = angle > 180 ? 1 : 0;

        return (
          <path
            key={i}
            d={`M 200 200 L ${x1} ${y1} A 160 160 0 ${largeArc} 1 ${x2} ${y2} Z`}
            fill={segment.color}
            style={{ filter: `drop-shadow(0 0 20px ${segment.color}88)` }}
          />
        );
      })}
      <circle cx="200" cy="200" r="80" fill="#0f172a" />
    </svg>
  );
};

export const AnimatedLineGraph: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const progress = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 40 },
  });

  const points = [
    { x: 0, y: 160 },
    { x: 100, y: 120 },
    { x: 200, y: 180 },
    { x: 300, y: 80 },
    { x: 400, y: 140 },
    { x: 500, y: 40 },
  ];

  const pathData = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const pathLength = 800;

  return (
    <svg width="560" height="240" viewBox="-20 0 560 240">
      {/* Grid lines */}
      {[60, 120, 180].map((y) => (
        <line key={y} x1="0" y1={y} x2="500" y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
      ))}

      {/* Line */}
      <path
        d={pathData}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={pathLength}
        strokeDashoffset={pathLength * (1 - progress)}
        style={{ filter: "drop-shadow(0 0 15px #3b82f6aa)" }}
      />

      {/* Dots */}
      {points.map((p, i) => {
        const dotProgress = spring({
          frame: frame - i * 5,
          fps,
          config: { damping: 15, stiffness: 100 },
        });

        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={12 * dotProgress}
            fill="#3b82f6"
            style={{ filter: "drop-shadow(0 0 12px #3b82f6)" }}
          />
        );
      })}
    </svg>
  );
};
