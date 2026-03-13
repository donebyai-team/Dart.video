import { transformAnimation, computeAnimationDuration } from "../ast-transform";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip all whitespace for compact comparisons */
function compact(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

// ── Basic cases ───────────────────────────────────────────────────────────────

describe("transformAnimation — basic cases", () => {
  test("returns transformedCode and registry", () => {
    const code = `
      function Animation() {
        return <div style={{ color: "#fff" }}>Hello</div>;
      }
    `;
    const { transformedCode, registry } = transformAnimation(code);
    expect(typeof transformedCode).toBe("string");
    expect(typeof registry).toBe("object");
    expect(transformedCode.length).toBeGreaterThan(0);
  });

  test("injects preamble functions", () => {
    const { transformedCode } = transformAnimation(`function A() { return <div />; }`);
    expect(transformedCode).toContain("function __patch(");
    expect(transformedCode).toContain("function __patchText(");
    expect(transformedCode).toContain("function __patchRange(");
    expect(transformedCode).toContain("function __patchAsset(");
  });

  test("injects data-eid on every JSX element", () => {
    const code = `
      function Animation() {
        return (
          <div>
            <span>text</span>
          </div>
        );
      }
    `;
    const { transformedCode, registry } = transformAnimation(code);
    expect(transformedCode).toContain('"data-eid"');
    expect(Object.keys(registry).length).toBe(2);
    expect(registry["el-1"]).toBeDefined();
    expect(registry["el-2"]).toBeDefined();
  });

  test("EIDs are sequential integers", () => {
    const code = `
      function Animation() {
        return (
          <div>
            <p />
            <span />
          </div>
        );
      }
    `;
    const { registry } = transformAnimation(code);
    const keys = Object.keys(registry).sort();
    expect(keys).toEqual(["el-1", "el-2", "el-3"]);
  });
});

// ── Static styles ─────────────────────────────────────────────────────────────

describe("transformAnimation — static styles", () => {
  test("wraps style object with __patch", () => {
    const { transformedCode } = transformAnimation(`
      function Animation() {
        return <div style={{ color: "#fff", fontSize: 48 }}>Hi</div>;
      }
    `);
    expect(transformedCode).toContain("__patch(");
  });

  test("records static style values in registry", () => {
    const { registry } = transformAnimation(`
      function Animation() {
        return <div style={{ color: "#4f46e5", fontSize: 24 }}>Hi</div>;
      }
    `);
    const entry = registry["el-1"];
    expect(entry).toBeDefined();
    expect(entry.staticStyle.color).toBe("#4f46e5");
    expect(entry.staticStyle.fontSize).toBe(24);
  });

  test("marks static style props as editable with high confidence", () => {
    const { registry } = transformAnimation(`
      function Animation() {
        return <div style={{ color: "#fff" }}>Hi</div>;
      }
    `);
    const entry = registry["el-1"];
    expect(entry.editableProps["color"]).toEqual({
      editable: true,
      confidence: "high",
      staticValue: "#fff",
    });
  });

  test("resolves static variable references in style", () => {
    const { registry } = transformAnimation(`
      function Animation() {
        const cardColor = "#4f46e5";
        return <div style={{ color: cardColor }}>Hi</div>;
      }
    `);
    const entry = registry["el-1"];
    expect(entry.staticStyle.color).toBe("#4f46e5");
  });
});

// ── Animated styles ───────────────────────────────────────────────────────────

describe("transformAnimation — animated styles", () => {
  test("detects interpolate variable and wraps with __patchRange", () => {
    const { transformedCode, registry } = transformAnimation(`
      function Animation() {
        const frame = useCurrentFrame();
        const opacity = interpolate(frame, [0, 30], [0, 1]);
        return <div style={{ opacity }}>Hi</div>;
      }
    `);
    expect(transformedCode).toContain("__patchRange(");
    const entry = registry["el-1"];
    expect(entry.animatedProps.opacity).toBeDefined();
    expect(entry.animatedProps.opacity.type).toBe("interpolate");
    expect(entry.animatedProps.opacity.outputRange).toEqual([0, 1]);
    expect(entry.animatedProps.opacity.frameRange).toEqual([0, 30]);
  });

  test("detects inline interpolate call (hallucination) and wraps it", () => {
    const { transformedCode, registry } = transformAnimation(`
      function Animation() {
        const frame = useCurrentFrame();
        return <div style={{ opacity: interpolate(frame, [0, 30], [0, 1]) }}>Hi</div>;
      }
    `);
    expect(transformedCode).toContain("__patchRange(");
    expect(registry["el-1"].animatedProps.opacity).toBeDefined();
    expect(registry["el-1"].animatedProps.opacity.type).toBe("interpolate");
  });

  test("detects spring variable and wraps config with __patchSpring", () => {
    const { transformedCode, registry } = transformAnimation(`
      function Animation() {
        const frame = useCurrentFrame();
        const { fps } = useVideoConfig();
        const scale = spring({ frame, fps, config: { damping: 10, stiffness: 100 } });
        return <div style={{ transform: scale }}>Hi</div>;
      }
    `);
    expect(transformedCode).toContain("__patchSpring(");
    const entry = registry["el-1"];
    expect(entry.animatedProps.transform).toBeDefined();
    expect(entry.animatedProps.transform.type).toBe("spring");
    expect(entry.animatedProps.transform.config?.damping).toBe(10);
  });
});

// ── Text children ─────────────────────────────────────────────────────────────

describe("transformAnimation — text children", () => {
  test("wraps static string child with __patchText", () => {
    const { transformedCode, registry } = transformAnimation(`
      function Animation() {
        return <div>Hello World</div>;
      }
    `);
    expect(transformedCode).toContain("__patchText(");
    const entry = registry["el-1"];
    expect(entry.textType).toBe("static");
    expect(entry.staticText).toBe("Hello World");
  });

  test("marks animated text as animated, does not wrap", () => {
    const { transformedCode, registry } = transformAnimation(`
      function Animation() {
        const frame = useCurrentFrame();
        const val = interpolate(frame, [0, 100], [0, 100]);
        return <div>{val}</div>;
      }
    `);
    // __patchText("el-..." call should not appear (preamble defines it but doesn't call it for animated text)
    expect(transformedCode).not.toContain('__patchText("el-');
    expect(registry["el-1"].textType).toBe("animated");
  });

  test("marks multiple children as mixed", () => {
    const { registry } = transformAnimation(`
      function Animation() {
        return <div><span>a</span><span>b</span></div>;
      }
    `);
    // el-1 is the outer div with child elements — mixed (not text children)
    // el-2 and el-3 are the spans with single text children
    expect(registry["el-2"].textType).toBe("static");
    expect(registry["el-3"].textType).toBe("static");
  });
});

// ── Image elements ────────────────────────────────────────────────────────────

describe("transformAnimation — image elements", () => {
  test("wraps img src with __patchAsset", () => {
    const { transformedCode, registry } = transformAnimation(`
      function Animation() {
        return <img src="https://example.com/hero.png" />;
      }
    `);
    expect(transformedCode).toContain("__patchAsset(");
    const entry = registry["el-1"];
    expect(entry.assetType).toBe("image");
    expect(entry.staticSrc).toBe("https://example.com/hero.png");
  });
});

// ── Skip elements ─────────────────────────────────────────────────────────────

describe("transformAnimation — skip elements", () => {
  test("does not create registry entry for Sequence", () => {
    const { registry } = transformAnimation(`
      function Animation() {
        return (
          <Sequence from={0} durationInFrames={30}>
            <div>Hi</div>
          </Sequence>
        );
      }
    `);
    // Only the inner div should be in registry, not Sequence
    const keys = Object.keys(registry);
    expect(keys.length).toBe(1);
    expect(registry[keys[0]].elementType).toBe("div");
  });
});

// ── Loop items ────────────────────────────────────────────────────────────────

describe("transformAnimation — loop items", () => {
  test("uses template literal EID for .map() children", () => {
    const { transformedCode, registry } = transformAnimation(`
      function Animation() {
        const items = ["a", "b", "c"];
        return (
          <div>
            {items.map((item, i) => (
              <span key={i}>{item}</span>
            ))}
          </div>
        );
      }
    `);
    // The span should have a template literal eid containing the index variable
    expect(compact(transformedCode)).toContain("el-2-");
    const loopEntry = Object.values(registry).find((e) => e.isLoopItem);
    expect(loopEntry).toBeDefined();
    expect(loopEntry!.isLoopItem).toBe(true);
  });
});

// ── Ternary / edge cases ──────────────────────────────────────────────────────

describe("transformAnimation — ternary and edge cases", () => {
  test("marks ternary style value as low confidence", () => {
    const { registry } = transformAnimation(`
      function Animation() {
        const isActive = true;
        return <div style={{ color: isActive ? "#fff" : "#000" }}>Hi</div>;
      }
    `);
    const entry = registry["el-1"];
    expect(entry.lowConfidence).toContain("color");
    expect(entry.staticStyle.color).toBe("#fff"); // takes consequent as baseline
  });

  test("marks template literal style as non-editable", () => {
    const { registry } = transformAnimation(`
      function Animation() {
        const s = 1.5;
        return <div style={{ transform: \`scale(\${s})\` }}>Hi</div>;
      }
    `);
    const entry = registry["el-1"];
    expect(entry.nonEditable).toContain("transform");
    expect(entry.editableProps.transform?.editable).toBe(false);
  });

  test("returns original code on parse failure", () => {
    const bad = "this is not valid jsx %%%";
    const { transformedCode, registry } = transformAnimation(bad);
    expect(transformedCode).toBe(bad);
    expect(Object.keys(registry).length).toBe(0);
  });

  test("handles empty code gracefully", () => {
    const { transformedCode, registry } = transformAnimation("");
    expect(transformedCode).toBeDefined();
    expect(registry).toBeDefined();
  });
});

// ── SVG handling ──────────────────────────────────────────────────────────────

describe("transformAnimation — SVG", () => {
  test("instruments SVG wrapper but not SVG children", () => {
    const { registry } = transformAnimation(`
      function Animation() {
        return (
          <div>
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" />
              <path d="M10 10 L90 90" />
            </svg>
          </div>
        );
      }
    `);
    const types = Object.values(registry).map((e) => e.elementType);
    expect(types).toContain("div");
    expect(types).toContain("svg");
    // circle and path should NOT be in the registry
    expect(types).not.toContain("circle");
    expect(types).not.toContain("path");
  });
});

// ── computeAnimationDuration ──────────────────────────────────────────────────

const TAIL = 20; // must match TAIL_BUFFER in ast-transform.ts

describe("computeAnimationDuration — primitives", () => {
  test("single FadeIn: startAt + durationInFrames + tail", () => {
    const code = `
      export default function R() {
        return <FadeIn startAt={10} durationInFrames={40}><div>Hi</div></FadeIn>;
      }
    `;
    expect(computeAnimationDuration(code)).toBe(10 + 40 + TAIL);
  });

  test("uses defaults (startAt=0, durationInFrames=30) when props are absent", () => {
    const code = `
      export default function R() {
        return <FadeIn><div>Hi</div></FadeIn>;
      }
    `;
    expect(computeAnimationDuration(code)).toBe(0 + 30 + TAIL);
  });

  test("returns max across multiple primitives", () => {
    const code = `
      export default function R() {
        return (
          <div>
            <SlideIn startAt={0} durationInFrames={25}><span>A</span></SlideIn>
            <FadeIn  startAt={20} durationInFrames={20}><span>B</span></FadeIn>
            <Counter startAt={60} durationInFrames={60} from={0} to={100} />
          </div>
        );
      }
    `;
    // max endFrame = 60+60=120; with tail = 140
    expect(computeAnimationDuration(code)).toBe(60 + 60 + TAIL);
  });

  test("handles SlideIn, ScaleIn, FadeOut, SlideOut, ScaleOut, Typewriter, WordCycle", () => {
    const snippets: [string, number][] = [
      [`<SlideIn   startAt={5}  durationInFrames={15} from="bottom"><div/></SlideIn>`,  5  + 15],
      [`<ScaleIn   startAt={0}  durationInFrames={20}><div/></ScaleIn>`,                0  + 20],
      [`<FadeOut   startAt={30} durationInFrames={10}><div/></FadeOut>`,                30 + 10],
      [`<SlideOut  startAt={40} durationInFrames={10} to="top"><div/></SlideOut>`,      40 + 10],
      [`<ScaleOut  startAt={50} durationInFrames={10}><div/></ScaleOut>`,               50 + 10],
      [`<Typewriter startAt={0} durationInFrames={45} text="hello" />`,                0  + 45],
    ];
    for (const [jsx, expectedEnd] of snippets) {
      const code = `export default function R() { return (${jsx}); }`;
      expect(computeAnimationDuration(code)).toBe(expectedEnd + TAIL);
    }
  });
});

describe("computeAnimationDuration — Stagger", () => {
  test("propagates startAt + staggerDelay to each child", () => {
    // 3 children: last starts at 100 + 2*12 = 124; ends at 124+20 = 144; +tail = 164
    const code = `
      export default function R() {
        return (
          <Stagger startAt={100} staggerDelay={12}>
            <SlideIn durationInFrames={20} from="bottom"><span>A</span></SlideIn>
            <SlideIn durationInFrames={20} from="bottom"><span>B</span></SlideIn>
            <SlideIn durationInFrames={20} from="bottom"><span>C</span></SlideIn>
          </Stagger>
        );
      }
    `;
    expect(computeAnimationDuration(code)).toBe(100 + 2 * 12 + 20 + TAIL);
  });

  test("Stagger with varying child durations uses per-child duration", () => {
    // child 0: 0+0*10+10=10; child 1: 0+1*10+30=40; max=40+tail
    const code = `
      export default function R() {
        return (
          <Stagger startAt={0} staggerDelay={10}>
            <FadeIn durationInFrames={10}><div/></FadeIn>
            <FadeIn durationInFrames={30}><div/></FadeIn>
          </Stagger>
        );
      }
    `;
    expect(computeAnimationDuration(code)).toBe(0 + 1 * 10 + 30 + TAIL);
  });

  test("Stagger uses default staggerDelay=12 when prop is absent", () => {
    const code = `
      export default function R() {
        return (
          <Stagger startAt={50}>
            <FadeIn durationInFrames={20}><div/></FadeIn>
            <FadeIn durationInFrames={20}><div/></FadeIn>
          </Stagger>
        );
      }
    `;
    // child 1: 50 + 1*12 + 20 = 82; +tail = 102
    expect(computeAnimationDuration(code)).toBe(50 + 1 * 12 + 20 + TAIL);
  });
});

describe("computeAnimationDuration — edge cases", () => {
  test("returns 150 when code has no animation primitives", () => {
    const code = `
      export default function R() {
        return <div><span>Hello</span></div>;
      }
    `;
    expect(computeAnimationDuration(code)).toBe(150);
  });

  test("returns 150 on parse failure", () => {
    expect(computeAnimationDuration("%%% not valid jsx %%%")).toBe(150);
  });

  test("full example: matches expected total", () => {
    // Mirrors example-animation-code.ts
    const code = `
      export default function RemoteComponent({ data }) {
        return (
          <SafeArea>
            <AbsoluteCenter axis="both">
              <Stack gap={16} align="center">
                <SlideIn startAt={0}  durationInFrames={25} from="bottom"><div/></SlideIn>
                <FadeIn  startAt={20} durationInFrames={20}><div/></FadeIn>
                <FadeIn  startAt={45} durationInFrames={20}>
                  <Counter startAt={50} durationInFrames={60} from={0} to={17} />
                  <Counter startAt={60} durationInFrames={60} from={0} to={5}  />
                </FadeIn>
                <Stagger startAt={100} staggerDelay={12}>
                  <SlideIn durationInFrames={20} from="bottom"><div/></SlideIn>
                  <SlideIn durationInFrames={20} from="bottom"><div/></SlideIn>
                  <SlideIn durationInFrames={20} from="bottom"><div/></SlideIn>
                  <SlideIn durationInFrames={20} from="bottom"><div/></SlideIn>
                  <SlideIn durationInFrames={20} from="bottom"><div/></SlideIn>
                </Stagger>
              </Stack>
            </AbsoluteCenter>
          </SafeArea>
        );
      }
    `;
    // Stagger: last child = 100 + 4*12 + 20 = 168
    // Counter: 60+60=120
    // max = 168; +tail = 188
    expect(computeAnimationDuration(code)).toBe(168 + TAIL);
  });
});
