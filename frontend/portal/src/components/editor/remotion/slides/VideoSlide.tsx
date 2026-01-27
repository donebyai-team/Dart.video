import { Slide, SlideEffect, VideoSlideContent } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import React from "react";
import { AbsoluteFill, Img, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SpotlightEffect } from "../effects";

interface VideoSlideProps {
  slide: Slide;
  width: number;
  height: number;
  isEditing?: boolean;
  onUpdate?: (updates: Partial<Slide>) => void;
}

/**
 * VideoSlide Component (NEW ARCHITECTURE)
 * Renders a video slide with:
 * - Video content (always fills canvas)
 * - Canvas-level spotlight effects
 * - Play button overlay
 */
export const VideoSlide: React.FC<VideoSlideProps> = ({
  slide,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 100 },
  });

  // Extract content and effects directly
  const videoContent = slide.content.value as VideoSlideContent;
  // Get video source from content (new architecture) or fallback to old structure
  const videoSrc = videoContent?.src

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
      }}
    >
      {/* Video fills canvas (no resizing/positioning) */}
      <div
        style={{
          opacity,
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        <Img
          src={videoSrc}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>

      {/* Render spotlight effects at CANVAS level */}
      {slide.spotlights.map((spotlight) => (
        <SpotlightEffect
          key={spotlight.id}
          spotlight={spotlight}
          frame={frame}
          fps={fps}
          width={width}       // Canvas dimensions
          height={height}     // Canvas dimensions
          fullWidth={width}
          fullHeight={height}
          slideDuration={slide.duration}
        />
      ))}

      {/* Play button overlay */}
      <div
        style={{
          position: "absolute",
          width: 80,
          height: 80,
          borderRadius: "50%",
          backgroundColor: "rgba(255,255,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(10px)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "30px solid white",
            borderTop: "18px solid transparent",
            borderBottom: "18px solid transparent",
            marginLeft: 8,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export default VideoSlide;
