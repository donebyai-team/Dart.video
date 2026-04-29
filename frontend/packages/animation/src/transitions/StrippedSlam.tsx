import React from 'react';
import { TransitionPresentation } from "@remotion/transitions";
import { AbsoluteFill, interpolate } from "remotion";
import { useTheme } from '../theme';
import { RemotionTransitionDirection } from './common';

export function TransitionStripedSlam(
  stripes = 5,
  direction: RemotionTransitionDirection
): TransitionPresentation<{ direction?: RemotionTransitionDirection }> {
  const component = ({
    presentationProgress,
    presentationDirection,
    children,
    passedProps,
  }: {
    presentationProgress: number;
    presentationDirection: "entering" | "exiting";
    children: React.ReactNode;
    passedProps: { direction?: RemotionTransitionDirection };
  }) => {
    const theme = useTheme();
    const primaryColor = theme.colors.primary;
    const motionDirection = passedProps.direction ?? direction;
    const isVerticalMotion =
      motionDirection === 'from-top' || motionDirection === 'from-bottom';

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

      const t = stripes <= 1 ? 0 : i / (stripes - 1);
      const lightAmount = MIN_LIGHT + t * (MAX_LIGHT - MIN_LIGHT);
      const color = mixWithWhite(primaryColor, lightAmount);

      const stagger = isVerticalMotion ? 0 : (i / stripes) * 0.3;
      const p = Math.max(
        0,
        Math.min(1, (presentationProgress - stagger) / (1 - stagger))
      );
      const pe = 1 - Math.pow(1 - p, 3);
      const transform = getStripedSlamTransform(motionDirection, i, pe, stripes);

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
            transform,
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

  return { component, props: { direction } };
}

const getStripedSlamTransform = (
  direction: RemotionTransitionDirection,
  index: number,
  progress: number,
  stripes: number
) => {
  const alternatingFromStart = index % 2 === 0;
  const verticalTravel = Math.max(112, stripes * 112);

  switch (direction) {
    case 'from-left':
      return `translateX(${interpolate(progress, [0, 1], [-112, 0])}%)`;
    case 'from-right':
      return `translateX(${interpolate(progress, [0, 1], [112, 0])}%)`;
    case 'from-top':
      return `translateY(${interpolate(progress, [0, 1], [-verticalTravel, 0])}%)`;
    case 'from-bottom':
      return `translateY(${interpolate(progress, [0, 1], [verticalTravel, 0])}%)`;
    default:
      return alternatingFromStart
        ? `translateX(${interpolate(progress, [0, 1], [-112, 0])}%)`
        : `translateX(${interpolate(progress, [0, 1], [112, 0])}%)`;
  }
};

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
