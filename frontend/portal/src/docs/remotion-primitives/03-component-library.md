# 03 — Component Library

→ This spec covers all components the LLM can use.
→ For token values components read: see 02-tokens-and-theming.md
→ For which components belong to which animation type: see 04-animation-types-and-prompt.md

---

## Component Taxonomy

Five distinct types. Each has a different contract, different editor surface, and different toolbar behavior.

| Type | Renders content | Handles animation | Needs frame prop | Has children | LLM controls visuals |
|---|---|---|---|---|---|
| Layout primitive | ❌ | ❌ | ❌ | ✅ | ✅ fully |
| Animation primitive | ❌ | ✅ | ✅ | ✅ | ✅ fully |
| Content primitive | ✅ | ✅ | ✅ | ❌ | Partially |
| Scene component | ✅ | ✅ | ✅ | ❌ | ❌ none |
| Headless component | ❌ | ✅ logic only | ✅ | ✅ render prop | ✅ completely |

---

## Layout Primitives

No animation. No frame prop. Enforce spacing tokens only. LLM controls all visual decisions within the token constraints.

### SafeArea
Mandatory outermost content wrapper. Reads safe area insets from AspectPresetContext. Applies token-scale padding. Prevents content from overlapping platform UI zones.

LLM rule: always wrap the outermost content in SafeArea. Never set padding on the root div manually.

Props: `children`

### Stack
Vertical layout. Gap must come from spacing tokens.

Props: `gap` (spacing token), `align`, `justify`, `children`

### Row
Horizontal layout. Gap must come from spacing tokens.

Props: `gap` (spacing token), `align`, `justify`, `children`

### AbsoluteCenter
Centers a child absolutely within its nearest positioned parent. Supports centering on one or both axes.

Props: `axis` (x | y | both), `children`

### FramePreset
Root composition wrapper. Never used by LLM. → see 02-tokens-and-theming.md

---

## Animation Primitives

Wrap children and add motion. No visual output of their own. Read motion character from StyleContext — LLM never sets easing directly.

All animation primitives:
- Accept `frame`, `delay`, `duration` props
- Register `delay + duration` with DurationCollector on every render
- Read easing from `StyleContext.motion`
- Apply `overflow: hidden` or equivalent to prevent mid-animation bleed

### FadeIn
Animates `opacity` from 0 to 1.

Props: `frame`, `delay`, `duration`, `children`

### FadeOut
Animates `opacity` from 1 to 0.

Props: `frame`, `delay`, `duration`, `children`

### SlideIn
Translates from a direction into natural position. Combines with opacity.

Props: `frame`, `delay`, `duration`, `direction` (up | down | left | right), `distance` (spacing token), `children`

### SlideOut
Translates out to a direction. Combines with opacity.

Props: `frame`, `delay`, `duration`, `direction` (up | down | left | right), `distance` (spacing token), `children`

### ScaleIn
Animates `scale` from 0 to 1. Transform origin configurable.

Props: `frame`, `delay`, `duration`, `origin` (center | top | bottom | left | right), `children`

### ScaleOut
Animates `scale` from 1 to 0.

Props: `frame`, `delay`, `duration`, `origin`, `children`

### Stagger
Timing orchestrator for lists of 2 or more items. Renders each child with an increasing delay offset. Does not add any visual wrapper.

Props: `frame`, `startAt`, `delayBetween`, `children`

DurationCollector registration: `startAt + (childCount - 1) * delayBetween + longestChildDuration`

### TimelineGate
Shows or hides children within a frame window. Children are mounted/unmounted based on frame position.

Props: `frame`, `showAfter`, `hideAfter?`, `children`

DurationCollector registration: `hideAfter` if provided, otherwise `showAfter`.

---

## Content Primitives

Render content and handle their own animation internally. No children. Read typography from StyleContext.

### Text
Static text with semantic typography variants. No animation — wrap in FadeIn or SlideIn if animation is needed.

Props: `variant` (caption | label | body | subheading | heading | display), `children`, `style?`

Reads: `StyleContext.type` for font family, transform, tracking

### Counter
Animated number that counts from one value to another. Spring easing driven by StyleContext.

Props: `frame`, `delay`, `duration`, `from`, `to`, `format?` (e.g. "0,0" | "$0,0" | "0%"), `suffix?`, `prefix?`

### Typewriter
Reveals text progressively. Cursor appearance driven by StyleContext.

Props: `frame`, `delay`, `duration`, `text`, `mode` (char | word | line), `variant?` (maps to Text variants for typography)

Reads: `StyleContext.cursor` for shape and behavior

### WordCycle
Cycles through an array of words with a configurable transition between each.

Props: `frame`, `delay`, `words`, `holdDuration`, `transitionDuration`, `transition` (flipY | fadeSwap | slideUp), `variant?`

DurationCollector registration: `delay + (words.length * (holdDuration + transitionDuration))`

