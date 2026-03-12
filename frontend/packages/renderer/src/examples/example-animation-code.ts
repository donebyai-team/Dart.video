/**
 * Example LLM-generated animation code.
 *
 * Rules the LLM follows:
 * - No Remotion imports, no useCurrentFrame, no interpolate
 * - No hardcoded colors, px values, or brand references
 * - No styleConfig or theme references — components own all visual decisions
 * - Only semantic component props: variant, direction, delay, duration, etc.
 */
export const EXAMPLE_ANIMATION_CODE = `
export default function RemoteComponent({ frame }) {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <Stack gap={16} align="center">

          <SlideIn frame={frame} delay={0} duration={25} direction="up">
            <Text variant="display">Phase 2 Complete</Text>
          </SlideIn>

          <FadeIn frame={frame} delay={20} duration={20}>
            <Text variant="subheading">Animation system built on primitives</Text>
          </FadeIn>

          <FadeIn frame={frame} delay={45} duration={20}>
            <Row gap={32} align="center">
              <Stack gap={4} align="center">
                <Counter
                  frame={frame}
                  delay={50}
                  duration={60}
                  from={0}
                  to={17}
                  suffix=" components"
                  variant="heading"
                />
                <Text variant="label">registered</Text>
              </Stack>

              <Stack gap={4} align="center">
                <Counter
                  frame={frame}
                  delay={60}
                  duration={60}
                  from={0}
                  to={5}
                  suffix=" types"
                  variant="heading"
                />
                <Text variant="label">animation types</Text>
              </Stack>
            </Row>
          </FadeIn>

          <FadeIn frame={frame} delay={100} duration={15}>
            <Stagger frame={frame} startAt={100}>
              <SlideIn frame={frame} duration={20} direction="up">
                <Text variant="label">✓ Tokens and Theming</Text>
              </SlideIn>
              <SlideIn frame={frame} duration={20} direction="up">
                <Text variant="label">✓ Layout Primitives</Text>
              </SlideIn>
              <SlideIn frame={frame} duration={20} direction="up">
                <Text variant="label">✓ Animation Primitives</Text>
              </SlideIn>
              <SlideIn frame={frame} duration={20} direction="up">
                <Text variant="label">✓ Content Primitives</Text>
              </SlideIn>
              <SlideIn frame={frame} duration={20} direction="up">
                <Text variant="label">✓ Compiler Integration</Text>
              </SlideIn>
            </Stagger>
          </FadeIn>

        </Stack>
      </AbsoluteCenter>
    </SafeArea>
  );
}
`;
