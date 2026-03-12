# 01 — Architecture

→ This spec covers system goals, monorepo structure, and the runtime contract.
→ For tokens and theming: see 02-tokens-and-theming.md
→ For components: see 03-component-library.md

---

## Goals

1. LLM generates pure React. No Remotion imports, no `useCurrentFrame`, no `interpolate`, no `spring`.
2. A curated, typed, schema-validated component library is the only interface between the LLM and the animation runtime.
3. Every component has a Zod schema. Schemas drive prompt generation, editor toolbars, prop patching, and type safety.
4. A style and theme system allows users to switch the visual language of any animation instantly, without regeneration.
5. All LLM-generated prop values are patchable. Edits are stored as a non-destructive overlay. Original code is never modified.
6. Animation duration is computed automatically. User can adjust speed or individual element timing.
7. The component library is organized by animation type. Prompt injection is driven by animation type.
8. Built as a monorepo with independent, reusable packages exposed as providers.
9. Component swaps are supported for known, explicitly defined cases only.
10. Animations can be promoted to reusable templates.
11. A contributor guide defines how to add primitives, scenes, themes, and styles.

---

## Monorepo Package Structure
Expose as a separate workspace pnpm package which the portal or renderer can use
```
frontend/packages/
  animation/
    src/
      primitives/      — FadeIn, FadeOut, SlideIn, SlideOut, ScaleIn, ScaleOut, Stagger, TimelineGate
      layout/          — SafeArea, Stack, Row, AbsoluteCenter, FramePreset
      content/         — Text, Counter, Typewriter, WordCycle
      scenes/          — TitleCard, StatBlock, LowerThird, PhoneFrame, BrowserWindow
      headless/        — BarChartLogic, ProgressLogic, LineChartLogic, FlowLinesLogic
      themes/
      tokens/          — Presets, Styles, ColorTokens, TypographyTokens, SpacingTokens,   token values, StyleContext, resolveStyle, style presets, easing resolver
      registry/        — component registry, Zod schemas, animation type definitions
      prompt/          — getAnimationPrompt, prompt fragment generator
      patches/         — patch types, patch application, reconcileEdits
      duration/        — DurationCollector, probe render, speedFactor
      editor/          — editor hooks, swap rules, toolbar schema derivation
      assets/          — manifest types, useAsset hook, preloader
    index.ts           — public exports
    package.json
```

Each package is independently importable. No circular dependencies. Each exposes a provider or a set of pure functions.
```

### TypeScript standards (all packages)

- `strict: true`, `noImplicitAny`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`
- Zero ESLint warnings — `@typescript-eslint`, `react-hooks`, `jsx-a11y`
- All component props have exported types and JSDoc comments
- No side effects on import. Components are pure. No global state.

---

## Runtime Contract

The root composition is never LLM-generated. It is responsible for:

1. Resolving style and theme into StyleConfig
2. Wrapping the generated component in all required providers
3. Injecting props into the generated component
4. Running the probe render to compute duration
5. Passing durationInFrames to the Remotion Composition

### Provider wrapping order

```
FramePreset (outermost — sets dimensions, clips overflow)
  AspectPresetContext.Provider (provides width, height, safeArea)
    StyleContext.Provider (provides resolved StyleConfig)
      DurationCollector.Provider (enables probe render)
        GeneratedComponent (LLM-generated, receives props below)
```

### Props injected into GeneratedComponent

```
frame: number       — current frame (0 to durationInFrames)
fps: number         — always 30
brand: BrandObject  — colors, fonts, logo
data: any           — content payload
```

The LLM receives these as props. It never calls any Remotion hook directly.

---

## Definitions

**Animation Type** — A named category of animation (text, data, social, presentation, custom). Defines which components the LLM may use. → see 04-animation-types-and-prompt.md

**Primitive** — Low-level building block. Four subtypes: animation, content, layout, utility. → see 03-component-library.md

**Scene Component** — Fully opinionated composition for a recognizable UI pattern. LLM provides data and timing only. → see 03-component-library.md

**Headless Component** — Logic-only component. Provides animated values via render props. LLM writes the render layer. → see 03-component-library.md

**Theme** — User's brand identity. Colors, fonts, logo. One per client. → see 02-tokens-and-theming.md

**Style** — System-defined visual language preset. Shape, stroke, shadow, motion character. → see 02-tokens-and-theming.md

**StyleConfig** — Resolved output of `resolveStyle(styleId, theme)`. What every component reads at runtime. → see 02-tokens-and-theming.md

**AspectPreset** — Named aspect ratio with width, height, and safe area insets. → see 02-tokens-and-theming.md

**FramePreset** — Root wrapper component that enforces composition dimensions. Never LLM-generated. → see 02-tokens-and-theming.md

**Patch** — Stored edit to a component prop. Applied at render time. Never modifies source. → see 05-compiler-and-ast.md

**Swap Rule** — Explicit transformation from one component type to another. → see 05-compiler-and-ast.md

**Probe Render** — Lightweight renderToString pass that collects end-frame registrations to compute total duration. → see 06-duration-and-timing.md

**DurationCollector** — React context that primitives write their end frame into during render. → see 06-duration-and-timing.md

---

## Escape Hatches

**Plain React is allowed** for static layout, absolute positioning, and content structure. The LLM may use any HTML element and CSS for non-animated content.

**Plain React is never allowed** for animation timing. Any time-dependent behavior must use a primitive.

**Headless components** are the escape hatch for custom visual animation. LLM writes the render layer, never the animation math.

**Scene components are not required** for recognizable UI patterns. The LLM can build Slack threads, browser windows etc. in plain React wrapped with primitives. Scene components are quality optimizations built on demand, not requirements.

**Unknown patterns** that cannot be expressed via primitives or headless components are a signal that a new primitive is needed. Document these cases — do not allow the LLM to write raw Remotion code as a workaround.