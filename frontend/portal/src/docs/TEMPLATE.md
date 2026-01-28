
# 🎬 Motion Graphic Template System (Runtime Editable)

A motion graphic template system where users can assemble videos out of multiple slides.
Each slide can load a **template**, and templates render like a **React UI with runtime-editable values**.

An example motion graphic: [[10K Followers Animation](https://www.animstats.com/templates/ten-k-followers-template)]
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
   Eg. [[Process Diagram](https://youtu.be/oBcVO_DuxGo?t=40)]
2. **Textual**
   Templates designed primarily for textual content.
   Eg.[[10K Followers Animation](https://www.animstats.com/templates/ten-k-followers-template)
3. **Abstract**
   No text—pure animation (e.g., SVG animation of a person waving).
   [[A jumping scaler](https://youtu.be/oBcVO_DuxGo?t=2)

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
      <EditableText style={props.left_title.style} onChange={onChange} isEditing={isEditing}>
        <span>
          {props.left_title.text}
        </span>
      </EditableText>

      onChange should receive whatever changed in the left_title object

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

# 🧩 **Template Package Specification**

Each video template is packaged with three JSON files:

```
/template-name/
   ├── schema.json
   ├── defaults.json
   └── preview.json
```

This specification ensures:

* LLM can generate valid input props
* Output can be validated
* Templates render consistently
* Editors can preview without user input

---

# 🧱 **1. `schema.json` — LLM + Validation Schema**

This file defines:

✔ What fields exist in the template
✔ Whether each field is optional or required
✔ Styling properties allowed for each field
✔ Enum restrictions for styling values (optional)
✔ Repeatable sections (arrays)
✔ Descriptions to guide LLM generation

> ✨ Note: The schema contains **no default values** and **no rendering metadata**.
> It exists solely for LLM + validation.

---

### 📦 **Schema Structure Rules**

* Top-level keys = field names directly (e.g., `title`, `subtitle`, `section-left`)
* Every field may have:
  * `description`
  * `optional`
  * `style` block
  * `items` block for repeatable arrays
* All values produced by LLM are **strings**
* No types are defined — we do not use `string`, `icon`, etc.
* Enums can restrict values if defined

---

### 📄 **Example `schema.json`**

```json
{
  "title": {
    "description": "Main title of the slide",
    "optional": false,
    "style": {
      "weight": {
        "optional": true,
        "enum": ["regular", "medium", "bold"]
      },
      "size": {
        "optional": true,
        "enum": ["S", "M", "L", "XL", "XXL"]
      },
      "color": { "optional": true }
    }
  },

  "subtitle": {
    "description": "Subtitle or supporting statement",
    "optional": true,
    "style": {
      "size": { "optional": true },
      "color": { "optional": true }
    }
  },

  "features": {
    "description": "List of product features",
    "min": 1,
    "max": 6,
    "optional": false,
    "style": {
      "color: { "optional": true } // section level styling
    },
    "item": {
      "text": {
        "description": "Feature description",
        "optional": false,
        "style": {
          "size": { "optional": true, "enum": ["S", "M"] },
          "color": { "optional": true }
        }
      },
      "icon": {
        "description": "Icon representing the feature",
        "optional": true,
        "style": {
          "color": { "optional": true }
        }
      }
    }
  }
}
```

# 📦 **2. `defaults.json` — Flattened Default Values**

This file provides default values for template fields.
Defaults are merged when LLM output is missing or omits optional fields.

> Format is flat for easy merging.

### 📄 **Example `defaults.json`**

```json
{
  "title.value": "Introducing AlphaOS",
  "title.style.size": "XL",
  "title.style.weight": "bold",
  "subtitle.value": "",
  "features[x].text.value": "Fast performance",
  "features[x].icon.value": "bolt",
  "features.min": 1,
  "features.max": 6
}
```

# 📸 **3. `preview.json` — Sample Example Output**

Contains a realistic example populated with content.

Used for:

✔ previewing template selection
✔ design QA
✔ regression tests

### 📄 **Example `preview.json`**

```json
{
  "title": {
    "value": "Tesla Autopilot",
    "style": { "size": "XL", "weight": "bold", "color": "primary" }
  },
  "subtitle": {
    "value": "Self-driving intelligence for everyday travel"
  },
  "features": {
    "style": {
      "color: "#000"
    },
    "min": 1,
    "max": 6,
    "items: [
    {
      "text": { "value": "Lane keeping & adaptive cruise" },
      "icon": { "value": "https://ico.png" }
    },
    {
      "text": { "value": "Automatic lane changes" },
      "icon": { "value": "swap" }
    }
  ]
  }
}
```

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
