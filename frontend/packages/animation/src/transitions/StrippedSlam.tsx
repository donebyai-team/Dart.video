import React from 'react';
import { TransitionPresentation } from "@remotion/transitions";
import { AbsoluteFill, interpolate } from "remotion";
import { useTheme } from '../theme';

export function TransitionStripedSlam(
  stripes = 5
): TransitionPresentation<Record<string, never>> {
  const component = ({
    presentationProgress,
    presentationDirection,
    children,
  }: {
    presentationProgress: number;
    presentationDirection: "entering" | "exiting";
    children: React.ReactNode;
    passedProps: Record<string, never>;
  }) => {
    const theme = useTheme();
    const primaryColor = theme.colors.primary;

    if (presentationDirection === "entering") {
      return (
        <AbsoluteFill
          style={{
            opacity: presentationProgress >= 1 ? 1 : 0,
          }}
        >
          {children}
        </AbsoluteFill>
      );
    }

    const bars = Array.from({ length: stripes }, (_, i) => {
      const h = 100 / stripes;

      const MIN_LIGHT = 0.3;
      const MAX_LIGHT = 0.75;

      const t = i / (stripes - 1);
      const lightAmount = MIN_LIGHT + t * (MAX_LIGHT - MIN_LIGHT);
      const color = mixWithWhite(primaryColor, lightAmount);

      const fromLeft = i % 2 === 0;
      const stagger = (i / stripes) * 0.3;
      const p = Math.max(
        0,
        Math.min(1, (presentationProgress - stagger) / (1 - stagger))
      );
      const pe = 1 - Math.pow(1 - p, 3);

      const x = fromLeft
        ? interpolate(pe, [0, 1], [-112, 0])
        : interpolate(pe, [0, 1], [112, 0]);

      return (
        <div
          key={i}
          style={{
            position: "absolute",
            top: `${i * h}%`,
            left: 0,
            width: "112%",
            height: `${h + 0.4}%`,
            background: color,
            transform: `translateX(${x}%)`,
            pointerEvents: "none",
          }}
        />
      );
    });

    return (
      <AbsoluteFill style={{ isolation: "isolate" }}>
        <AbsoluteFill style={{ zIndex: 0 }}>{children}</AbsoluteFill>
        <AbsoluteFill style={{ zIndex: 1, pointerEvents: "none" }}>
          {bars}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  };

  return { component, props: {} };
}

export const mixWithWhite = (hex: string, amount: number) => {
  const num = parseInt(hex.replace("#", ""), 16);

  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;

  r = Math.round(r + (255 - r) * amount);
  g = Math.round(g + (255 - g) * amount);
  b = Math.round(b + (255 - b) * amount);

  return `rgb(${r}, ${g}, ${b})`;
};
