import React from "react";
import { useVideoConfig, AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Slide, Section, TransitionType, SlideType } from "@/types/slides";
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
        return <TextAnimationSlide slide={slide} width={width} height={height} isEditing={isEditing} isSelected={isSelected} onSelect={onSelect} onUpdate={onUpdate} />;
      case SlideType.VISUAL_ANIMATION:
        return <VisualAnimationSlide slide={slide} width={width} height={height} isEditing={isEditing} isSelected={isSelected} onSelect={onSelect} onUpdate={onUpdate} />;
      case SlideType.INFOGRAPHIC:
        return <InfographicSlide slide={slide} width={width} height={height} isEditing={isEditing} isSelected={isSelected} onSelect={onSelect} onUpdate={onUpdate} />;
      case SlideType.VIDEO:
        return <VideoSlide slide={slide} width={width} height={height} />;
      case SlideType.STACK:
        return <StackSlide slide={slide} width={width} height={height} selectedItemId={selectedStackItemId} isEditing={isEditing} />;
      case SlideType.IMAGE:
      default:
        return <ImageSlide slide={slide} width={width} height={height} isEditing={isEditing} onUpdate={onUpdate} />;
    }
  };

// Get transition presentation based on transition type
const getTransitionPresentation = (transitionType?: TransitionType) => {
  switch (transitionType) {
    case TransitionType.FADE:
      return fade();
    case TransitionType.SLIDE_LEFT:
      return slide({ direction: "from-right" }); // Enter from right
    case TransitionType.SLIDE_RIGHT:
      return slide({ direction: "from-left" }); // Enter from left
    case TransitionType.SLIDE_UP:
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

  return (
    <AbsoluteFill style={{ background: globalBackgroundColor || 'transparent' }}>
      <TransitionSeries>
        {allSlides.map((slide, index) => {
          const isSelected = selectedTemplateId === slide.id;

          // Simple rule: slide duration = slide's actual duration
          const actualDuration = getActualSlideDuration(slide);
          const durationInFrames = Math.round(actualDuration * fps);

          // Check if this slide has a transition defined
          const hasTransition = slide.transition && slide.transition !== TransitionType.NONE;

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
