# 05 — Compiler and AST

→ This spec covers the compiler pipeline, AST transforms, element IDs, patch system, and editor interactions.
→ For component types and schemas: see 03-component-library.md
→ For duration computation: see 06-duration-and-timing.md

---

## Compiler Pipeline

Located in `packages/renderer`. 
1. ast-transform.ts
2. compiler.ts
Transforms LLM-generated code into an executable component function.

LLM Generate code -> We send it to validate-server.mjs -> calls transformAST and compiler and save the transformed code.

### Current responsibilities (unchanged from existing system)

1. Strip all import statements from LLM-generated code
2. Remove export keywords so code can run inside `new Function`
3. Babel transpile (JSX → JS, TypeScript → JS)
4. Return the `RemoteComponent` function

### New responsibilities (added for this system)

5. Inject primitive components into execution scope — same mechanism as current lucide icon injection. The LLM writes `<FadeIn>` and the compiler ensures `FadeIn` exists in the execution context.
6. Inject StyleContext.Provider wrapping at the root
7. Inject AspectPresetContext.Provider wrapping at the root
8. Inject `{ frame, fps, brand, data }` props at the root
9. Inject DurationCollector.Provider for probe render pass
10. Run the AST ID assignment pass (see below)
11. Run probe render to compute durationInFrames (→ see 06-duration-and-timing.md)

### What does not change

The core pipeline mechanism is identical. All new responsibilities are additive. Primitives are injected into scope exactly like lucide icons are today — the LLM writes the component name and the compiler makes it available.

### Scope injection order

Items injected into the execution scope:
- All registered primitive components (from animation-registry)
- StyleContext consumer hooks
- Brand token helpers
- Lucide icons (existing)
- Any other pre-approved utilities

The LLM has access to everything in scope. It cannot access anything not in scope (no dynamic imports, no require).

---

## AST ID Assignment

Every primitive and scene component usage in generated code receives a structured unique ID. Assigned by the compiler's AST transform pass. Never by the LLM.

### Why IDs are needed

The editor identifies elements by ID to:
- Render the correct toolbar for a clicked element
- Store prop patches keyed by element ID
- Enable drag, resize, and swap operations
- Reference specific elements in LLM edit instructions

### ID Format

```
{componentType}-{index}

Examples:
  fadein-0
  slidein-1
  counter-2
  wordcycle-3
  stagger-4
  titlecard-0
```

Index is assigned in document order (depth-first traversal). Two components of the same type get different indices.

### Prop path for patches

Patches reference element ID + prop name:

```
fadein-0.delay
fadein-0.duration
counter-2.to
wordcycle-3.words
stagger-4.delayBetween
titlecard-0.heading
```

### What the AST pass does

1. Walk the JSX tree depth-first
2. For every JSX element whose name matches a registered component in the registry, assign an `id` prop with the structured ID
3. Ignore all plain HTML elements (`div`, `span`, `p`, etc.)
4. Ignore unknown components not in the registry
5. Maintain an index counter per component type

The pass only needs to handle the known component vocabulary. Far simpler than the current approach of instrumenting arbitrary Remotion calls.

### What changes from the current AST pass

Current system: instruments raw Remotion calls (`interpolate`, `spring`, inline styles) to find patchable values. Complex, fragile, breaks on novel LLM patterns.

New system: only walks known JSX component names. The patchable surface is now exclusively component props — already declared, typed, and schema-validated. Dramatically simpler.

---

## Patch System

Patches are stored as a non-destructive overlay keyed by element ID. Applied at render time over original generated code. Original code is never modified.

### Patch types

**Value patch** — change a prop value
```
{ type: "value", id: "counter-2", prop: "to", value: 5000 }
```

**Swap patch** — replace one component type with another via a defined swap rule
```
{ type: "swap", id: "fadein-0", swapTo: "SlideIn", props: { direction: "up" } }
```

**Position patch** — absolute position override for top-level elements
```
{ type: "position", id: "titlecard-0", x: 200, y: 150 }
```

**Size patch** — width/height override
```
{ type: "size", id: "titlecard-0", width: 800, height: 400 }
```

**Speed patch** — global timing multiplier applied to all delay and duration props
```
{ type: "speed", factor: 0.75 }
```

### Patch application

At render time, the compiler applies patches before returning the component:
1. Walk the generated component's JSX
2. For each element with an ID that has patches, merge patched props over original props
3. Speed patch is applied to all delay and duration props across all elements

Patches are reconciled after LLM regeneration. The reconcileEdits function matches patches by element ID to the new code's element IDs where possible.

---

## Swap Rules

Explicit transformation definitions for known safe component swaps. Not a generic system — only defined cases are supported. The editor only shows swap options when a rule exists for that component type.

### Launch swap rules

**FadeIn ↔ SlideIn**
Prop mapping: delay, duration carry over. SlideIn gains `direction: "up"` default.

**FadeIn ↔ ScaleIn**
Prop mapping: delay, duration carry over.

**Text → Typewriter**
Prop mapping: children becomes `text` prop. delay defaults to 0. duration defaults to 45. mode defaults to "char". variant carries over.

**Text → WordCycle**
Prop mapping: children split on space becomes `words` array. holdDuration defaults to 45. transitionDuration defaults to 12. variant carries over.

**Typewriter → Text**
Prop mapping: text becomes children. variant carries over.

### Adding a swap rule

Define the source component, target component, and the exact prop transformation function. The editor discovers available swaps from the rule registry at render time.

---

## Editor Interactions

All editor interactions are enabled by the combination of element IDs and Zod schemas.

### (a) Click element → toolbar

1. User clicks an element in the preview
2. Click target maps to an element ID via hit testing
3. Element ID → component type → component Zod schema
4. Schema defines which props are editor-editable and their types
5. Editor renders the appropriate toolbar (slider for numbers, text input for strings, dropdown for enums, color picker for colors)

### (b) Drag to change position

1. User drags an element
2. A position patch is stored for that element ID
3. On re-render, the position patch applies `position: absolute`, `left`, `top` overrides

Only top-level elements within SafeArea are draggable. Nested elements within a Stagger or scene component are not individually draggable.

### (c) Resize (expand height/width)

1. User drags a resize handle
2. A size patch is stored for that element ID
3. On re-render, width/height props are overridden

Only scene components and top-level layout containers expose resize handles. Primitives that wrap children do not.

### (d) LLM edit instruction

1. User writes a free-text instruction ("make the heading bigger", "change the animation to slide in from left")
2. The instruction is sent to the LLM with the current component code and patch overlay as context
3. LLM returns either: a new value patch, a swap patch, or regenerated code for complex changes
4. Simple prop changes become patches. Structural changes trigger regeneration with reconcileEdits.

---

## Contributor Guide — Compiler Changes

When adding a new primitive or scene component:
- Register it in animation-registry (the registry is the source of truth)
- The compiler automatically includes it in scope injection (derived from registry)
- The AST ID pass automatically handles it (derived from registry component names)
- No manual compiler changes required

When adding a new patch type:
- Define the patch type in the patch type union
- Implement the application logic in the patch application pass
- Add reconciliation logic for post-regeneration matching
