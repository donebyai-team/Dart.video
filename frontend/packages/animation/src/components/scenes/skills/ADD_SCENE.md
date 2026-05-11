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
Use `import {measureText} from '@remotion/layout-utils';` for text measurement. Needed when measuring text or word wrapping.

### Assets Available for Scenes

Use these scene assets where appropriate:
- `MediaAsset`
- `Text`
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

### Output Requirements

Generate:
1. A scene component.
2. A schema for editable fields.
3. A descriptor/registration object for the scene.
4. Clean ids for every editable element.
5. Hook-driven values for all editable content.

The output should look like a real scene template that can be dropped into this codebase and follow the same editable architecture as `MediaWithFeatures.tsx`.
```
