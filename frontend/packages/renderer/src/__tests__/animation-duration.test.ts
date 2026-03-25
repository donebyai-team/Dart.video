import {
  computeAnimationDurationFromCode,
  FALLBACK_DURATION_IN_FRAMES,
  FALLBACK_SETTLED_FRAME,
  getDeclaredSettledFrame,
  isValidDeclaredSettledFrame,
} from "../code_rules_validators/animation-duration";
import { computeAnimationDurationFromCodeV2 } from "../code_rules_validators/animation-duration-v2";
import { getComponentRegistration, getComponentTimingDefaults } from "@coasterai/animation";

describe("declared settledFrame", () => {
  it("reads an exported numeric settledFrame", () => {
    expect(
      getDeclaredSettledFrame(`
export const settledFrame = 84;
export default function RemoteComponent() {
  return <SafeArea><Stack /></SafeArea>;
}
`),
    ).toBe(84);
  });

  it("accepts sane declared settledFrame values", () => {
    expect(isValidDeclaredSettledFrame(84)).toBe(true);
    expect(isValidDeclaredSettledFrame(0)).toBe(false);
    expect(isValidDeclaredSettledFrame(300)).toBe(false);
  });
});

describe("computeAnimationDurationFromCode", () => {
  it("uses primitive default durations in the AST fallback", () => {
    expect(
      computeAnimationDurationFromCode(`
export default function RemoteComponent() {
  return (
    <SafeArea>
      <Typewriter text="Hello" />
    </SafeArea>
  );
}
`),
    ).toEqual({ settledFrame: 60, durationInFrames: 80 });
  });

  it("uses clean stagger defaults in the AST fallback", () => {
    expect(
      computeAnimationDurationFromCode(`
export default function RemoteComponent() {
  return (
    <SafeArea>
      <Stagger>
        <FadeIn><Text>One</Text></FadeIn>
        <FadeIn durationInFrames={20}><Text>Two</Text></FadeIn>
      </Stagger>
    </SafeArea>
  );
}
`),
    ).toEqual({ settledFrame: 32, durationInFrames: 52 });
  });

  it("computes the product update example with current prop names", () => {
    expect(
      computeAnimationDurationFromCode(`
export const settledFrame = 190;

export default function RemoteComponent() {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <Stack gap={24} align="center" style={{ maxWidth: 860 }}>
          <FadeIn startAt={0} durationInFrames={20}>
            <Text variant="heading">Q4 2024 — Product Update</Text>
          </FadeIn>

          <SlideIn startAt={26} durationInFrames={25} from="bottom">
            <Text variant="display">What we shipped</Text>
          </SlideIn>

          <FadeIn startAt={57} durationInFrames={20}>
            <Row gap={48} align="center">
              <Stack gap={8} align="center">
                <Counter to={47} startAt={63} durationInFrames={60} suffix="%" variant="caption" />
                <Text variant="caption">faster builds</Text>
              </Stack>
              <Stack gap={8} align="center">
                <Counter to={9800} startAt={73} durationInFrames={60} suffix="+" variant="caption" />
                <Text variant="caption">new users</Text>
              </Stack>
              <Stack gap={8} align="center">
                <Counter to={99} startAt={83} durationInFrames={60} suffix="%" variant="caption" />
                <Text variant="caption">uptime</Text>
              </Stack>
            </Row>
          </FadeIn>

          <TimelineGate showAfter={130}>
            <Stagger startAt={130} staggerDelay={10}>
              <SlideIn durationInFrames={20} from="bottom">
                <Text variant="body">Rebuilt the compiler pipeline from scratch</Text>
              </SlideIn>
              <SlideIn durationInFrames={20} from="bottom">
                <Text variant="body">Shipped zero-downtime deploys</Text>
              </SlideIn>
              <SlideIn durationInFrames={20} from="bottom">
                <Text variant="body">Reduced p99 latency by 340ms</Text>
              </SlideIn>
              <SlideIn durationInFrames={20} from="bottom">
                <Text variant="body">Launched the new dashboard</Text>
              </SlideIn>
              <SlideIn durationInFrames={20} from="bottom">
                <Text variant="body">Open sourced the core runtime</Text>
              </SlideIn>
            </Stagger>
          </TimelineGate>
        </Stack>
      </AbsoluteCenter>
    </SafeArea>
  );
}
`),
    ).toEqual({ settledFrame: 190, durationInFrames: 210 });
  });
});

describe("duration contract", () => {
  it("reads fixed primitive defaults from registry schema", () => {
    expect(getComponentTimingDefaults("Typewriter")).toEqual({
      startAt: 0,
      durationInFrames: 60,
    });
  });

  it("exports fallback constants for validator reuse", () => {
    expect(FALLBACK_SETTLED_FRAME).toBe(130);
    expect(FALLBACK_DURATION_IN_FRAMES).toBe(150);
  });
});

describe("computeAnimationDurationFromCodeV2", () => {
  it("calculates duration using component registry for TextStagger", () => {
    const result = computeAnimationDurationFromCodeV2(`
export default function RemoteComponent() {
  return (
    <SafeArea>
      <TextStagger text="Hello World Test" />
    </SafeArea>
  );
}
`);
    
    // TextStagger with 3 words: (3-1) * 5 + 15 = 25 frames
    // Total with tail buffer: 25 + 20 = 45
    expect(result.settledFrame).toBe(25);
    expect(result.durationInFrames).toBe(45);
    expect(result.errors).toBeUndefined();
  });

  it("returns validation errors for invalid component props", () => {
    const result = computeAnimationDurationFromCodeV2(`
export default function RemoteComponent() {
  return (
    <SafeArea>
      <TextStagger text="" />
      <AnimatedNumber startText="Count" endText="items" to={100} from={100} />
    </SafeArea>
  );
}
`);
    
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
    // Should have errors for empty text and to === from
    expect(result.errors?.some(e => e.component === "TextStagger")).toBe(true);
    expect(result.errors?.some(e => e.component === "AnimatedNumber")).toBe(true);
  });
});
