# Remotion Animation System — Spec Index

## What this is

A component-driven animation language built on top of Remotion. LLMs generate pure React using a curated component library. No Remotion-specific knowledge required. Output is consistent, styleable, editable, and duration-aware.

## Package Structure

One package (`animation`) with internal folders per responsibility. Not a multi-package monorepo. See `01-architecture.md` for the full folder structure.

---

## Specs

### [01-architecture.md](./01-architecture.md)
System overview, goals, monorepo package structure, runtime contract, and the frame injection model. **Start here.**

### [02-tokens-and-theming.md](./02-tokens-and-theming.md)
Design tokens (color, typography, spacing), aspect presets, FramePreset component, theme vs style distinction, StyleContext, and the resolveStyle function.

### [03-component-library.md](./03-component-library.md)
The full component vocabulary. Layout primitives, animation primitives, content primitives, scene components, and headless components. Includes the primitive taxonomy, naming conventions, and the TimelineGate pattern.

### [04-animation-types-and-prompt.md](./04-animation-types-and-prompt.md)
Animation type definitions, which components belong to each type, the prompt generation system, and the getAnimationPrompt function.

### [05-compiler-and-ast.md](./05-compiler-and-ast.md)
Compiler pipeline, scope injection, AST ID assignment, element ID format, patch system, swap rules, and editor interaction model.

### [06-duration-and-timing.md](./06-duration-and-timing.md)
Duration probe render, DurationCollector, user duration overrides (speed, hold, trim), and the speedFactor model.

### [07-assets.md](./07-assets.md)
Asset manifest schema, useAsset loader hook, v1 asset packs (icons, characters, shapes, backgrounds), versioning rules, and contributor guide for adding assets.

### [08-future-features.md](./08-future-features.md)
Roadmap of features beyond the current phase plan. Audio sync, advanced transitions, layout templates, social components, beat sync, and architectural guidance for future additions.

---

## Implementation Phases

### Phase 1 — Text animations (foundation)
Proves end-to-end architecture. Covers specs 01–06 at the text animation type scope only.

Deliverables:
- Monorepo scaffold, all packages stubbed
- Full token system, 3 aspect presets (web, square, vertical)
- FramePreset component
- Layout primitives: SafeArea, Stack, Row, AbsoluteCenter
- Animation primitives: FadeIn, FadeOut, SlideIn, SlideOut, ScaleIn, ScaleOut, Stagger, TimelineGate
- Content primitives: Text, Typewriter, WordCycle, Counter
- StyleContext, resolveStyle, 2 styles (Clean, Bold)
- DurationCollector, probe render
- Compiler scope injection, frame prop injection
- AST ID assignment for Phase 1 primitives
- getAnimationPrompt for `text` animation type
- Patch system with value, speed, and swap patches
- Swap rules: FadeIn↔SlideIn, Text→Typewriter, Text→WordCycle
- `src/assets/` folder implemented — manifest types, useAsset hook, preloader
- Contributor guide: adding a primitive, adding a style, adding an asset

### Phase 2 — Data and presentation
Deliverables:
- Headless component pattern + BarChartLogic, ProgressLogic
- Scene components: TitleCard, StatBlock
- Third style: Glass
- Animation types: `data`, `presentation`
- Editor toolbar schema derivation from Zod schemas
- v1 asset packs: icons@v1 (22 outline + 22 solid), shapes@v1 (10 SVGs), backgrounds@v1 (6 assets)
- Asset manifest populated and validated
- useAsset hook integrated into data animation type prompt
- Contributor guide: adding a scene, adding a headless component, adding an asset pack

### Phase 3 — Social and device
Deliverables:
- Scene components: PhoneFrame, BrowserWindow, LowerThird
- Escape hatch documentation for non-implemented scenes (WhatsApp, Slack)
- Animation type: `social`
- Remaining aspect presets (tall, slide, wide)
- characters@v1 asset pack (36 SVGs + 3 Lottie idle blinks)
- Characters available in social animation type prompt
- Template promotion feature
- Contributor guide: adding an animation type

### Phase 4 — Extensibility and polish
Deliverables:
- FlowLinesLogic headless component
- Additional styles from user requests
- Style preview thumbnails
- Template library and instantiation
- Full contributor guide covering all extension points

---

## Constraints

- LLM never imports from `remotion`
- LLM never calls `useCurrentFrame`, `interpolate`, or `spring`
- Plain React allowed for static layout and positioning
- Animation timing must always use primitives
- LLM never hardcodes hex colors or arbitrary px values
- SafeArea is always the outermost content wrapper
- FramePreset is always the outermost root wrapper (never LLM-generated)