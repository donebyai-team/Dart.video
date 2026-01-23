import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Slide } from "@/types/slides";
import {
  RotatingSquares,
  PulsingCircles,
  FloatingShapes,
  GrowingBars,
  OrbitingDots,
} from "../animations/VisualAnimationVariants";
import { AnimatedBackground } from "../effects/AnimatedBackground";
import { TemplateContainer } from "../components/TemplateContainer";

interface VisualAnimationSlideProps {
  slide: Slide;
  width: number;
  height: number;
  isEditing?: boolean;
  isSelected?: boolean;
  onUpdate?: (updates: Partial<Slide>) => void;
  onSelect?: () => void;
}

/**
 * VisualAnimationSlide Component
 * Renders simple motion graphics (no text) with various geometric animations
 * Uses slide.content.template_id to determine which animation variant to render
 * Currently uses hash-based selection, but will be replaced with template_id lookup
 */
export const VisualAnimationSlide: React.FC<VisualAnimationSlideProps> = ({
  slide,
  width,
  height,
  isEditing = false,
  isSelected = false,
  onUpdate,
  onSelect,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const content = slide.content as any;
  const templateId = content?.template_id || "visual-default";
  const templateConfig = content?.template_config || {};

  // TODO: Use templateId to select animation variant
  // For now, use hash-based selection for backward compatibility
  const hash = slide.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variant = hash % 5;

  // Use slide's background color or fall back to default
  const defaultGradients = [
    "linear-gradient(135deg, #581c87 0%, #7c3aed 50%, #4f46e5 100%)",
    "linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)",
    "linear-gradient(135deg, #134e4a 0%, #14b8a6 100%)",
    "linear-gradient(135deg, #7f1d1d 0%, #ef4444 50%, #f97316 100%)",
    "linear-gradient(135deg, #713f12 0%, #f59e0b 100%)",
  ];
  const background = slide.backgroundColor || defaultGradients[variant];

  return (
    <AbsoluteFill
      style={{
        background,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Animated background particles */}
      <AnimatedBackground width={width} height={height} />

      {/* Template content in container */}
      <TemplateContainer
        x={templateConfig.x}
        y={templateConfig.y}
        width={templateConfig.width}
        height={templateConfig.height}
        canvasWidth={width}
        canvasHeight={height}
        isEditing={isEditing}
        isSelected={isSelected}
        onUpdate={(updates) => {
          if (onUpdate && content) {
            onUpdate({
              content: {
                ...content,
                template_config: {
                  ...templateConfig,
                  ...updates,
                },
              },
            });
          }
        }}
        onSelect={onSelect}
      >
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {variant === 0 && <RotatingSquares frame={frame} durationInFrames={durationInFrames} />}
          {variant === 1 && <PulsingCircles frame={frame} fps={fps} />}
          {variant === 2 && <FloatingShapes frame={frame} durationInFrames={durationInFrames} />}
          {variant === 3 && <GrowingBars frame={frame} fps={fps} />}
          {variant === 4 && <OrbitingDots frame={frame} durationInFrames={durationInFrames} />}
        </div>
      </TemplateContainer>
    </AbsoluteFill>
  );
};

export default VisualAnimationSlide;
