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

### 3. Styling

* Each element has a `style` prop (CSS object)
* Styling must be **element-specific**
* Do not define `style` in schema (already available)
* Default styles can be set in default config

### 4. Data Handling

* Use `ArrayItem` for arrays/objects requiring add/remove functionality
* For simple text/word lists, `ArrayItem` is **not required**

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
