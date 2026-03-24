# Schema-Driven Element Settings Panel

Replace the floating `AnimationToolbar` with a schema-driven settings panel rendered
inside `ToolsSettingsPanel` (right sidebar). When a user clicks an animation element,
the side panel auto-generates editor controls by introspecting the component's Zod
schema. The patch overlay system (`onValuePatch` / `onStyleOverride`) remains unchanged.

---

## Goal

- Remove the floating toolbar that appears over the canvas.
- Instead, render per-element settings in `ToolsSettingsPanel` using each component's
  Zod `fullSchema` + `editorProps` list from `COMPONENT_REGISTRY`.
- Controls are generated dynamically based on the Zod field type (string → text input,
  number → stepper, enum → dropdown, array → list editor, etc.).

---

## Architecture Overview

```
User clicks element on canvas
  → AnimationEditLayer.onSelectElement(eid)
  → store sets activeTool = { type: ANIMATION_ELEMENT, elementId: eid }
  → ToolsSettingsPanel renders <AnimationElementSettings eid={eid} ... />
  → AnimationElementSettings:
      1. resolveComponentFromId(eid) → ComponentRegistration
      2. iterate registration.editorProps
      3. for each prop, inspect registration.fullSchema.shape[prop]
      4. render control via renderFieldForZodType()
      5. on change → onValuePatch(eid, prop, value)
      6. render StyleOverrideSection → onStyleOverride(eid, style)
```

---

## Existing Infrastructure (no changes needed)

| Piece | Location | Role |
|-------|----------|------|
| `ComponentRegistration` | `packages/animation/src/registry/registry.ts` | `fullSchema` (Zod), `editorProps` (string[]), `name`, `type` |
| `resolveComponentFromId(id)` | same file | Maps element ID → registration |
| `getElementTypeFromId(id)` | same file | Returns `'primitive' \| 'html' \| 'custom'` |
| `PatchOverlay` | `packages/animation/src/patches/types.ts` | `{ [eid]: { value?, styleOverride?, swap? } }` |
| `applyValuePatch / applyStyleOverride` | `packages/animation/src/patches/overlay.ts` | Immutable overlay helpers |
| `useAnimationEdit` hook | `portal/src/components/editor/animation/useAnimationEdit.ts` | Manages overlay state, syncs to `window.__PATCH_OVERLAY__`, debounced persist |
| `PatchContext` + hooks | `packages/animation/src/patches/PatchContext.tsx` | `usePatchedProp`, `usePrimitivePatches`, `useStyleOverride` |
| Shared UI controls | `portal/.../animation/toolbars/shared.tsx` | `NumberStepper`, `SelectInput`, `SliderInput`, `ColorSwatch`, `FontFamilySelect`, `StyleOverrideSection` |
| Swap rules | `packages/animation/src/patches/swapRules.ts` | FadeIn↔SlideIn↔ScaleIn, Text↔Typewriter↔WordCycle |

---

## Implementation Steps

### 1. Add `ActiveToolType.ANIMATION_ELEMENT`

**File:** `portal/src/types/tools.ts`

```ts
export enum ActiveToolType {
  // ...existing values
  ANIMATION_ELEMENT = "animation-element",
}
```

Extend `SelectedTool` to carry the element ID:

```ts
export interface SelectedTool {
  type: ActiveToolType
  tool?: EffectType
  settings?: AddOrEditAnimationSettings
  animationElementId?: string   // ← new
}
```

### 2. Wire element selection to `activeTool`

**File:** Where `onSelectElement` is handled (likely `PlayerCanvas.tsx` or the parent
that owns `AnimationEditLayer`).

When `onSelectElement(eid)` fires:

```ts
if (eid) {
  store.setActiveTool({
    type: ActiveToolType.ANIMATION_ELEMENT,
    animationElementId: eid,
  })
} else {
  store.handleCloseTool()
}
```

Keep `selectedEid` state as-is for the selection highlight rectangle in
`AnimationEditLayer`. Only remove the `<AnimationToolbar>` rendering from the edit
layer (or hide it when the side panel is active).

### 3. Build `AnimationElementSettings` component

**File:** `portal/src/components/editor/settings/AnimationElementSettings.tsx`

