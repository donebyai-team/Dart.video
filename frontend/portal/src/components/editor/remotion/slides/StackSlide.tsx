import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { StackAnimationMode, type Slide, type StackSlideContent } from "@/types/slides";

interface StackSlideProps {
  slide: Slide;
  width: number;
  height: number;
  selectedItemId?: string | null;
  isEditing?: boolean;
}

/**
 * StackSlide Component
 * Renders a stack of images with either:
 * - Stack animation: images layer on top with overlap
 * - Reveal animation: images are pre-stacked and revealed one by one
 */
export const StackSlide: React.FC<StackSlideProps> = ({ 
  slide, 
  width, 
  height,
  selectedItemId = null,
  isEditing = false,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const content = slide.content as StackSlideContent | undefined;
  const animationMode = content?.animationMode || StackAnimationMode.Stack;
  const items = content?.items || [];

  // If no items, show placeholder
  if (items.length === 0) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: slide.backgroundColor || "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "white", fontSize: 24, opacity: 0.5 }}>
          Add images to this stack
        </div>
      </AbsoluteFill>
    );
  }

  // Calculate cumulative start frames for each item based on their individual durations
  const itemStartFrames: number[] = [];
  const itemDurationFrames: number[] = [];
  let cumulativeFrames = 0;
  
  items.forEach((item) => {
    itemStartFrames.push(cumulativeFrames);
    const itemFrames = Math.round((item.duration || 0) * fps);
    itemDurationFrames.push(itemFrames);
    cumulativeFrames += itemFrames;
  });

  // When editing and an item is selected, show only that item
  const selectedItemIndex = selectedItemId 
    ? items.findIndex((item: Slide) => item.id === selectedItemId)
    : -1;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: slide.backgroundColor || "#0f172a",
      }}
    >
      {items.map((item, index) => {
        // In editing mode with a selected item, only show that item
        if (isEditing && selectedItemId && selectedItemIndex !== -1) {
          if (index !== selectedItemIndex) {
            return null; // Don't render non-selected items
          }
        }
        
        const itemStartFrame = itemStartFrames[index];
        const itemDuration = itemDurationFrames[index];
        
        // Get image source from item's content
        // NEW ARCHITECTURE: Image slides have src directly in content
        const itemContent = item.content as any;
        const imageSrc = itemContent?.src || "";

        if (animationMode === StackAnimationMode.Stack) {
          // Stack mode: images fly in from bottom and stack with slight offset
          
          // In editing mode, show the selected item in its final position
          const progress = isEditing && selectedItemId 
            ? 1 
            : interpolate(
                frame,
                [itemStartFrame, itemStartFrame + itemDuration * 0.8],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.out(Easing.back(1.2)),
                }
              );

          const translateY = interpolate(progress, [0, 1], [height, 0]);
          const opacity = interpolate(progress, [0, 0.3, 1], [0, 1, 1]);
          const scale = interpolate(progress, [0, 1], [0.9, 1]);

          // Offset for stacking effect
          const itemCount = items.length;
          const offsetX = (itemCount - 1 - index) * 15;
          const offsetY = (itemCount - 1 - index) * 15;

          return (
            <AbsoluteFill
              key={item.id}
              style={{
                transform: `translateY(${translateY}px) translateX(${offsetX}px) translateY(${offsetY}px) scale(${scale})`,
                opacity,
                zIndex: index,
              }}
            >
              <img
                src={imageSrc}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: 8,
                  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
                }}
              />
            </AbsoluteFill>
          );
        } else {
          // Reveal mode: all images stacked, revealed one by one
          
          // For reveal, we start from top (last item) and reveal downwards
          const itemCount = items.length;
          const revealIndex = itemCount - 1 - index;
          const revealStartFrame = itemStartFrames[revealIndex];
          const revealDuration = itemDurationFrames[revealIndex];

          const clipProgress = isEditing && selectedItemId
            ? 1 // In editing mode, show fully revealed
            : interpolate(
                frame,
                [revealStartFrame, revealStartFrame + revealDuration * 0.6],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.out(Easing.cubic),
                }
              );

          // Clip from top to bottom for reveal effect
          const clipTop = interpolate(clipProgress, [0, 1], [100, 0]);

          // Offset for stacking effect
          const offsetX = (itemCount - 1 - index) * 12;
          const offsetY = (itemCount - 1 - index) * 12;

          return (
            <AbsoluteFill
              key={item.id}
              style={{
                transform: `translateX(${offsetX}px) translateY(${offsetY}px)`,
                zIndex: index,
                clipPath: `inset(${clipTop}% 0 0 0)`,
              }}
            >
              <img
                src={imageSrc}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: 8,
                  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
                }}
              />
            </AbsoluteFill>
          );
        }
      })}
    </AbsoluteFill>
  );
};

export default StackSlide;