---

## Scene Components

Fully opinionated. LLM provides data and timing only. All visual decisions are internal. Always look authentic and consistent. Read all visual values from StyleContext.

Scene components must:
- Accept `frame` prop
- Accept a data prop shaped to their Zod schema
- Register end frame with DurationCollector
- Read all visual decisions from StyleContext (never hardcode colors, radii, shadows)
- Define which props are editor-editable in their Zod schema

### TitleCard (Phase 1)
Hero composition. Heading, optional subheading, optional background treatment.

Props: `frame`, `heading`, `subheading?`, `eyebrow?`, `delay?`

### StatBlock (Phase 2)
Single metric display. Value, label, optional trend indicator.

Props: `frame`, `value`, `label`, `trend?`, `delay?`

### LowerThird (Phase 3)
Name and title bar. Classic broadcast style.

Props: `frame`, `name`, `title`, `delay?`

### PhoneFrame (Phase 3)
iOS or Android device shell. Children render inside the screen area.

Props: `frame`, `model` (ios | android), `time?`, `children`

### BrowserWindow (Phase 3)
Chrome or Safari browser chrome. Children render inside the viewport.

Props: `frame`, `url?`, `children`

**Scene components are built on demand.** The above list is directional. Build when user patterns justify it. The LLM can produce plain React equivalents using primitives as an escape hatch until a scene component exists.

---

## Headless Components

Logic-only. Provide correctly animated values via render props. LLM writes the visual render layer entirely. No visual output from the component itself.

All headless components:
- Accept `frame`, timing props
- Expose animated values normalized to 0→1 where possible
- Handle spring physics, stagger, and geometric computation internally
- Register end frame with DurationCollector

### BarChartLogic (Phase 2)
Computes staggered animated progress values for a set of data bars.

Props: `frame`, `data` ([{value, label, color}]), `delay`, `duration`, `staggerBetween`

Render props: `bars` (array of {value, label, color, animatedProgress: 0→1}), `maxValue`

### ProgressLogic (Phase 2)
Single animated progress value.

Props: `frame`, `delay`, `duration`, `from?`, `to?`

Render props: `progress` (0→1)

### LineChartLogic (Phase 2)
Path draw progress for a line chart.

Props: `frame`, `data` ([{x, y}]), `delay`, `duration`

Render props: `points`, `pathProgress` (0→1), `animatedPoints`

### FlowLinesLogic (Phase 4)
Bezier curve paths between source and target positions. Per-line draw progress.

Props: `frame`, `from` ([{x,y}]), `to` ({x,y}), `delay`, `duration`, `staggerBetween`

Render props: `paths` ([{d, length}]), `progress` ([0→1 per path])

**Headless components are built on demand.** Each addition requires only the component implementation and a prompt schema update.

---

## Component Registration

Every component is registered in `animation-registry`. Registration includes:

- Component name
- Component type (layout | animation | content | scene | headless)
- Zod schema for all props
- Which animation types include this component
- Which props are editor-editable
- Semantic description for prompt generation (one line)

The registry is the single source of truth. Prompt generation, editor toolbars, AST ID assignment, and type checking all derive from it.

---

## Naming Conventions

- Animation primitives use verb+direction: FadeIn, FadeOut, SlideIn, SlideOut, ScaleIn, ScaleOut
- Do not combine into a single component with a type prop (no `<Reveal type="fadeIn">`)
- Content primitives are named for their behavior: Counter, Typewriter, WordCycle
- Scene components are named for what they represent: TitleCard, StatBlock, PhoneFrame
- Headless components have a Logic suffix: BarChartLogic, FlowLinesLogic

---

## Contributor Guide — Adding a Primitive

1. Define the Zod schema in `animation-core/schemas/`
2. Implement the component — it must: accept `frame` prop, read from StyleContext, register end frame with DurationCollector
3. For animation primitives: create one file per animation type, do not combine with a type prop
4. Register in `animation-registry` with component type, schema, and description
5. Assign to relevant animation types in `04-animation-types-and-prompt.md`
6. The prompt updates automatically on next build
7. Add a Storybook story covering default, all variants, and all style presets

## Contributor Guide — Adding a Scene Component

1. Define Zod schema — include all data props and timing props
2. Implement — all visual decisions internal, read from StyleContext
3. Mark which props are editor-editable in the schema
4. Register in animation-registry
5. Assign to relevant animation types
6. Storybook story: all data variants, all 3 launch styles, all aspect presets
7. Document the escape hatch: what the LLM should do if this component does not exist yet

## Contributor Guide — Adding a Headless Component

1. Define what animation math the logic layer computes
2. Design the render prop interface — prefer 0→1 normalized values
3. Implement the logic layer — no visual output, no StyleContext reads
4. Register in animation-registry
5. Write a Storybook story showing 2-3 different render layer implementations to demonstrate the creative freedom it enables
