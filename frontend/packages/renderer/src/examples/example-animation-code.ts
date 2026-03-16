/**
 * Example LLM-generated animation code.
 *
 * Rules the LLM follows:
 * - No Remotion imports — useCurrentFrame/useVideoConfig are called internally by primitives
 * - No hardcoded colors, px values, or brand references
 * - No styleConfig or theme references — components own all visual decisions
 * - Only semantic props: variant, from/to direction, startAt, durationInFrames, easing
 *
 * Prop reference:
 *   startAt          — absolute frame when the animation begins (default 0)
 *   durationInFrames — how many frames the animation runs (default 30)
 *   easing           — optional override; falls back to StyleContext.motion.<category>
 *
 * Stagger behaviour:
 *   Stagger clones each child injecting startAt = startAt + index * staggerDelay,
 *   so children don't need explicit startAt props.
 *
 * Duration is collected automatically:
 *   Every primitive calls registerEndFrame(startAt + durationInFrames) via DurationCollector.
 *   A probe render wrapped in DurationCollectorProvider collects the max end frame —
 *   see AnimationPreview.tsx for the pattern.
 */
export const EXAMPLE_ANIMATION_CODE = `
export default function RemoteComponent() {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
      <SlideIn>
          <Text id="text-0" variant="heading">A probe render wrapped in DurationCollectorProvider collects the max end</Text>
      </SlideIn>
      </AbsoluteCenter>
    </SafeArea>
  );
}
`;
