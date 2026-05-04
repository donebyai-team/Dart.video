# Element Style API

Use this pattern when generating or editing animation scene components.

## Core Rule

Use one `useElement` call per patchable/editable visual object, not per DOM node.

```tsx
const el = useElement(id, Defaults, initProps);
const { props } = el;
```

Internal words, characters, SVG paths, card faces, and media layers do not need their own `useElement` unless the schema exposes them as separate editable elements.

Core render assets such as `Text`, `ImageAsset`, `VideoAsset`, and `IconAsset` are prop-only primitives. Do not put patch logic inside them and do not rely on them to read patch context. If they need editable values, resolve those values in the parent scene with `useElement` and pass them as normal props.

## Root Element

The patchable object root must receive `el.rootProps` and `el.rootStyle(...)`.

```tsx
return (
  <span
    {...el.rootProps}
    style={el.rootStyle({
      typography: true,
      base: {
        display: 'inline-block',
        opacity: progress,
      },
      transform: getEntranceTransform(props.entranceAnimation, progress),
    })}
  >
    {props.text}
  </span>
);
```

`rootStyle` owns object-level concerns:

- patch style
- drag transform
- component/root transform
- transform composition
- root opacity/layout
- optional typography

Do not spread `props.style` directly onto the root. `rootStyle` already applies it safely.

## Internal Children

Use `el.childStyle(...)` for internal animation pieces such as words, characters, cards, or highlight spans.

```tsx
{words.map((word, index) => (
  <span
    key={`${word}-${index}`}
    style={el.childStyle({
      base: {
        display: 'inline-block',
        marginRight: index < words.length - 1 ? '0.25em' : 0,
        opacity: wordProgress,
      },
      transform: getEntranceTransform(props.entranceAnimation, wordProgress),
    })}
  >
    {word}
  </span>
))}
```

`childStyle` is for internal piece-level rendering. It includes safe user style without root transform, and it does not include drag or patched root transforms.

```tsx
<ImageAsset
  image={props.image}
  width={props.width}
  height={props.height}
  style={el.childStyle({ base: { objectFit: 'contain' } })}
/>
```

## Inner Text

Use `el.textStyle(...)` when the actual text is inside an inner node instead of directly on the root.

```tsx
<span {...el.rootProps} style={el.rootStyle({ base: { display: 'inline-block' } })}>
  <span
    style={el.textStyle({
      base: {
        whiteSpace: 'pre-wrap',
        opacity: progress,
      },
    })}
  >
    {props.text}
  </span>
</span>
```

`textStyle` includes resolved typography by default when `props.variant` exists. It also applies safe user text style without leaking root transform into the inner text node.

Use `typography: false` when the root already owns typography or when passing style into a component that resolves typography itself.

```tsx
const textOverrides = el.textStyle({ typography: false });
```

## Typography

Do not call `useTypography` directly in generated templates.

Instead:

- Use `el.rootStyle({ typography: true })` when typography belongs on the root.
- Use `el.textStyle()` when typography belongs on an inner text node.
- Use `el.childStyle()` for non-text inner primitives.
- Use `el.typography` only for measurement/layout math, such as estimating text width or font size.
- Use `el.fontSizePx` when layout math needs a numeric font size. Do not parse `fontSize` inside a scene.

## Prompt Contract

When generating a scene:

- Create defaults with `id`, editable props, optional `className`, and optional `style`.
- Resolve the element with `const el = useElement(id, Defaults, initProps)`.
- Put `{...el.rootProps}` on the patchable root.
- Put `el.rootStyle(...)` on the patchable root.
- Use `el.childStyle(...)` for internal animated pieces.
- Use `el.textStyle(...)` for inner text nodes.
- Never spread `props.style` directly.
- Never manually compose drag or patch transforms.
- Never parse CSS `fontSize` inside the scene; use `el.fontSizePx`.
- Keep template-specific animation values inside `base` and `transform`.