```tsx
interface AnimationElementSettingsProps {
  elementId: string
  overlay: PatchOverlay
  onValuePatch: (id: string, prop: string, value: unknown) => void
  onStyleOverride: (id: string, style: Record<string, string | number>) => void
  onClose: () => void
}
```

**Logic:**

1. `const reg = resolveComponentFromId(elementId)`
2. `const elType = getElementTypeFromId(elementId)`
3. If `elType === 'html' || elType === 'custom'` → show style-only controls
4. If `reg` exists → iterate `reg.editorProps`, render each via `renderFieldForZodType`
5. For text-capable components (Text, Typewriter, WordCycle, Counter, TitleCard) →
   also render `StyleOverrideSection`
6. If swap rules exist for this component → render swap dropdown at top

### 4. Build `renderFieldForZodType` utility

**File:** `portal/src/components/editor/animation/toolbars/zodFieldRenderer.tsx`

Introspect `ZodType` and return the appropriate control. Unwrap wrappers first:

```ts
function unwrapZod(field: z.ZodTypeAny): z.ZodTypeAny {
  if (field instanceof z.ZodOptional) return unwrapZod(field.unwrap())
  if (field instanceof z.ZodDefault) return unwrapZod(field.removeDefault())
  return field
}
```

**Mapping table:**

| Zod Type | Detected Via | Control | From `shared.tsx` |
|----------|-------------|---------|-------------------|
| `ZodString` | `instanceof z.ZodString` | `<input type="text">` | — (simple input) |
| `ZodNumber` | `instanceof z.ZodNumber` | `<NumberStepper>` | Yes |
| `ZodNumber` with `.min(0).max(1)` | check `_def.checks` | `<SliderInput>` | Yes |
| `ZodEnum` | `instanceof z.ZodEnum` | `<SelectInput>` with `field.options` | Yes |
| `ZodNativeEnum` | `instanceof z.ZodNativeEnum` | `<SelectInput>` | Yes |
| `ZodBoolean` | `instanceof z.ZodBoolean` | Toggle / checkbox | New (trivial) |
| `ZodArray` of strings | `instanceof z.ZodArray` | List editor (add/remove) | New (for WordCycle words) |
| `ZodObject` (nested) | `instanceof z.ZodObject` | Recurse or special-case | — |

**Signature:**

```tsx
function renderFieldForZodType(
  prop: string,
  zodType: z.ZodTypeAny,
  currentValue: unknown,
  onChange: (value: unknown) => void,
): React.ReactNode
```

Read `currentValue` from `overlay[elementId]?.value?.[prop]` falling back to schema
default (`field._def.defaultValue?.()`).

### 5. Render in `ToolsSettingsPanel`

**File:** `portal/src/components/editor/ToolsSettingsPanel.tsx`

Add a new conditional block:

```tsx
{activeTool.type === ActiveToolType.ANIMATION_ELEMENT &&
  activeTool.animationElementId && (
    <AnimationElementSettings
      elementId={activeTool.animationElementId}
      overlay={overlay}
      onValuePatch={onValuePatch}
      onStyleOverride={onStyleOverride}
      onClose={handleCloseTool}
    />
  )}
```

The `overlay`, `onValuePatch`, and `onStyleOverride` props need to be threaded from
the parent (`EditorPage` / `PlayerCanvas`) that owns `useAnimationEdit`. This is
the same data currently passed to `AnimationEditLayer` → `AnimationToolbar`.

### 6. Remove floating toolbar

**File:** `portal/src/components/editor/animation/AnimationEditLayer.tsx`

Remove the `{/* Toolbar */}` section (lines 218-238). Keep everything else:
- Click capture overlay
- Selection highlight rectangle
- Hit testing logic
- Click-outside deselect

### 7. Component swap dropdown

If the selected component has swap rules, render a dropdown at the top of the
settings panel:

```tsx
const swapOptions = getSwapOptions(reg.name) // from swapRules.ts
if (swapOptions.length > 0) {
  <SelectInput
    label="Component"
    value={overlay[eid]?.swap ?? reg.name}
    options={swapOptions}
    onChange={(v) => applySwapPatch(overlay, eid, v)}
  />
}
```

After a swap, the panel should re-render with the new component's schema.

---

## Zod Schema Patterns in the Codebase

All schemas to handle (with their editorProps):

