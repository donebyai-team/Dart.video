```markdown
# Scene Rendering & LLM Integration Spec

## Overview

This system converts **LLM-generated scene props** into a **normalized scene patch** using a **schema-driven renderer**, and can also convert patches **back to LLM-editable format**.

The renderer is designed to be **idempotent**, meaning:

```

Render(Render(scene)) == scene

````

This allows LLMs to safely edit scenes repeatedly.

---

# Core Concepts

## SceneElement (LLM Input)

Represents a scene returned by the LLM.

```go
type SceneElement struct {
    Component string
    Props     map[string]interface{}
    Children  []SceneElement
}
````

Props may be:

* **LLM props**
* **partial patch**
* **final patch**

---

## SceneConfig (Internal Representation)

Normalized scene structure after rendering.

```go
type SceneConfig struct {
    ID       string
    Name     string
    Props    map[string]interface{}
    Children []SceneConfig
}
```

---

# Scene Schema

Each scene defines a **schema** describing how props map to components.

Example:

```json
{
  "type": "repeat",
  "source": "icons",
  "map": "props.icons",
  "components": [
    {
      "name": "iconasset",
      "fields": [
        {
          "name": "icon",
          "type": "string",
          "map": "item",
          "dataType": "icon"
        },
        {
          "name": "size",
          "type": "number",
          "default": 90
        }
      ]
    }
  ]
}
```

---

# Field Schema

```go
type FieldSchema struct {
    Name     string
    Type     string
    Subtype  string
    Map      string
    Default  interface{}
    DataType string
}
```

### Field Resolution Priority

When rendering a field:

```
existing value
↓
mapped value
↓
default
↓
datatype mapper
```

---

# Repeat Components

Repeat blocks generate multiple component instances from arrays.

Example LLM input:

```json
{
  "icons": ["openai", "google"]
}
```

Generated patch:

```json
{
  "iconasset-icons-0": { "icon": "openai" },
  "iconasset-icons-1": { "icon": "google" }
}
```

---

# Repeat Key Format

Component instances follow this format:

```
{componentName}-{repeatSource}-{index}
```

Example:

```
iconasset-icons-0
iconasset-icons-1
textstagger-features-0
```

Benefits:

* identifies repeat group
* deterministic reverse mapping
* supports multiple repeats using same component

---

# Mapping System

Fields may define a `dataType`.

Example:

```
dataType: "icon"
```

Mapping is handled by a **global resolver registry**.

---

## Resolver Interface

```go
type FieldResolver interface {
    Forward(value any, registry *MediaAssetRegistry) (any, error)
    Reverse(value any, registry *MediaAssetRegistry) (any, error)
}
```

---

## Resolver Registry

```go
type ResolverRegistry struct {
    resolvers map[string]FieldResolver
}
```

Usage:

```
ResolveForward(dataType, value)
ResolveReverse(dataType, value)
```

Example mapping:

```
openai → https://cdn/icons/openai.svg
```

Reverse mapping:

```
https://cdn/icons/openai.svg → openai
```

---

# Render Modes

Render supports two transformation directions.

| Mode    | Purpose           |
| ------- | ----------------- |
| Forward | LLM props → patch |
| Reverse | patch → LLM patch |

Enum:

```go
type ResolveDirection int

const (
    ResolveForward ResolveDirection = iota
    ResolveReverse
)
```

---

# Render Pipeline

## 1. LLM Props → Patch

```
LLM props
↓
Render(Forward)
↓
Scene patch
```

Example:

```
icons: ["openai"]
```

↓

```
iconasset-icons-0: { icon: "https://cdn/.../openai.svg" }
```

---

## 2. Patch → LLM Patch

```
patch
↓
Render(Reverse)
↓
LLM patch
```

Example:

```
iconasset-icons-0: { icon: "https://cdn/.../openai.svg" }
```

↓

```
iconasset-icons-0: { icon: "openai" }
```

---

## 3. LLM Patch → Patch

```
LLM patch
↓
Render(Forward)
↓
normalized patch
```

---

# resolveFields Behavior

Unknown fields are preserved.

Example:

Input patch:

```json
{
  "iconasset-icons-0": {
    "icon": "openai",
    "customColor": "red"
  }
}
```

Output:

```json
{
  "iconasset-icons-0": {
    "icon": "https://cdn/.../openai.svg",
    "customColor": "red"
  }
}
```

Unknown fields bypass mapping.

---

# Repeat Detection

Repeat blocks support two modes.

### 1. LLM Array Mode

```
props.icons → repeat expansion
```

### 2. Existing Patch Mode

```
iconasset-icons-0
iconasset-icons-1
```

Renderer detects existing instances and normalizes them.

---

# Design Principles

### Schema-driven rendering

All conversions are controlled by the scene schema.

### Idempotent rendering

```
Render(Render(scene)) == scene
```

### Separation of concerns

| Layer    | Responsibility           |
| -------- | ------------------------ |
| Render   | schema normalization     |
| Resolver | datatype transformations |
| Schema   | mapping rules            |

---

# Benefits

* LLM-safe editing
* deterministic rendering
* repeat normalization
* bidirectional transformations
* extensible datatype system
* patch-friendly architecture

```

---

If you'd like, I can also produce a **clean architecture diagram of this system (renderer + schema + resolvers + LLM loop)** which makes it much easier for new engineers to understand the flow.
```
