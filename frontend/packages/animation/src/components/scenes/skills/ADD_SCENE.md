Here’s a clean, structured Markdown version optimized as an LLM “skill” reference:

---

# 🎬 Scene Design Skill for LLM

## What is a Scene?

A **scene** is a visual representation of a concept from a video script.

* A full script is broken into sections like **Hook, Problem, Solution, Product, CTA**
* Each section can use **one or more scenes**
* The goal is to select and configure scenes that best represent the intent of each section

---

## Scene Selection Logic

* Each scene is tagged with **relevant sections**
* Each scene includes a **description**:

  * One-line summary of what it looks like
  * Optional usage examples
  * Optional example prop values
  * Additional hints (e.g., “use for pricing tiers”, “use for multi-ROI comparisons”)

> ⚠️ The description is the **most important field** — it must be concise and instantly understandable.

---

## Scene Design Principles

### 1. Base Structure

* Follow an existing component pattern (e.g., `PillCarousel`)
* Scenes can reuse other scenes/components (e.g., `TextStagger` for hero text)

### 2. Elements

* Every element must have:

  * A unique `id` (for interactivity, example id "textstagger" or "textstagger-left")
* All elements must include **default values**
* All Input props are key and its object, where key is the id of the element and value is the properties/props specific to that id. Eg. variant, style, text, speed, etc. 
* When a user click on an element, we should the object of that element with all its properties/props in the settings which user can modify.
* The same schema has to be exposed as Schema Architecture

### 3. Styling

* Each element has a `style` prop (CSS object)
* Styling must be **element-specific**
* It is an optional prop. If user changes any css property, it will be reflected in the style. 
* Default styles can be set in default config

### 4. Data Handling

* Use `ArrayItem` for arrays/objects requiring add/remove functionality
* For simple text/word lists, `ArrayItem` is **not required**

### 5. Animation Speed
* Each element or scene can expose a speed attribute using which animation speed can be controlled. Instead of exposing many params like animation delay, hold etc., use a single speed attribute.
* use `timings.ts` for common functions to calculate animation duration based on speed.

### 6. Container styling
* If a scene has a card or a container which needs to be styled, use the `ContainerAsset` component. It has some common functions
* This is used if the scene has a card or wrapper which you'd want to style like chaging border, background color, depth, store etc.
* You should pass an id starting with "container" or "container-" prefix if there are multiple. 

---

## Schema Architecture

Each scene must define a **descriptor** containing:

### 1. Input Schema

* Raw input format

### 2. LLM Schema

* Format expected from the LLM

### 3. Mapping

* Converts LLM schema → Scene schema

### 4. Scene Schema

* Final structure used by the frontend for rendering

---

## Behavior & Logic

* Scenes **own all animation logic**
* Scenes must define a `celExpression` for duration:

  * Static example: `10` (simple scenes)
  * Dynamic example: `10 + animationDuration`
  * Units: **frames (30fps)**

---

## Layout & Rendering

* Scenes are automatically wrapped with:

  * `SafeArea`
  * `AbsoluteCenter`
* Default layout is **centered**
* Scenes should be **responsive** unless impractical

---

## Utilities

* Use `@measureText.tsx` when text measurement is required

---

## Key Guidelines

* Keep scenes **modular and reusable**
* Prefer **simple, editable structures**
* Ensure **every element is selectable and configurable**
* Descriptions must enable **fast and accurate scene selection by LLM**
