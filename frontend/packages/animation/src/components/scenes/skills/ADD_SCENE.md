# Scene Template Design Prompt

Use this prompt when asking an LLM to create a new scene template similar in structure and quality to [MediaWithFeatures.tsx](/Users/shank/Documents/code/streamingfast/CoasterAI/frontend/packages/animation/src/components/scenes/assets/MediaWithFeatures.tsx).

## Prompt

```md
Design a new Remotion scene template for this animation system.

Follow the same overall engineering style as `MediaWithFeatures.tsx`:
- Build a self-contained scene component.
- Keep the layout polished, editable, and animation-friendly.
- Prefer clear structure, simple composition, and reusable assets.

### Scene Rules

1. The scene does not receive props.
2. All editable values must come from hooks.
3. Every editable element in the scene must have a unique `id`.
4. Use consistent naming for ids so repeated items stay predictable.

### Available Hooks

#### `useElement(id, defaultProps)`
Use this hook for every editable element.

It returns:
- `props`: `Omit<T, 'style'>`
  - This contains the merged element props except `style`.
- `containerStyle`: `React.CSSProperties`
  - This is the style for the outer wrapper that handles drag/transform behavior.
- `style`: `React.CSSProperties`
  - This is the user-overridden style for the element itself, including typography.

Important usage rules:
- Apply `containerStyle` to the wrapper around the element.
- Apply `style` to the element itself.
- Do not hardcode editable content directly if it should be user-controlled.

#### `useArray(group)`
Use this hook when the scene includes repeated items such as features, steps, cards, bullets, logos, or stats.

Rules:
- The hook returns the array of items for that group.
- For each repeated item, generate stable unique ids using the item index.
- Example pattern:
  - `iconasset-features-0`
  - `text-features-0`
  - `container-features-0`

### `useCurrentFrame()`
Use it to get the current frame number for animations and timing.


### Utility functions
Use shared text-measurement utilities from `core/assets`, not `measureText` directly.

#### `useTextMeasurement(style)`
Use this when a scene needs font-aware text metrics during render.

Use it for:
- word widths used in animation math
- line widths used in layout decisions
- any text measurement that must wait for the correct font

Usage rules:
- This is the default choice for new scenes.
- Call it with the same style the text will actually render with.
- Respect the `ready` flag before relying on `width()` or `box()`.
- If the scene cannot render correctly without real text metrics, return `null` or a safe fallback until `ready` is true.

#### `ClippedText`
Use this instead of `Text` when text will be revealed, masked, or moved inside an overflow-hidden viewport.

Use it for:
- width reveals
- staggered word entrances through a clipped wrapper
- masked slide-in text
- any text where glyphs might be clipped by a reveal container

Usage rules:
- Use plain `Text` when the full text stays visible the whole time.
- Use `ClippedText` when the scene needs a safe clipping wrapper around animated text.
- Keep scene timing and transforms outside the component; `ClippedText` only handles clip-safe layout.

### Assets Available for Scenes

Use these scene assets where appropriate:
- `MediaAsset`
- `Text`
- `ClippedText`
- `CardAsset`
- `IconAsset`
- `ArrayItem`


### Design Expectations

- Create a scene that feels production-ready and visually balanced.
- Prefer a strong visual hierarchy with clear focal points.
- Use motion intentionally; avoid unnecessary complexity.
- Make the scene easy to customize through hooks and element ids.
- Keep spacing, alignment, and composition clean.
- Use repeated structures through `useArray(...)` when the design has a list or grouped content.
- Wrap repeated editable content with `ArrayItem` when needed by the system.

### Implementation Guidance

- Import only the assets and hooks needed by the scene.
- Use `useCurrentFrame()` and Remotion interpolation helpers when animation is needed.
- Derive sizes from presets or element props where useful instead of hardcoding everything.
- Keep the JSX organized into clear visual sections.
- Use `CardAsset` for framed or highlighted content blocks.
- Use `IconAsset` and `Text` together for repeatable feature rows or callouts.
- Use `MediaAsset` for the primary image or video region.
- Do not import `measureText` from `@remotion/layout-utils` in new scenes; prefer `useTextMeasurement()`.
- If text is being clipped or revealed, prefer `ClippedText` over building a custom overflow-hidden text wrapper from scratch.

### Output Requirements

Generate:
1. A scene component.
2. A schema for editable fields.
3. A descriptor/registration object for the scene.
4. Clean ids for every editable element.
5. Hook-driven values for all editable content.

The output should look like a real scene template that can be dropped into this codebase and follow the same editable architecture as `MediaWithFeatures.tsx`.
```
