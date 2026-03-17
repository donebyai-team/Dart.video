import { formatPromptRuleViolations, validatePromptRules } from "../prompt-rule-validator";
import { formatTimingRuleViolations, validateTimingRules } from "../timing-rules-validator";
import { parseValidateRequestBody, validateGeneratedCode } from "../validate-request";

const validComponent = `
export default function RemoteComponent() {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <Stack gap={24} align="center">
          <FadeIn>
            <Text variant="heading">Hello</Text>
          </FadeIn>
          <ScaleIn>
            <div style={{ width: 120, height: 12, borderRadius: 999 }} />
          </ScaleIn>
        </Stack>
      </AbsoluteCenter>
    </SafeArea>
  );
}
`;

function expectSingleRule(code: string, rule: string): void {
  const violations = validatePromptRules(code);
  expect(violations.some((violation) => violation.rule === rule)).toBe(true);
}

describe("validatePromptRules", () => {
  it("accepts a valid canonical component", () => {
    expect(validatePromptRules(validComponent)).toEqual([]);
  });

  it("rejects invalid default export shape", () => {
    expectSingleRule(
      `
export default function NotRemoteComponent(props) {
  return <SafeArea><Stack /></SafeArea>;
}
`,
      "component-contract",
    );
  });

  it("rejects imports", () => {
    expectSingleRule(
      `
import React from "react";
export default function RemoteComponent() {
  return <SafeArea><Stack /></SafeArea>;
}
`,
      "no-imports",
    );
  });

  it("rejects forbidden Remotion API usage", () => {
    expectSingleRule(
      `
export default function RemoteComponent() {
  const frame = useCurrentFrame();
  return <SafeArea><Stack>{frame}</Stack></SafeArea>;
}
`,
      "forbidden-remotion-api",
    );
  });

  it("rejects outermost element not SafeArea", () => {
    expectSingleRule(
      `
export default function RemoteComponent() {
  return <Stack />;
}
`,
      "safe-area-root",
    );
  });

  it("rejects sibling AbsoluteCenter overlap", () => {
    expectSingleRule(
      `
export default function RemoteComponent() {
  return (
    <SafeArea>
      <Stack>
        <AbsoluteCenter axis="both"><FadeIn><Text>One</Text></FadeIn></AbsoluteCenter>
        <AbsoluteCenter axis="both"><FadeIn><Text>Two</Text></FadeIn></AbsoluteCenter>
      </Stack>
    </SafeArea>
  );
}
`,
      "multiple-absolute-center",
    );
  });

  it("rejects nested AbsoluteCenter", () => {
    expectSingleRule(
      `
export default function RemoteComponent() {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <AbsoluteCenter axis="both">
          <FadeIn><Text>Nested</Text></FadeIn>
        </AbsoluteCenter>
      </AbsoluteCenter>
    </SafeArea>
  );
}
`,
      "nested-absolute-center",
    );
  });

  it("rejects layout-like div misuse", () => {
    expectSingleRule(
      `
export default function RemoteComponent() {
  return (
    <SafeArea>
      <div style={{ display: "flex", alignItems: "center" }}>
        <FadeIn><Text>One</Text></FadeIn>
        <FadeIn><Text>Two</Text></FadeIn>
      </div>
    </SafeArea>
  );
}
`,
      "no-layout-div",
    );
  });

  it("rejects transform in style", () => {
    expectSingleRule(
      `
export default function RemoteComponent() {
  return (
    <SafeArea>
      <Stack>
        <FadeIn><div style={{ transform: "translateY(10px)" }} /></FadeIn>
      </Stack>
    </SafeArea>
  );
}
`,
      "no-inline-transform",
    );
  });

  it("rejects absolute positioning", () => {
    expectSingleRule(
      `
export default function RemoteComponent() {
  return (
    <SafeArea>
      <Stack>
        <FadeIn><div style={{ position: "absolute" }} /></FadeIn>
      </Stack>
    </SafeArea>
  );
}
`,
      "no-inline-position",
    );
  });

  it("rejects overflow hidden", () => {
    expectSingleRule(
      `
export default function RemoteComponent() {
  return (
    <SafeArea>
      <Stack>
        <FadeIn><div style={{ overflow: "hidden" }} /></FadeIn>
      </Stack>
    </SafeArea>
  );
}
`,
      "no-overflow-hidden",
    );
  });

  it("rejects percentage widths", () => {
    expectSingleRule(
      `
export default function RemoteComponent() {
  return (
    <SafeArea>
      <Stack>
        <FadeIn><div style={{ width: "50%" }} /></FadeIn>
      </Stack>
    </SafeArea>
  );
}
`,
      "no-percentage-width",
    );
  });

  it("rejects banned typography style keys", () => {
    expectSingleRule(
      `
export default function RemoteComponent() {
  return (
    <SafeArea>
      <Stack>
        <FadeIn><Text style={{ fontSize: 42 }}>Hello</Text></FadeIn>
      </Stack>
    </SafeArea>
  );
}
`,
      "no-inline-fontSize",
    );
  });

  it("rejects hardcoded colors", () => {
    expectSingleRule(
      `
export default function RemoteComponent() {
  return (
    <SafeArea>
      <Stack>
        <FadeIn><div style={{ backgroundColor: "#ff00aa" }} /></FadeIn>
      </Stack>
    </SafeArea>
  );
}
`,
      "no-hardcoded-color",
    );
  });

  it("rejects invalid gap values", () => {
    expectSingleRule(
      `
export default function RemoteComponent() {
  return (
    <SafeArea>
      <Stack gap={10}>
        <FadeIn><Text>Gap</Text></FadeIn>
      </Stack>
    </SafeArea>
  );
}
`,
      "invalid-gap-value",
    );
  });

  it("rejects invalid padding tokens", () => {
    expectSingleRule(
      `
export default function RemoteComponent() {
  return (
    <SafeArea>
      <Stack>
        <FadeIn><div style={{ padding: 10 }} /></FadeIn>
      </Stack>
    </SafeArea>
  );
}
`,
      "invalid-spacing-token",
    );
  });

  it("rejects JSX ternary output", () => {
    expectSingleRule(
      `
export default function RemoteComponent() {
  const show = true;
  return (
    <SafeArea>
      <Stack>{show ? <FadeIn><Text>A</Text></FadeIn> : <FadeIn><Text>B</Text></FadeIn>}</Stack>
    </SafeArea>
  );
}
`,
      "no-jsx-ternary",
    );
  });

  it("rejects JSX && output", () => {
    expectSingleRule(
      `
export default function RemoteComponent() {
  const show = true;
  return (
    <SafeArea>
      <Stack>{show && <FadeIn><Text>A</Text></FadeIn>}</Stack>
    </SafeArea>
  );
}
`,
      "no-jsx-logical-and",
    );
  });

  it("rejects empty animation wrappers", () => {
    expectSingleRule(
      `
export default function RemoteComponent() {
  return (
    <SafeArea>
      <Stack>
        <FadeIn />
      </Stack>
    </SafeArea>
  );
}
`,
      "empty-animation-wrapper",
    );
  });

  it("rejects animation wrappers around empty divs", () => {
    expectSingleRule(
      `
export default function RemoteComponent() {
  return (
    <SafeArea>
      <Stack>
        <FadeIn><div /></FadeIn>
      </Stack>
    </SafeArea>
  );
}
`,
      "empty-div-animation",
    );
  });

  it("accepts LogoAsset with both dimensions", () => {
    const code = `
export default function RemoteComponent() {
  return (
    <SafeArea>
      <Stack>
        <FadeIn><LogoAsset width={100} height={40} /></FadeIn>
      </Stack>
    </SafeArea>
  );
}
`;
    expect(validatePromptRules(code)).toEqual([]);
  });

  it("accepts decorative div usage", () => {
    const code = `
export default function RemoteComponent() {
  return (
    <SafeArea>
      <Stack>
        <FadeIn><div style={{ width: 120, height: 120, borderRadius: 999 }} /></FadeIn>
      </Stack>
    </SafeArea>
  );
}
`;
    expect(validatePromptRules(code)).toEqual([]);
  });
});

