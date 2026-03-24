# COMPONENT LIBRARY SPEC

## TAXONOMY

| Type | Can contain | Can be sibling of |
|------|------------|-------------------|
| Scene | Layout, Motion, Static, Dynamic, Asset Primitives | Nothing — stands alone |
| Block | Layout, Motion, Static, Dynamic, Asset Primitives | Blocks, Primitives |
| Layout Primitive | Any Primitive or Block | Any Primitive or Block |
| Motion Primitive | One Static, Dynamic, Asset Primitive, or Block | Any Primitive or Block |
| Static Primitive | Nothing | Any Primitive or Block |
| Dynamic Primitive | Nothing | Any Primitive or Block |
| Asset Primitive | Nothing | Any Primitive or Block |

---

## RULES

**Scenes** — standalone, no siblings, no mixing with other components outside.

**Motion Primitives** — wrap exactly one child. Never wrap a Layout Primitive.
  Stagger and TimelineGate are Motion Primitives.

**Static and Asset Primitives** — no built-in animation.
  Wrap in a Motion Primitive to animate.
  Set startAt on the Motion Primitive, not on the primitive itself.

**Dynamic Primitives** — self-animating. Never wrap in a Motion Primitive.
  Set startAt directly on the primitive.

**Layout Primitives** — structural only, no animation, no styling.
  Every visible element must live inside a Layout Primitive.
  SafeArea is always implicit — never include it in the element tree.

---

## COMPONENTS

### Scenes
| Name | Description |
|------|-------------|
| TitleCard | Hero title with heading, subheading, and optional eyebrow |

### Blocks
| Name | Description |
|------|-------------|
| — | More coming |

### Layout Primitives
| Name | Description |
|------|-------------|
| SafeArea | Outermost canvas boundary — implicit, never declare |
| Stack | Vertical arrangement of children |
| Row | Horizontal arrangement of children |
| AbsoluteCenter | Centers a single child on the full canvas |

### Motion Primitives
| Name | Description |
|------|-------------|
| FadeIn | Fades an element in from transparent to fully visible |
| SlideIn | Slides an element in from outside the canvas edge |
| ScaleIn | Scales an element up from small to full size |
| FadeOut | Fades an element out from visible to transparent |
| SlideOut | Slides an element out toward the canvas edge |
| ScaleOut | Scales an element down from full size to nothing |
| Stagger | Reveals Motion Primitive children one after another with a delay |
| TimelineGate | Shows its child only within a defined time window |

### Static Primitives
| Name | Description |
|------|-------------|
| Text | Static string — use for headings, labels, body copy |

### Dynamic Primitives
| Name | Description |
|------|-------------|
| Counter | Animates a number to a target value |
| Typewriter | Reveals text character by character |
| WordCycle | Cycles through a list of words with transitions |

### Asset Primitives
| Name | Description |
|------|-------------|
| LogoAsset | Brand logo from theme — use in title and outro scenes |
| IconAsset | Icon by name from library — use for decorative visual cues |
| ImageAsset | Static image from URL — use for product screens and photos |
| VideoAsset | Video file — use for tutorials and explainer content |