import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Slide, ImageSlideContent, SpotlightEffect as SpotlightEffectType } from "@/types/slides";
import { SpotlightEffect } from "../effects/SpotlightEffect";
import { ImageContent } from "./ImageContent";

interface ImageSlideProps {
  slide: Slide;
  width: number;
  height: number;
  isEditing?: boolean;
  onUpdate?: (updates: Partial<Slide>) => void;
}

/**
 * ImageSlide Component (NEW ARCHITECTURE)
 * Renders an image slide with:
 * - Resizable/movable image content
 * - Canvas-level spotlight effects
 * - Separate from annotations (handled by CanvasOverlay)
 */
export const ImageSlide: React.FC<ImageSlideProps> = ({
  slide,
  width,
  height,
  isEditing = false,
  onUpdate,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Extract content and effects directly
  const imageContent = slide.content as ImageSlideContent | undefined;
  const effects = slide.effects || [];
  const spotlights = effects.filter((e) => e.type === "spotlight") as SpotlightEffectType[];

  // Create image object for ImageContent component
  // NEW ARCHITECTURE: Image properties are directly in content (no template_config)
  const imageData = imageContent ? {
    src: imageContent.src || '',
    x: imageContent.x ?? 0,
    y: imageContent.y ?? 0,
    width: imageContent.width ?? width,
    height: imageContent.height ?? height,
    rotation: imageContent.rotation ?? 0,
  } : null;

  // Create resolution object from dimensions
  const resolution = {
    id: `${width}x${height}`,
    name: "Custom",
    aspect: `${width}/${height}`,
    width,
    height,
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: slide.backgroundColor || "#0f172a",
      }}
    >
      {/* Render image content (resizable/draggable in edit mode) */}
      {imageData && (
        <ImageContent
          image={imageData}
          resolution={resolution}
          isEditing={isEditing}
          onUpdate={(updates) => {
            if (onUpdate && imageContent) {
              onUpdate({
                content: {
                  type: "image",
                  src: imageContent.src,
                  ...updates
                } as ImageSlideContent
              });
            }
          }}
        />
      )}

      {/* Render spotlight effects at CANVAS level */}
      {spotlights.map((spotlight) => (
        <SpotlightEffect
          key={spotlight.id}
          spotlight={spotlight}
          frame={frame}
          fps={fps}
          width={width}           // Canvas dimensions
          height={height}         // Canvas dimensions
          fullWidth={width}
          fullHeight={height}
          slideDuration={slide.duration}
        />
      ))}
    </AbsoluteFill>
  );
};

export default ImageSlide;
