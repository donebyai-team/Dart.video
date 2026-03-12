# 04 — Animation Types and Prompt Generation

→ This spec covers animation type definitions and the prompt generation system.
→ For component details: see 03-component-library.md
→ For token names used in prompts: see 02-tokens-and-theming.md

---

## What is an Animation Type

An animation type is a named category that defines:
- Which components the LLM may use
- Any type-specific prompt rules beyond the global rules
- The expected composition patterns for that category

The LLM is only given the components relevant to the current animation type. This keeps prompts compact, prevents irrelevant component usage, and reduces LLM decision overhead.

---

## Defined Animation Types

### text
For animations centered on typography, messaging, and written content.

Components:
- Layout: SafeArea, Stack, Row, AbsoluteCenter
- Animation: FadeIn, FadeOut, SlideIn, SlideOut, ScaleIn, ScaleOut, Stagger, TimelineGate
- Content: Text, Typewriter, WordCycle, Counter

Type-specific rules:
- Every text element must use a Text variant — never a plain HTML element with inline font styles
- Use Typewriter for any text that should be revealed progressively
- Use WordCycle when cycling between 2+ alternative phrases

### data
For animations centered on metrics, charts, and quantitative content.

Components:
- Layout: SafeArea, Stack, Row, AbsoluteCenter
- Animation: FadeIn, SlideIn, ScaleIn, Stagger, TimelineGate
- Content: Text, Counter
- Scene: StatBlock, TitleCard
- Headless: BarChartLogic, ProgressLogic, LineChartLogic

Type-specific rules:
- Use Counter for any animated numeric value
- Use StatBlock for a single KPI with label and trend
- Use BarChartLogic for bar charts — never build bar animation manually

### presentation
For slide-style and explainer animations.

Components:
- Layout: SafeArea, Stack, Row, AbsoluteCenter
- Animation: FadeIn, FadeOut, SlideIn, SlideOut, ScaleIn, Stagger, TimelineGate
- Content: Text, Counter, Typewriter
- Scene: TitleCard, StatBlock, LowerThird, BrowserWindow, Timeline
- Headless: BarChartLogic

Type-specific rules:
- Use TitleCard for any hero opening slide
- Use LowerThird when introducing a person or role
- Use TimelineGate for multi-step content that reveals sequentially

### social
For social media, messaging, and device-frame animations.

Components:
- Layout: SafeArea, Stack, Row, AbsoluteCenter
- Animation: FadeIn, SlideIn, Stagger, TimelineGate
- Content: Text, Typewriter, WordCycle
- Scene: PhoneFrame, BrowserWindow, LowerThird

Type-specific rules:
- Wrap device content in PhoneFrame or BrowserWindow where applicable
- If WhatsApp or Slack scenes are needed and no scene component exists, build in plain React wrapped with Stagger — see escape hatch rule in 01-architecture.md

### custom
All primitives and all scene components. Used for animations that cross multiple categories or have no clear type.

No type-specific rules beyond global rules.

---

## Prompt Generation

### getAnimationPrompt function

```
getAnimationPrompt(animationType, theme, styleId, aspectPreset) → string
```

Returns a complete, ready-to-inject LLM system prompt for the given configuration. Never hand-written — always generated from the registry and token system.

### Prompt structure

The generated prompt has these sections in order:

**1. Frame contract** (~20 tokens)
States that the component receives `{ frame, fps, brand, data }` as props and must never call Remotion hooks directly.

**2. Canvas dimensions** (~10 tokens)
Width and height from the active AspectPreset. LLM understands the composition space.

**3. Component list** (~10 tokens per component)
Auto-generated from Zod schemas of the animation type's component subset. Format: component name, prop names with types, one-line description. No implementation details.

**4. Spacing tokens** (~10 tokens)
The allowed spacing values for gap, padding, margin.

**5. Typography scale** (~15 tokens)
Semantic names (caption through display) only.

**6. Brand tokens** (~10 tokens)
The brand token names available (brand.primary, brand.secondary, brand.bg, brand.text, brand.font).

**7. Timing guidance** (~15 tokens)
fps is 30. Frame guidance for common durations. Typical entrance: 15-25 frames. Stagger between items: 6-10 frames.

**8. Rules** (~30 tokens)
Global constraints. Never import from remotion. Never use useCurrentFrame. Plain React allowed for static layout. Animation timing always via primitives. Never hardcode colors. Never hardcode px values. SafeArea always wraps outermost content.

**9. Type-specific rules** (~20 tokens)
The additional rules defined for the active animation type.

**Total: approximately 150-200 tokens regardless of component count.**

### Prompt compactness rule

Each component in the prompt is represented as: `ComponentName prop1 prop2? prop3 — description`

Optional props are marked with `?`. The LLM does not need to know internal implementation, easing values, or StyleContext reads. If it cannot be expressed in one line, the description is too long.

### Prompt caching

The prompt for a given (animationType, styleId) combination is generated at build time and cached. Only the brand token values are injected at request time. This keeps prompt generation fast and deterministic.

---

## Adding a New Animation Type

1. Define the type name and description in `animation-registry/types/`
2. List the primitives, scenes, and headless components included
3. Write type-specific prompt rules (what the LLM should always/never do for this type)
4. `getAnimationPrompt` picks it up automatically
5. Add the type to the README with a one-line description
6. No component changes required

---

## Prompt Evolution

As new components are added to the registry and assigned to animation types, the prompt updates automatically. The only manual step is assigning a new component to one or more animation types.

The prompt never needs to be hand-edited. If a prompt section feels too long, the component description is too verbose — fix the description, not the prompt structure.
