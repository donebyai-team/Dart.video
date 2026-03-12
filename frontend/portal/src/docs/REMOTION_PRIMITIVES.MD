# Remotion Visual Editor — Architecture Summary

## The Problem

LLM-generated Remotion code is visually inconsistent — random padding, arbitrary spacing, bad easing curves, hardcoded colors. The LLM needs too much Remotion-specific knowledge to generate reliable output.

## The Core Insight

Split responsibilities:
- **LLM** decides *what* to show and *when* (composition, content, timing)
- **Primitives** handle *how* it looks and moves (easing, spacing, visual quality)

The LLM stops being a motion designer and becomes a director.

---

## Key Architectural Decisions

### 1. Frame as a Prop
The LLM never calls `useCurrentFrame()` or `interpolate()`. Instead it receives `{ frame, fps, brand }` as props. The root composition (which the LLM never touches) injects these. The LLM writes pure React — it doesn't need to know Remotion exists.

### 2. Design Token Enforcement
A strict scale for spacing, font sizes, radii, and durations. The LLM can only use values from the scale — never arbitrary px values or hardcoded hex colors.

- Spacing scale: 8, 16, 24, 32, 48, 64, 96
- Brand tokens: `brand.primary`, `brand.secondary`, `brand.bg`, `brand.text`, `brand.font`

### 3. Three Layers the LLM Can Use

- **Animation Primitives** — animation behavior, always correct easing and timing
- **Layout Primitives** — enforce spacing scale, eliminate margin/padding chaos
- **Plain React** — allowed for static layout and positioning, never for animation timing

---

## Animation Primitives

Build these first. They cover the vast majority of animation needs.

| Primitive | What it does | Coverage |
|---|---|---|
| `Reveal` | Entrance/exit wrapper — fadeUp, fadeIn, scaleIn, slideUp, blurIn, etc. | ~70% of all element animations |
| `Stagger` | Orchestrates timing rhythm for lists of 2+ items | ~60% of multi-element scenes |
| `Counter` | Animated number with spring easing, formatting, suffix | ~80% of stat/metric animations |
| `Typewriter` | Character, word, or line reveal with optional cursor | ~90% of text reveal effects |
| `Text` | Typography with enforced variant scale — heading, subheading, body, label | 100% of text elements |

**Layout Primitives**

| Primitive | What it does |
|---|---|
| `Stack` | Vertical layout, gap from token scale only |
| `Row` | Horizontal layout, gap from token scale only |

**These 7 primitives + token system cover an estimated 75–80% of generated video scenes without any scene components.**

---

## Scene Components

Pre-built, opinionated components for recognizable UI patterns. LLM provides content and timing, component handles all visual fidelity. Always look authentic and consistent.

**Do not build these upfront. Add on demand as users request them.**

| Component | Use case | Priority |
|---|---|---|
| `TitleCard` | Hero heading + subheading + background | First |
| `StatBlock` | Single metric with label and trend | First |
| `LowerThird` | Name + title bar | High |
| `PhoneFrame` | iOS/Android device shell | High |
| `BrowserWindow` | Chrome/Safari frame | High |
| `WhatsAppChat` | Chat bubbles, typing indicator, stagger | Medium |
| `SlackThread` | Channel thread with reactions | Medium |
| `CodeEditor` | Syntax highlighted, typewriter reveal | Medium |
| `Quote` | Pull quote with attribution | Medium |
| `Timeline` | Step-by-step process reveal | Medium |
| `VideoCallGrid` | Zoom/Meet style participant grid | Later |
| `NotificationToast` | System or app notification | Later |

**Top 5 scene components cover an estimated additional 15% of cases, bringing total coverage to ~90%. The remaining ~10% is handled by the LLM composing freely with primitives and plain React.**

---

## Headless Components

For cases where visual variety is expected — data visualization, diagrams, custom layouts — full scene components are the wrong choice because every output looks identical. Headless components solve this.

### The Problem They Solve

Without headless, the LLM has two bad options:
- Use a full scene component → correct animation, zero visual variety
- Write animation math from scratch → creative freedom, but inconsistent and often wrong

Headless gives both: correct animation math from hand-crafted logic, plus full visual freedom in the render layer.

### The Pattern

A headless component splits into two layers:

**Logic layer** (you build) — handles all animation math: spring physics, stagger timing, value interpolation, geometric computation. Exposes animated values as render props. The LLM never sees this code.

**Render layer** (LLM writes) — receives animated values (always 0→1 progress, always correctly eased) and renders freely using plain React and CSS. Full creative control, no animation knowledge required.

This is the same philosophy as Radix UI / Headless UI for web components — separate behavior from presentation.

### Why the 0→1 Interface Matters

Every headless component exposes animated values normalized to 0→1. This means:
- The LLM can apply them to anything — opacity, scale, position, color, strokeDashoffset
- The easing is baked in — the LLM gets spring/elastic/ease values without knowing how
- Composing multiple effects is trivial — multiply, offset, map to any range

### Candidates for Headless (add as needed)

| Component | Logic layer provides | LLM controls |
|---|---|---|
| `BarChartLogic` | Animated 0→1 per bar, stagger timing | Bar shape, color, label position, gaps |
| `LineChartLogic` | Path progress, point reveal sequence | Stroke style, fill, dot design |
| `FlowLinesLogic` | Bezier curve paths, per-line draw progress | Stroke color, width, opacity, style |
| `StaggerLogic` | Per-item animated value, index | Any visual — full creative freedom |
| `ScatterPlotLogic` | Projected 2D positions, per-dot opacity | Dot size, color, shape |
| `ProgressLogic` | Single 0→1 animated value | Bar, circle, ring — any shape |

### Extensibility

New headless components follow the same pattern and plug into the system immediately. Adding one means:
1. Build the logic layer (animation math only)
2. Add component name + render prop signature to the auto-generated prompt fragment
3. LLM can use it in the next generation

The prompt grows by ~10 tokens per new headless component. It does not require restructuring the system.

---

## Style System (StyleContext)

A single context injected at root, consumed by every primitive and component. Enables user-selectable visual styles without touching generated code. Style switching is instant — no LLM call, no code changes.

A style defines: shape language (radii), stroke and borders, surface treatment, shadow character, typography feel, motion character (snappy/floaty/elastic), texture, and color application mode.

Styles are **brand-aware** — `resolveStyle(styleId, brand)` blends the style's structural rules with the user's actual brand colors. Same style looks different per brand.

Launch with 3 styles. Add more based on user requests.

---

## What the LLM Prompt Looks Like After This

~150 tokens total, replacing 500+ tokens of Remotion skill documentation:

- Never use `useCurrentFrame`, `interpolate`, `spring`, or any `remotion` import
- Component list (auto-generated from schemas — grows without increasing prompt significantly)
- Timing in frames at 30fps
- Only spacing scale values
- Only brand tokens for color

The prompt is effectively O(1) with respect to component count if schemas are represented compactly.

---

## Build Order

**Phase 1 — Foundation (build now)**
- Design tokens and spacing scale
- `Reveal`, `Stagger`, `Counter`, `Typewriter`, `Text`, `Stack`, `Row`
- `StyleContext` with 3 launch styles

**Phase 2 — On demand after launch**
- Scene components, starting with `TitleCard` and `StatBlock`
- Headless components, starting with `BarChartLogic`
- Additional styles based on user requests

**Never build speculatively. Every scene component and headless primitive should be motivated by actual user requests.**