| Component | Schema Fields on `editorProps` | Notable Types |
|-----------|-------------------------------|---------------|
| Text | `children`, `variant` | string, enum |
| Counter | `from`, `to`, `prefix`, `suffix`, `variant` | number, number, string, string, enum |
| Typewriter | `text`, `mode`, `variant` | string, enum, enum |
| WordCycle | `words`, `transition` | string[], enum |
| TitleCard | `heading`, `subheading`, `eyebrow`, `delay` | string, string?, string?, number |
| FadeIn/Out | `startAt`, `durationInFrames` | number, number |
| SlideIn/Out | `startAt`, `durationInFrames`, `direction`, `distance` | number, number, enum, number |
| ScaleIn/Out | `startAt`, `durationInFrames`, `origin` | number, number, enum |
| Stagger | `startAt`, `staggerDelay` | number, number |
| TimelineGate | `showAfter`, `hideAfter` | number, number? |
| LogoAsset | `src`, `width`, `height` | string, number, number |
| ImageAsset | `src`, `width`, `height` | string, number, number |
| IconAsset | `name`, `size` | string, number |

---

## Edge Cases

1. **`html` and `custom` elements** have no registry entry — show style-only controls.
2. **Default values**: Read from `field._def.defaultValue?.()` when overlay has no
   patch for that prop. The renderer should also read the component's actual current
   prop from the DOM or the original code if possible.
3. **Children prop**: `Text.children` is the text content — render as a textarea, not
   a generic string input.
4. **Timing fields** (`startAt`, `durationInFrames`): These are in frames. Consider
   showing a "(Xf)" suffix or converting to seconds with the composition FPS.
5. **Array fields** (WordCycle `words`): Need add/remove/reorder UI. Can start simple
   with add/remove only.
6. **Style override applicability**: Only show `StyleOverrideSection` for components
   that render visible DOM elements (text, content, scenes — not layout/animation
   wrappers like FadeIn, Stagger).
7. **Re-selecting after swap**: When a component is swapped, the `elementId` stays the
   same but the registration changes. The settings panel should re-resolve on every
   render (or when `overlay[eid]?.swap` changes).

---

## Props Threading

The `onValuePatch` and `onStyleOverride` callbacks currently flow:

```
useAnimationEdit (PlayerCanvas)
  → AnimationEditLayer
    → AnimationToolbar
```

New flow:

```
useAnimationEdit (PlayerCanvas)
  → AnimationEditLayer         (keeps: highlight, hit-test, selection)
  → ToolsSettingsPanel         (new: receives overlay + callbacks)
    → AnimationElementSettings
```

The parent that owns `useAnimationEdit` needs to pass `overlay`, `onValuePatch`, and
`onStyleOverride` to wherever `ToolsSettingsPanel` is rendered. Check `EditorPage.tsx`
for how these are currently wired and extend accordingly.

---

## Files to Create

| File | Purpose |
|------|---------|
| `portal/src/components/editor/settings/AnimationElementSettings.tsx` | Main settings component |
| `portal/src/components/editor/animation/toolbars/zodFieldRenderer.tsx` | Zod type → UI control mapper |

## Files to Modify

| File | Change |
|------|--------|
| `portal/src/types/tools.ts` | Add `ANIMATION_ELEMENT` enum + `animationElementId` field |
| `portal/src/components/editor/ToolsSettingsPanel.tsx` | Add `ANIMATION_ELEMENT` branch |
| `portal/src/components/editor/animation/AnimationEditLayer.tsx` | Remove toolbar section, keep highlight + hit-test |
| Parent of `ToolsSettingsPanel` (EditorPage or similar) | Thread `overlay` + patch callbacks |
| Store tools (if needed) | Handle new tool type in `handleSelectTool` |

## Files to Delete (after migration)

Once verified working, the individual toolbar files can be removed:

- `toolbars/CounterToolbar.tsx`
- `toolbars/MediaToolbar.tsx`
- `toolbars/TextToolbar.tsx`
- `toolbars/TimingToolbar.tsx`
- `toolbars/WordCycleToolbar.tsx`
- `toolbars/IconToolbar.tsx`
- `AnimationToolbar.tsx` (the router component)

Keep `toolbars/shared.tsx` — it has reusable controls.
Keep `toolbars/types.ts` — shared types.
