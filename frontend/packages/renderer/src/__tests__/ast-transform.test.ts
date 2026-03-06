import { transformAnimation } from "../ast-transform";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip all whitespace for compact comparisons */
function compact(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

/** Count occurrences of a substring */
function count(s: string, sub: string) {
  return (s.match(new RegExp(sub.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;
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
