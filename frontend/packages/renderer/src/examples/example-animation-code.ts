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
export default function RemoteComponent({ data }) {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <Stack gap={16} align="center">

          <SlideIn startAt={0} durationInFrames={25} from="bottom">
            <Text variant="display">Phase 2 Complete</Text>
          </SlideIn>

          <FadeIn startAt={20} durationInFrames={20}>
            <Text variant="subheading">Animation system built on primitives</Text>
          </FadeIn>

          <FadeIn startAt={45} durationInFrames={20}>
            <Row gap={32} align="center">
              <Stack gap={4} align="center">
                <Counter
                  startAt={50}
                  durationInFrames={60}
                  from={0}
                  to={17}
                  suffix=" components"
                  variant="heading"
                />
                <Text variant="label">registered</Text>
              </Stack>

              <Stack gap={4} align="center">
                <Counter
                  startAt={60}
                  durationInFrames={60}
                  from={0}
                  to={5}
                  suffix=" types"
                  variant="heading"
                />
                <Text variant="label">animation types</Text>
              </Stack>
            </Row>
          </FadeIn>

           <Stack gap={32} align="center">
            <Stagger startAt={100} staggerDelay={12}>
              <SlideIn durationInFrames={20} from="bottom">
                <Text variant="label"> Tokens and Theming</Text>
              </SlideIn>
              <SlideIn durationInFrames={20} from="bottom">
                <Text variant="label">✓ Layout Primitives</Text>
              </SlideIn>
              <SlideIn durationInFrames={20} from="bottom">
                <Text variant="label">✓ Animation Primitives</Text>
              </SlideIn>
              <SlideIn durationInFrames={20} from="bottom">
                <Text variant="label">✓ Content Primitives</Text>
              </SlideIn>
              <SlideIn durationInFrames={20} from="bottom">
                <Text variant="label">✓ Compiler Integration</Text>
              </SlideIn>
            </Stagger>
          </Stack>

        </Stack>
      </AbsoluteCenter>
    </SafeArea>
  );
}
`;
