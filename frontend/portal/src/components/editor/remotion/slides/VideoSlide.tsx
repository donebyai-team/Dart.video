import React from "react";
import { AbsoluteFill, Img, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Slide, VideoSlideContent, SpotlightEffect as SpotlightEffectType } from "@/types/slides";
import { SpotlightEffect } from "../effects/SpotlightEffect";

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
  const videoContent = slide.content as VideoSlideContent | undefined;
  const effects = slide.effects || [];
  const spotlights = effects.filter((e) => e.type === "spotlight") as SpotlightEffectType[];

  // Get video source from content (new architecture) or fallback to old structure
  const videoSrc = videoContent?.src || (videoContent as any)?.video?.src || "";

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
      {spotlights.map((spotlight) => (
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
