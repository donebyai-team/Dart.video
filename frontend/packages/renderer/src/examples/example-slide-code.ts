/**
 * Example code string as served from a slide's templateUrl.
 *
 * This is the raw TSX code that AnimationSlide fetches from a URL,
 * compiles via compileRemoteComponent(), and renders inside its
 * provider stack (ThemeProvider → AspectPresetProvider → StyleContextProvider).
 *
 * Key points:
 *   - No frame/fps props — primitives call useCurrentFrame() / useVideoConfig() internally
 *   - Props: startAt, durationInFrames, easing (matching remotion-ui pattern)
 *   - Stagger passes startAt to each child via cloneElement; no prop drilling needed
 *   - All colors/fonts/motion fall back to StyleContext — LLM only controls timing/content
 *
 * How it gets compiled (compiler.ts pipeline):
 *   1. stripImports()         — removes all import/export statements
 *   2. assignPrimitiveIds()   — injects id="slidein-0" etc. (see example-element-registry.json)
 *   3. babelTransform()       — JSX + TypeScript → plain JS
 *   4. new Function(scope)    — evaluates in shared scope with all primitives injected
 */
export const EXAMPLE_SLIDE_CODE = `
export default function RemoteComponent({ data }) {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <Stack gap={16} align="center">

          <SlideIn startAt={0} durationInFrames={25} from="bottom">
            <Text variant="display">{data?.heading ?? 'Phase 1 Complete'}</Text>
          </SlideIn>

          <FadeIn startAt={20} durationInFrames={20}>
            <Text variant="subheading">{data?.subheading ?? 'Animation system built on primitives'}</Text>
          </FadeIn>

          <FadeIn startAt={45} durationInFrames={20}>
            <Row gap={32} align="center">
              <Stack gap={4} align="center">
                <Counter
                  startAt={50}
                  durationInFrames={60}
                  from={0}
                  to={data?.stat1 ?? 17}
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
                  to={data?.stat2 ?? 5}
                  suffix=" types"
                  variant="heading"
                />
                <Text variant="label">animation types</Text>
              </Stack>
            </Row>
          </FadeIn>

          <TimelineGate showAfter={100}>
            <Stagger startAt={100} staggerDelay={12}>
              <SlideIn durationInFrames={20} from="bottom">
                <Text variant="label">✓ Tokens and Theming</Text>
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
          </TimelineGate>

        </Stack>
      </AbsoluteCenter>
    </SafeArea>
  );
}
`;
