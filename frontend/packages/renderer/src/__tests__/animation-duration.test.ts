
import { computeAnimationDurationFromCodeV2 } from "../code_rules_validators/animation-duration-v2";

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
