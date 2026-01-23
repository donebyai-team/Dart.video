
# 🎬 Motion Graphic Template System (Runtime Editable)

A motion graphic template system where users can assemble videos out of multiple slides.
Each slide can load a **template**, and templates render like a **React UI with runtime-editable values**.

---

## 📌 What is a Template?

A **template** is a motion graphic animation built using React.
A video may have multiple slides, and each slide may use any template.

Templates consist of:

* Layout (static)
* Animation timeline (static)
* Editable elements (text, icon, image)
* Configurable props passed from the editor at runtime

Think of it as:

> Canva-like template selection but with **strict constraints** on how much the user can modify.

---

## 🎨 Elements

Elements inside templates include:

* **Text**
* **Icon**
* **Image** *(optional, might not be needed initially)*

---

## 🏷 Template Categories

Each template belongs to one high-level category:

1. **Infographic**
   Visual representation of information/data (e.g., charts, diagrams).
2. **Textual**
   Templates designed primarily for textual content.
3. **Abstract**
   No text—pure animation (e.g., SVG animation of a person waving).

---

## ✏️ Editing a Template (Inside the Editor)

Users can choose from the available templates and **edit limited properties**.

### ✅ Allowed (Editable)

Users can modify:

* Text values
* Font family
* Font size
* Text colors (stroke + background)
* Icon type (from icon list)
* Icon color
* *(Optional)* Image content (uploaded by user)

### ❌ Not Allowed (Strictly Disabled)

Users **cannot**:

* Move elements
* Resize elements
* Reposition elements
* Change animations
* Modify timeline
* Modify transitions

> All layout and motion are static; only content & styling edits are allowed.

---

## ➕➖ Adding or Removing Template Sections

Some templates support dynamic section duplication via `+` and `-` buttons.

Example:

If a template shows **4 animated cards** (each with icon + text):

```
[Card1] → [Card2] → [Card3] → [Card4]
```

The user may choose to:

* Add a card (duplicate existing pattern)
* Remove a card

The template must:

* Auto-adjust layout based on section count
* Respect system-defined `min` and `max` section sizes

> Similar UX to **napkin.ai**, where users add/remove nodes in a visual.

---

## 🛠 Defining Section Constraints

Every dynamic template must define:

```ts
minSections
maxSections
```

This prevents layout distortion (e.g. too few or too many cards).

---

# 🧱 Building Templates in React

Templates are built using reusable wrapper components enabling editing logic.

### Available Components

| Element | Wrapper            |
| ------- | ------------------ |
| Text    | `<EditableText />` |
| Icon    | `<EditableIcon />` |
| Image   | *(optional)*       |

These wrappers provide:

* Click handlers
* In-place editing
* UI toolbars
* Value callbacks to root editor

These live inside a `lib/` folder for reuse.

---

## 📝 `<EditableText />`

Wraps text elements and enables editing.

### Features

When user clicks a text:

* A rectangle highlights the area
* A `<textarea>` appears for in-place text editing (similar to napkin.ai)
* Toolbar appears with:

  * Font dropdown
  * Color picker button
  * Font size dropdown (`M / S / L / XL / XXL`)
* Changed values (`text`, `style`) propagate to root editor via callback

---

## 🎯 `<EditableIcon />`

Wraps icon elements and enables icon swapping.

### Features

When user clicks an icon:

* A rectangle highlights selection
* A floating toolbar appears with:

  * Button to open icon selector dialog (list of icons)
  * Icon color picker
* Emits `icon` + styling to root via callback
* Accepts icon fetch function as prop from root:

```ts
fetchIcons: () => Promise<IconList>
```

---

# 📦 Example Template Code

```jsx
function MyTemplateAnimation(props, isEditing) {
  const frame = useVideoConfig(); // animation logic

  return (
    <>
      <EditableText isEditing={isEditing}>
        <span style={{ color: props.color, fontSize: props.size }}>
          {props.text}
        </span>
      </EditableText>

      <EditableIcon isEditing={isEditing}>
        <img src={props.icon} />
      </EditableIcon>
    </>
  );
}
```

### Example props:

```json
{
  "text": "Hello world",
  "color": "#000",
  "size": "XL",
  "icon": "https://myicon.svg"
}
```

The wrapper components handle editing; the template focuses on animation.

---

# 📤 Compiling & Deploying Templates

Once a template is complete:

1. Compile it to a `.mjs` file
2. Upload to S3
3. Editor loads it by `templateId`

---

# 🖥 Using Templates in the Editor

Workflow inside the editor:

1. Display list of templates
2. User selects a template
3. System downloads its `.mjs`
4. Template renders inside the slide with runtime props

Example runtime:

```ts
loadTemplate(templateId) {
  const module = await importFromS3(templateId + ".mjs");
  render(<module.Template {...props} />);
}
```

---

# 🧩 Summary

✔ Templates are React animations
✔ User edits content, not layout
✔ Dynamic sections allowed (with constraints)
✔ Editable wrappers abstract logic
✔ Templates compile to `.mjs` and load on demand
