import React from "react";
import { useVideoConfig, AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import {
  ImageSlide,
  VideoSlide,
  TextAnimationSlide,
  VisualAnimationSlide,
  InfographicSlide,
  StackSlide,
} from "./remotion/slides";
import { getActualSlideDuration, TRANSITION_DURATION_SECONDS } from "./frame_calculations";
import { useVideoStore } from "@/stores/video";
import { Slide, SlideType, TransitionType } from "@coasterai/pb/coasterai/core/v1/slide_pb";

interface SlideshowProps {
  fps: number;
  isEditing?: boolean;
  onSelectTemplate?: (slideId: string) => void;
}

// Main slide component router
const SlideComponent: React.FC<{
  slide: Slide;
  width: number;
  height: number;
  isEditing?: boolean;
  isSelected?: boolean;
  selectedStackItemId?: string | null;
  onSelect?: () => void;
}> = ({
  slide,
  width,
  height,
  isEditing = false,
  isSelected = false,
  selectedStackItemId = null,
  onSelect,
}) => {

    const onUpdate = useVideoStore(s => s.updateSlide);
    switch (slide.type) {
      case SlideType.TEXT_ANIMATION:
        // Only render if content case matches or is undefined (for new slides)
        if (!slide.content?.case || slide.content.case === "animation") {
          return <TextAnimationSlide slide={slide} width={width} height={height} isEditing={isEditing} isSelected={isSelected} onSelect={onSelect} onUpdate={onUpdate} />;
        }
        break;
      case SlideType.VISUAL_ANIMATION:
        if (!slide.content?.case || slide.content.case === "animation") {
          return <VisualAnimationSlide slide={slide} width={width} height={height} isEditing={isEditing} isSelected={isSelected} onSelect={onSelect} onUpdate={onUpdate} />;
        }
        break;
      case SlideType.INFOGRAPHIC:
        if (!slide.content?.case || slide.content.case === "animation") {
          return <InfographicSlide slide={slide} width={width} height={height} isEditing={isEditing} isSelected={isSelected} onSelect={onSelect} onUpdate={onUpdate} />;
        }
        break;
      case SlideType.VIDEO:
        if (!slide.content?.case || slide.content.case === "video") {
          return <VideoSlide slide={slide} width={width} height={height} />;
        }
        break;
      case SlideType.STACK:
        if (!slide.content?.case || slide.content.case === "stack") {
          return <StackSlide slide={slide} width={width} height={height} selectedItemId={selectedStackItemId} isEditing={isEditing} />;
        }
        break;
      case SlideType.IMAGE:
      default:
        if (!slide.content?.case || slide.content.case === "image") {
          return <ImageSlide slide={slide} width={width} height={height} isEditing={isEditing} onUpdate={onUpdate} />;
        }
        break;
    }

    // Fallback for mismatched content - render a placeholder
    return (
      <AbsoluteFill style={{
        backgroundColor: slide.backgroundColor || "#0f172a",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: 18,
        opacity: 0.7
      }}>
        Content type mismatch: {slide.type} slide with {slide.content?.case || 'undefined'} content
      </AbsoluteFill>
    );
  };

// Get transition presentation based on transition type
const getTransitionPresentation = (transitionType?: TransitionType) => {
  switch (transitionType) {
    case TransitionType.TRANSITION_FADE:
      return fade();
    case TransitionType.TRANSITION_SLIDE_LEFT:
      return slide({ direction: "from-right" }); // Enter from right
    case TransitionType.TRANSITION_SLIDE_RIGHT:
      return slide({ direction: "from-left" }); // Enter from left
    case TransitionType.TRANSITION_SLIDE_UP:
      return slide({ direction: "from-bottom" }); // Enter from bottom
    default:
      return fade();
  }
};

/**
 * REMOTION TRANSITION CALCULATIONS (2026)
 * Based on TransitionSeries overlapping behavior:
 * - Slides overlap during transitions
 * - Total duration = Sum of slides - Sum of transitions
 * - Visual End = Last frame before transition starts
 * - Absolute End = Very last frame slide exists
 */

// Main slideshow composition using Remotion's TransitionSeries
export const Slideshow: React.FC<SlideshowProps> = ({
  fps,
  isEditing = false,
  onSelectTemplate,
}) => {
  const sections = useVideoStore(s => s.sections);
  const globalBackgroundColor = useVideoStore(s => s.globalBackgroundColor);
  const selectedStackItemId = useVideoStore(s => s.selectedStackItemId);
  const selectedTemplateId = null;

  const { width, height } = useVideoConfig();

  const allSlides = sections.flatMap(section => section.slides);
  const transitionDurationFrames = Math.round(fps * TRANSITION_DURATION_SECONDS);

  // Handle empty slides case
  if (allSlides.length === 0) {
    return (
      <AbsoluteFill style={{ 
        background: globalBackgroundColor || 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: 24,
        opacity: 0.5
      }}>
        No slides to display
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: globalBackgroundColor || 'transparent' }}>
      <TransitionSeries>
        {allSlides.map((slide) => {
          const isSelected = selectedTemplateId === slide.id;

          // Simple rule: slide duration = slide's actual duration
          const actualDuration = getActualSlideDuration(slide);
          const durationInFrames = Math.round(actualDuration * fps);

          // Check if this slide has a transition defined
          const hasTransition = slide.transition !== TransitionType.TRANSITION_NONE;

          // Determine slide background: use slide's backgroundColor if set, otherwise transparent (so global shows through)
          const slideWithBackground = globalBackgroundColor && !slide.backgroundColor
            ? { ...slide, backgroundColor: 'transparent' }
            : slide;

          return (
            <React.Fragment key={slide.id}>
              <TransitionSeries.Sequence durationInFrames={durationInFrames}>
                <SlideComponent
                  slide={slideWithBackground}
                  width={width}
                  height={height}
                  isEditing={isEditing}
                  isSelected={isSelected}
                  selectedStackItemId={slide.type === SlideType.STACK ? selectedStackItemId : null}
                  onSelect={() => {
                    onSelectTemplate?.(slide.id)
                  }}
                />
              </TransitionSeries.Sequence>
              {hasTransition && (
                <TransitionSeries.Transition
                  presentation={getTransitionPresentation(slide.transition)}
                  timing={linearTiming({ durationInFrames: transitionDurationFrames })}
                />
              )}
            </React.Fragment>
          );
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};

export default Slideshow;