describe("request validation helpers", () => {
  it("parses the request body", () => {
    expect(parseValidateRequestBody(JSON.stringify({ code: validComponent, output_path: "foo/bar" }))).toEqual({
      ok: true,
      code: validComponent,
      outputPath: "foo/bar",
    });
  });

  it("returns rule_not_enforced payload for prompt-rule violations", () => {
    const failure = validateGeneratedCode(`
export default function RemoteComponent() {
  return <Stack />;
}
`);

    expect(failure).not.toBeNull();
    expect(failure?.status).toBe(422);
    expect(failure?.payload.error_type).toBe("rule_not_enforced");
    expect(failure?.payload.errors[0]).toContain("[safe-area-root]");
  });

  it("formats violations into LLM-facing error strings", () => {
    const errors = formatPromptRuleViolations(validatePromptRules(`
export default function RemoteComponent() {
  return <Stack />;
}
`));

    expect(errors[0]).toContain("[safe-area-root]");
    expect(errors[0]).toContain("Fix:");
  });

  it("returns framerules_not_enforced payload for timing-rule violations", () => {
    const failure = validateGeneratedCode(`
export default function RemoteComponent() {
  return (
    <SafeArea>
      <Stack>
        <Typewriter text="Hello" mode="char" durationInFrames={6} />
      </Stack>
    </SafeArea>
  );
}
`);

    expect(failure).not.toBeNull();
    expect(failure?.status).toBe(422);
    expect(failure?.payload.error_type).toBe("framerules_not_enforced");
    expect(failure?.payload.errors[0]).toBe("Review the FRAME DURATION RULES and feed the error back");
    expect(failure?.payload.errors[1]).toContain("[typewriter-duration-char]");
  });

  it("formats timing violations into LLM-facing error strings", () => {
    const errors = formatTimingRuleViolations(validateTimingRules(`
export default function RemoteComponent() {
  return (
    <SafeArea>
      <Stack>
        <Typewriter text="Hello world" mode="word" durationInFrames={15} />
      </Stack>
    </SafeArea>
  );
}
`));

    expect(errors[0]).toContain("[typewriter-duration-word]");
  });
});
