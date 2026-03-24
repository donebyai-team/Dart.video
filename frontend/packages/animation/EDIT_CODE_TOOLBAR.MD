# Patching and Toolbar Editing

How the editor reads, modifies, and persists changes to generated animations without regeneration.

---

## AST Pass — id injection

The compiler AST pass injects ids on every JSX element in the generated code. This is the only job of the AST pass. Everything else — prop extraction, value reading, component tree analysis — is handled at runtime.

```
Registered primitive   → id="fadein-0", id="counter-1", id="text-3"
Raw HTML element       → id="el-0", id="el-4"
Unknown custom comp    → id="custom-0"
Layout primitives      → no id (SafeArea, Stack, Row, AbsoluteCenter, FramePreset)
```

Layout primitives get no id because they have no editable props and don't need toolbar support.

Id format: `{componentname}-{index}`. Index is a flat counter across the whole component tree, not per component type. Ids are stable across re-renders of the same compiled code.

---

## Patch Types

Three patch types. Stored in a flat overlay keyed by element id.

```typescript
type Patch =
  | { type: 'value';         id: string; prop: string;  value: unknown }
  | { type: 'styleOverride'; id: string; style: React.CSSProperties }
  | { type: 'swap';          id: string; newComponent: string }
```

**Value patch** — overrides a single named prop on a primitive. Used for delay, duration, from, to, children, variant, direction, suffix, prefix, staggerDelay etc.

**Style override patch** — merges a CSSProperties object on top of the element's resolved style. Stored as a plain style object — no token names, no enum values. What is stored is what is applied.

**Swap patch** — replaces one primitive with another. Valid swap targets are defined in the registry per component. Props shared between old and new component are preserved. Props that don't exist on the new component are dropped.

---

## Patch Overlay

The editor owns the patch overlay as React state. It is a plain object keyed by element id:

```typescript
type PatchOverlay = Record<string, {
  value?: Record<string, unknown>
  styleOverride?: React.CSSProperties
  swap?: string
}>

// Example
{
  'text-0':    { value: { variant: 'heading' }, styleOverride: { color: '#6366f1' } },
  'slidein-0': { value: { durationInFrames: 40 } },
  'counter-0': { value: { to: 23 } },
  'stagger-0': { value: { staggerDelay: 8 } },
}
```

The overlay is passed into the component tree via PatchContext:

```tsx
<ThemeProvider theme={brand}>
  <StyleProvider style={styleId}>
    <PatchContext.Provider value={patchOverlay}>
      <GeneratedComponent />
    </PatchContext.Provider>
  </StyleProvider>
</ThemeProvider>
```

State update → React re-renders → primitives read new values. No compilation step. Instant.

---

## How Primitives Apply Patches

Every primitive calls `usePrimitivePatches(id, defaultProps)` which merges patches on top of original props:

```typescript
export function usePrimitivePatches(id: string, defaultProps: Record<string, unknown>) {
  const overlay = useContext(PatchContext);
  const patch = overlay[id];

  return {
    ...defaultProps,          // original props from LLM code
    ...patch?.value,          // value patches override props
    styleOverride: patch?.styleOverride ?? {}
  }
}
```

Inside the primitive, style is applied in layers — system style loses to LLM prop, LLM prop loses to user override:

```typescript
const effectiveStyle = {
  ...resolvedSystemStyle,   // from StyleContext
  ...style,                 // prop passed by LLM
  ...patches.styleOverride, // user manual override — always wins
}
```

---

## Click to Select

The editor attaches a click handler to the player container. On click it walks up the DOM tree from the click target to find the nearest element with an id attribute.

```
Click hits element
  → walk up DOM to nearest element with id
  → read id value
  → determine element type:

  id matches registry component name  → primitive path
  id starts with "el-"               → raw HTML path
  id starts with "custom-"           → custom component path
  no id found                        → deselect
```

Hit testing rule: deepest element with an id wins on single click. Clicking again on an already-selected element walks up to the parent with an id. This mirrors standard design tool behavior.

---

## Toolbar Rendering

Toolbar content is driven entirely by the registry Zod schema. No custom toolbar code per component.

**Primitive selected** — full toolbar rendered from editor schema:

```typescript
// Registry entry
FadeIn: {
  editorSchema: z.object({
    delay:    z.number().min(0).max(300),
    duration: z.number().min(1).max(300),
  })
}

Counter: {
  editorSchema: z.object({
    from:     z.number(),
    to:       z.number(),
    duration: z.number().min(1).max(300),
    suffix:   z.string().optional(),
    prefix:   z.string().optional(),
    variant:  z.enum(['heading', 'display', 'subheading']),
  })
}
```

Schema type → toolbar input mapping:
- `z.number()` → slider with min/max
- `z.string()` → text input
- `z.enum()` → dropdown
- `z.boolean()` → toggle

Style overrides section is collapsed by default, expandable:

```
Content    [ Phase 2 Complete    ]   ← always visible
Variant    [ display ▾ ]             ← always visible

▾ Style overrides                    ← collapsed by default
  Color    [ ● brand.primary ▾ ]
  Opacity  [ ────●──── 100%    ]
  Weight   [ semibold ▾ ]
```

**Raw HTML selected** — no schema, no structured toolbar. Shows style override controls only (color, opacity, font weight) plus an inline text editor if the element contains only text.

**Custom component selected** — style override controls only.

---

## Swap Rules

Defined per component in the registry. Only valid swaps are shown in the toolbar.

```
FadeIn    ↔ SlideIn, ScaleIn
FadeOut   ↔ SlideOut, ScaleOut
Text      → Typewriter, WordCycle
Typewriter → Text
SlideIn   ↔ FadeIn, ScaleIn
```

When a swap is applied: shared props are preserved, incompatible props are dropped, new required props get their default values.

---

## What Each Element Type Supports

```
Registered primitive   → value patches, style override, swap — full toolbar
Raw HTML (el-*)        → style override only — limited toolbar
Custom component       → style override only — limited toolbar
Layout primitives      → nothing — not selectable
```

---

## Patches and Regeneration

When the user edits via prompt and the LLM regenerates the component, `reconcileEdits` runs to preserve patches where possible.

Rules:
- Patch survives if the new code contains an element with the same id and the same component type
- Patch is dropped if the element id disappears from the new code
- Patch is dropped if the element type changes (e.g. FadeIn replaced by a div)
- Style override patches survive type changes — style is component-agnostic

After reconciliation, stale patches are removed from the overlay. The user does not see dropped patches — the regenerated animation simply reflects the LLM's new output with surviving patches applied on top.

---

## Style Override Patch and Brand Switching

Style override patches store resolved values (hex strings, pixel values) not token names. This means they are brand-specific — switching brand does not update manual overrides. This is intentional. A manual override is a deliberate user choice that should not change silently.

If the user wants a brand-aware override they use the prompt: "make this text use the primary brand color." The LLM writes `brand.primary` into the component code. That is baked in, not a patch.

# Old AST
1. We separate the old ast with this new AST approach mentioned above
2. Modify reconcileEdits to work with the new AST approach
3. Modify the AnimationEditLayer, AnimationToolbar in @toolbars as per the new changes. 
4. In new approch, better is to have a single toolbar which render options based on what is available in the zod schema of the primitives, scenes etc
5. For each type of change, we should have a separate component only if the change requires complex logic or multiple controls. Eg. Changing counter values or change the text of a word in wordcycle. 

Ask clarifying questions if needed
