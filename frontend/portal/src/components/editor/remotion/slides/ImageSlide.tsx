import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { SpotlightEffectComponent } from "../effects/SpotlightEffect";
import { ImageContent } from "./ImageContent";
import { Slide, ImageSlideContent, SpotlightEffect, SlideEffect } from "@coasterai/pb/coasterai/core/v1/slide_pb";

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
  const imageContent = slide.content.value as ImageSlideContent
  const effects = slide.effects || [];
  const spotlightEffects = effects.flatMap((e: SlideEffect) => {
    if (e.effect.case === "spotlight" && e.effect.value) {
      return [e.effect.value];
    }
    return [];
  });


  // Create image object for ImageContent component
  // NEW ARCHITECTURE: Image properties are directly in content (no template_config)
  const imageData = imageContent ? {
    src: imageContent.src || '',
    x: imageContent.x ?? 0,
    y: imageContent.y ?? 0,
    width: imageContent.width as number ?? width,
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
                  case: "image",
                  "value": {
                    src: imageContent.src,
                    ...updates
                  } as ImageSlideContent
                }
              });
            }
          }}
        />
      )}

      {/* Render spotlight effects at CANVAS level */}
      {spotlightEffects.map((spotlight) => (
        <SpotlightEffectComponent
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
