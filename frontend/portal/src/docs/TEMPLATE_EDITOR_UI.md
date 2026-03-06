# Toolbar Editing — Feature Specification

---

## Overview

When a user clicks any element in the animation preview, a toolbar appears above the player showing controls relevant to that element type. The toolbar reads from the element registry to know what controls to show, and writes all changes to the edit store.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Toolbar (context-sensitive)                                         │
├──────────────────────────────────────────────────────────────────────┤
│  [Inter ▼] [24px ▲▼] [B][I][U]  [■ #fff ▼]  [▨ transparent ▼]      │
└──────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────┐
│  Animation Preview (Remotion Player)                                 │
│                                                                      │
│         ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐                                    │
│           Hello World            ← selected element                  │
│         └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                                    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Toolbar States

### No element selected

```
┌──────────────────────────────────────────────────────────────────────┐
│  Click an element to edit                                            │
└──────────────────────────────────────────────────────────────────────┘
```

### Element selected — toolbar shows controls based on type

The toolbar renders one of four control sets depending on what the registry says about the selected element. These are covered in detail below.

---

## Element Types & Their Toolbar Controls

### 1. Text Element

**Condition:** `registry[eid].textType === "static"`

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Inter           ▼] [24 ▲▼] [B][I][U][S]  │ [■ #fff ▼] [▨ bg  ▼]  │
│  font family        size  decoration        color       background   │
└──────────────────────────────────────────────────────────────────────┘
```

**Controls:**

| Control | Type | Reads from | Writes to |
|---|---|---|---|
| Font family | Dropdown (searchable) | `staticStyle.fontFamily` | `edit.style.fontFamily` |
| Font size | Number input + stepper | `staticStyle.fontSize` | `edit.style.fontSize` |
| Bold | Toggle button | `staticStyle.fontWeight` | `edit.style.fontWeight` |
| Italic | Toggle button | `staticStyle.fontStyle` | `edit.style.fontStyle` |
| Underline | Toggle button | `staticStyle.textDecoration` | `edit.style.textDecoration` |
| Strikethrough | Toggle button | `staticStyle.textDecoration` | `edit.style.textDecoration` |
| Text color | Color picker | `staticStyle.color` | `edit.style.color` |
| Background | Color picker | `staticStyle.background` | `edit.style.background` |

**Text color picker** shows the `A` icon with a colored underline reflecting the current value.
**Background picker** shows the `▨` icon with the current background fill.

**Inline text editing** is triggered by double-clicking the element directly on the canvas — not from the toolbar. The toolbar shows a subtle hint: `✏ Double-click to edit text`.

When inline editing is active:

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Inter           ▼] [24 ▲▼] [B][I][U][S]  │ [■ #fff ▼]  [✓ Done]  │
└──────────────────────────────────────────────────────────────────────┘

              ┌──────────────────────────┐
              │  Hello Worl|             │  ← contenteditable overlay
              └──────────────────────────┘
```

- `Done` button or `Enter` commits the text to `edit.text`
- `Escape` cancels without saving
- The contenteditable overlay is positioned exactly over the real element using its `getBoundingClientRect()`
- Font, size, and color from the toolbar apply in real time during editing

---

### 2. Image Element

**Condition:** `registry[eid].assetType === "image"`

```
┌──────────────────────────────────────────────────────────────────────┐
│ [⬆ Replace Image]  │  [W: 200px ▲▼]  [H: 150px ▲▼]  [Fit: cover ▼] │
└──────────────────────────────────────────────────────────────────────┘
```

**Controls:**

| Control | Type | Reads from | Writes to |
|---|---|---|---|
| Replace image | File upload button | `staticSrc` | `edit.asset` |
| Width | Number input + stepper | `staticStyle.width` | `edit.style.width` |
| Height | Number input + stepper | `staticStyle.height` | `edit.style.height` |
| Object fit | Dropdown | `staticStyle.objectFit` | `edit.style.objectFit` |

**Replace image** opens a file picker. On selection the image is uploaded to your CDN and the returned URL is written to `edit.asset`. The preview updates immediately via `__patchAsset`.

Object fit options: `cover`, `contain`, `fill`, `none`.

---

### 3. Icon Element

**Condition:** `registry[eid].assetType === "icon"`

```
┌──────────────────────────────────────────────────────────────────────┐
│ [⬡ SearchIcon  ▼ (opens grid)]  │  [■ #fff ▼]  [32px ▲▼]           │
│   icon picker                       color        size                │
└──────────────────────────────────────────────────────────────────────┘
```

**Controls:**

| Control | Type | Reads from | Writes to |
|---|---|---|---|
| Icon picker | Dropdown with searchable grid | `iconName` | `edit.icon` |
| Color | Color picker | `staticStyle.color` | `edit.style.color` |
| Size | Number input + stepper | `staticStyle.fontSize` | `edit.style.fontSize` |

**Icon picker dropdown** shows a searchable grid of all icons in your icon registry. Current icon is highlighted. Selecting a new icon calls `__patchIcon` on next render.

---

### 4. Layout / Container Element

**Condition:** Element has no text, no asset — it's a structural `div`, `AbsoluteFill`, or similar.

```
┌──────────────────────────────────────────────────────────────────────┐
│ [▨ #000 ▼]  [⬡ radius: 4px ▲▼]  [◎ opacity: 1 ░░░░░░░░░░░░]        │
│  background    border radius         opacity slider                  │
└──────────────────────────────────────────────────────────────────────┘
```

**Controls:**

| Control | Type | Reads from | Writes to |
|---|---|---|---|
| Background | Color picker | `staticStyle.background` | `edit.style.background` |
| Border radius | Number input + stepper | `staticStyle.borderRadius` | `edit.style.borderRadius` |
| Opacity | Slider (0–1) | `staticStyle.opacity` | `edit.style.opacity` |

Only controls for properties that exist in `staticStyle` or `editableProps` are shown. If the element has no `borderRadius` in the registry, that control is not rendered.

---

### 5. Animated / Prompt-Only Properties

When the selected element has properties in `nonEditable` or `animatedProps` that cannot be surfaced as simple controls, a warning section appears at the right end of the toolbar:

```
┌──────────────────────────────────────────────────────────────────────┐
│ [▨ #4f46e5 ▼]  [◎ opacity ░░░░░░░]  │  ⚠ transform · height        │
│                                           use prompt to edit          │
└──────────────────────────────────────────────────────────────────────┘
```

The warning lists the non-editable property names. Clicking the warning opens the prompt input scoped to that element.

For `animatedProps` that are directly interceptable (interpolate output range or spring config), optional controls can be shown if needed in future:

| Animated type | Future control |
|---|---|
| `interpolate` | From / To number inputs |
| `spring` | Damping + stiffness sliders |

These are out of scope for the initial toolbar but the registry already has the data to support them.

---

## Control Rendering Logic

```typescript
function buildToolbarControls(eid: string): Control[] {
  const entry   = registry[eid];
  const current = {
    ...entry.staticStyle,
    ...(editStore[eid]?.style ?? {})
  };
  const controls: Control[] = [];

  // ── TEXT ────────────────────────────────────────────────────
  if (entry.textType === 'static') {
    if ('fontFamily' in current)
      controls.push({ type: 'font-family', prop: 'fontFamily', value: current.fontFamily });

    if ('fontSize' in current)
      controls.push({ type: 'number', prop: 'fontSize', value: current.fontSize,
                      unit: 'px', min: 8, max: 300 });

    controls.push({ type: 'font-weight',     prop: 'fontWeight',     value: current.fontWeight });
    controls.push({ type: 'font-style',      prop: 'fontStyle',      value: current.fontStyle });
    controls.push({ type: 'text-decoration', prop: 'textDecoration', value: current.textDecoration });
    controls.push({ type: 'separator' });
    controls.push({ type: 'color', prop: 'color',      value: current.color,      label: 'A' });
    controls.push({ type: 'color', prop: 'background', value: current.background, label: '▨' });
    controls.push({ type: 'separator' });
    controls.push({ type: 'inline-edit-hint' });
    return controls;
  }

  // ── IMAGE ────────────────────────────────────────────────────
  if (entry.assetType === 'image') {
    controls.push({ type: 'asset-upload', prop: 'asset', value: editStore[eid]?.asset ?? entry.staticSrc });
    if ('width'     in current) controls.push({ type: 'number', prop: 'width',     value: current.width,     unit: 'px' });
    if ('height'    in current) controls.push({ type: 'number', prop: 'height',    value: current.height,    unit: 'px' });
    if ('objectFit' in current) controls.push({ type: 'select', prop: 'objectFit', value: current.objectFit,
                                                options: ['cover', 'contain', 'fill', 'none'] });
    return controls;
  }

  // ── ICON ─────────────────────────────────────────────────────
  if (entry.assetType === 'icon') {
    controls.push({ type: 'icon-picker', prop: 'icon',     value: editStore[eid]?.icon ?? entry.iconName });
    controls.push({ type: 'color',       prop: 'color',    value: current.color });
    controls.push({ type: 'number',      prop: 'fontSize', value: current.fontSize, unit: 'px', min: 8, max: 200 });
    return controls;
  }

  // ── LAYOUT / CONTAINER ───────────────────────────────────────
  if ('background' in current || 'backgroundColor' in current)
    controls.push({ type: 'color', prop: 'background', value: current.background ?? current.backgroundColor, label: '▨' });

  if ('borderRadius' in current)
    controls.push({ type: 'number', prop: 'borderRadius', value: current.borderRadius, unit: 'px', min: 0 });

  if ('opacity' in current)
    controls.push({ type: 'slider', prop: 'opacity', value: Number(current.opacity), min: 0, max: 1, step: 0.01 });

  // ── PROMPT FALLBACK (appended to any type if nonEditable exists) ──
  if (entry.nonEditable.length > 0) {
    controls.push({ type: 'separator' });
    controls.push({ type: 'prompt-hint', props: entry.nonEditable });
  }

  return controls;
}
```

---

## Inline Text Editing Implementation

Double-clicking a text element on the canvas activates inline editing. A `contenteditable` div is placed exactly over the element.

```typescript
function activateInlineEdit(eid: string) {
  const domEl     = document.querySelector(`[data-eid="${eid}"]`);
  const rect      = domEl.getBoundingClientRect();
  const playerRect = playerContainer.getBoundingClientRect();

  const editor = document.createElement('div');
  editor.contentEditable = 'true';
  editor.innerText = editStore[eid]?.text ?? registry[eid].staticText ?? '';

  const computed = window.getComputedStyle(domEl);

  Object.assign(editor.style, {
    position:   'absolute',
    left:       `${rect.left - playerRect.left}px`,
    top:        `${rect.top  - playerRect.top}px`,
    width:      `${rect.width}px`,
    minHeight:  `${rect.height}px`,
    font:       computed.font,
    color:      computed.color,
    lineHeight: computed.lineHeight,
    textAlign:  computed.textAlign,
    letterSpacing: computed.letterSpacing,
    background: 'rgba(255,255,255,0.06)',
    outline:    '2px solid #4f46e5',
    borderRadius: '2px',
    cursor:     'text',
    zIndex:     9999,
    whiteSpace: 'pre-wrap',
  });

  overlayContainer.appendChild(editor);
  editor.focus();

  // Select all on activation
  const range = document.createRange();
  range.selectNodeContents(editor);
  window.getSelection()?.removeAllRanges();
  window.getSelection()?.addRange(range);

  editor.addEventListener('blur', () => commitEdit(eid, editor));
  editor.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(eid, editor); }
    if (e.key === 'Escape') { editor.remove(); setInlineEditing(false); }
  });
}

function commitEdit(eid: string, editor: HTMLElement) {
  const newText = editor.innerText.trim();
  if (newText && newText !== registry[eid].staticText) {
    applyEdit(eid, { text: newText });
  }
  editor.remove();
  setInlineEditing(false);
}
```

---

## Edit Store Write Path

All toolbar controls write through a single function regardless of control type:

```typescript
function onToolbarChange(eid: string, prop: string, value: any) {
  if (prop === 'asset') {
    applyEdit(eid, { asset: value });
    return;
  }
  if (prop === 'icon') {
    applyEdit(eid, { icon: value });
    return;
  }
  applyEdit(eid, { style: { [prop]: value } });
}

// applyEdit merges into store and triggers re-render
function applyEdit(eid: string, patch: Partial<ElementEdit>) {
  setEditStore(prev => {
    const next = deepMerge(prev, { [eid]: patch });
    window.__EDIT_STORE__ = next;
    debouncedSave(next);
    return next;
  });
}
```

---

## Toolbar Component

```tsx
function EditorToolbar({ selected }: { selected: string | null }) {
  if (!selected) {
    return (
      <div className="toolbar toolbar--empty">
        <span>Click an element to edit</span>
      </div>
    );
  }

  const controls = buildToolbarControls(selected);

  return (
    <div className="toolbar">
      {controls.map((control, i) => {
        if (control.type === 'separator')
          return <div key={i} className="toolbar__sep" />;

        if (control.type === 'inline-edit-hint')
          return <span key={i} className="toolbar__hint">✏ Double-click to edit text</span>;

        if (control.type === 'prompt-hint')
          return (
            <div key={i} className="toolbar__prompt-hint">
              <span>⚠ {control.props.join(' · ')}</span>
              <button onClick={() => openPromptForElement(selected)}>
                Use prompt
              </button>
            </div>
          );

        return (
          <ToolbarControl
            key={control.prop}
            control={control}
            onChange={value => onToolbarChange(selected, control.prop, value)}
          />
        );
      })}
    </div>
  );
}
```

---

## Interaction Summary

| User action | Result |
|---|---|
| Click element | Select element, toolbar shows relevant controls |
| Double-click text element | Activates inline text editor on canvas |
| Change font family | Writes `edit.style.fontFamily`, player re-renders |
| Change color | Writes `edit.style.color`, player re-renders |
| Toggle bold | Writes `edit.style.fontWeight: "700"` or `"400"` |
| Upload image | Uploads to CDN, writes `edit.asset`, player re-renders |
| Pick icon | Writes `edit.icon`, `__patchIcon` swaps component |
| Press Enter in text editor | Commits text to `edit.text`, closes editor |
| Press Escape | Cancels inline edit or deselects element |
| Click canvas (no element) | Deselects, toolbar returns to empty state |
| Click ⚠ Use prompt | Opens prompt input scoped to selected element |

---

## Degradation Rules

The toolbar never shows a control for a property that does not appear in `editableProps` or `staticStyle`. If a property exists but has `confidence: "low"` (came from a spread or ternary in the AST), the control is shown with a `⚠` indicator next to it but remains functional.

```
confidence: "high"  →  normal control
confidence: "low"   →  control + ⚠ tooltip: "Value may not reflect original"
nonEditable         →  no control, listed in prompt-hint at end of toolbar
textType: "animated"→  no text input, included in prompt-hint
```