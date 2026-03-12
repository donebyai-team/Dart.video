# 02 — Tokens and Theming

→ This spec covers design tokens, aspect presets, FramePreset, themes, styles, and StyleContext.
→ For how styles are consumed by components: see 03-component-library.md
→ For runtime injection: see 01-architecture.md

---

## Design Tokens

Tokens are defined in `animation-core/tokens`. They follow shadcn conventions so the LLM already understands the naming.

### ColorTokens

Every color has a paired foreground. The LLM never decides if text should be black or white — it always uses the foreground token for a given background.

```
background / foreground
card / cardForeground
popover / popoverForeground
primary / primaryForeground
secondary / secondaryForeground
muted / mutedForeground
accent / accentForeground
destructive / destructiveForeground
border
input
ring
success / successForeground
warning / warningForeground
info / infoForeground
```

### TypographyTokens

```
fontFamily:
  sans, mono

fontSize:
  xs | sm | base | lg | xl | 2xl | 3xl | 4xl | 5xl

fontWeight:
  thin(100) | light(300) | normal(400) | medium(500)
  semibold(600) | bold(700) | extrabold(800)

lineHeight:
  none(1) | tight(1.1) | normal(1.4) | relaxed(1.6) | loose(2)
```

### SpacingTokens

Numeric scale: 0, 1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96

### Semantic LLM Mapping

The LLM only sees semantic names. Internal implementation maps to token values.

**Typography (what LLM writes → internal token):**
```
caption   → fontSize.xs,  fontWeight.normal
label     → fontSize.sm,  fontWeight.medium
body      → fontSize.base, fontWeight.normal
subheading → fontSize.lg,  fontWeight.medium
heading   → fontSize.2xl, fontWeight.bold
display   → fontSize.4xl, fontWeight.extrabold
```

**Spacing (what LLM writes → token value):**
```
LLM uses token names directly: spacing[4], spacing[8] etc.
Allowed values in prompt: 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64 | 96
```

**LLM rules:**
- Never hardcode hex colors — use brand tokens or ColorToken names
- Never use arbitrary px values — use spacing tokens
- Never hardcode font sizes — use semantic typography names

---

## Theme

A theme is the user's brand identity. It is user-owned and changes per client.

### BrandObject shape

```
primary: string        — main brand color
secondary: string      — secondary brand color
bg: string             — background color
text: string           — primary text color
font: string           — font family name
logo?: string          — logo URL
```

Themes are created by users via the UI. No code contribution required to add a theme.

`resolveStyle` maps BrandObject → ColorTokens:
```
brand.primary    → tokens.primary (+ auto-computed primaryForeground)
brand.secondary  → tokens.secondary
brand.bg         → tokens.background
brand.text       → tokens.foreground
```

---

## Style

A style is a system-defined visual language preset. It defines structural rules that apply globally across all components in an animation.

### StyleConfig shape

```
motion:
  character: snappy | floaty | mechanical | playful | elastic
  easing: spring | ease | linear | bounce
  overshoot: boolean

shape:
  radii: { sm, md, lg, xl, full }

stroke:
  width: number
  color: string
  style: solid | dashed | rough

surface:
  fill: solid | none | glass | gradient
  shadow: none | flat | soft | hard | colored
  texture: none | grain | paper

type:
  family: sans | serif | mono | handwritten
  transform: none | uppercase | lowercase
  tracking: tight | normal | wide

cursor:
  shape: line | underscore | block | none
  behavior: blink | solid | fade

color:
  mode: solid | gradient | duotone | monochrome
  contrast: low | medium | high
```

### Easing resolver

A shared utility in `animation-styles` maps motion character to spring configs. Used by every primitive that has motion.

```
snappy    → damping: 20, stiffness: 300  (fast, no bounce)
floaty    → damping: 12, stiffness: 80   (slow, gentle)
mechanical → damping: 100, stiffness: 200 (no spring, linear feel)
playful   → damping: 8,  stiffness: 150  (bouncy, overshoots)
elastic   → damping: 6,  stiffness: 120  (strong overshoot)
```

### Launch styles

**Clean** — neutral, snappy spring, filled surfaces, soft shadows, sans-serif
**Bold** — zero radius, hard shadows, mechanical motion, uppercase, thick stroke
**Glass** — blur surfaces, colored shadows, floaty motion, tight tracking

### resolveStyle

```
resolveStyle(styleId, brand) → StyleConfig
```

Blends the style's structural rules with the user's brand colors. Same style with different brands produces visually distinct but structurally consistent results. Style provides rules. Brand provides palette.

---

## StyleContext

A single React context injected at the root composition. Every primitive and scene component reads from it. No style prop is passed manually anywhere in LLM-generated code.

```
const style = useContext(StyleContext)
```

Adding a new style requires no component changes — only a new entry in the style presets file.

---

## Aspect Presets

Defined in `animation-core/presets`. Six presets covering common video formats.

```
square    1080 × 1080   Instagram feed, no safe area
vertical  1080 × 1920   Reels, TikTok, Stories
                        safeArea: top 140, right 60, bottom 220, left 60
web       1920 × 1080   YouTube, presentations, no safe area
tall      1080 × 1350   Instagram portrait
slide     1080 × 1440   LinkedIn, slides
wide      2560 × 1080   Ultrawide, cinema
```

Safe area values for vertical represent platform UI overlap zones (status bar top, gesture nav bottom) for iOS/Android. Other presets add safe areas as platform requirements dictate.

### AspectPresetContext

The active AspectPreset is injected via context at the root. The SafeArea primitive reads safe area insets from this context — never from hardcoded values.

`getAnimationPrompt` receives the active AspectPreset and includes canvas dimensions in the prompt so the LLM understands the composition space.

---

## FramePreset Component

Defined in `animation-core`. The outermost wrapper in the root composition. Never used by the LLM.

### Responsibilities
- Sets exact width and height from the active AspectPreset
- Applies `overflow: hidden` to clip anything outside the frame
- Renders a dashed debug overlay showing safe area boundaries when `showSafeArea` is true

### Props
```
preset: AspectPreset       — required
showSafeArea?: boolean     — default false, enable in editor preview
scale?: number             — default 1, use < 1 for editor viewport fitting
children: ReactNode
```

The `scale` prop enables rendering a 1920×1080 composition at 50% size in the editor panel without affecting the actual Remotion render (which always uses scale 1).

---

## Contributor Guide — Adding a Style

1. Add a new entry to `animation-styles/presets/`
2. Define all StyleConfig fields — no field may be omitted
3. Run the style verification suite — checks every existing primitive renders without error under the new style
4. Add a preview thumbnail for the style picker UI (1080×1080, static frame 0)
5. Write one paragraph describing the style's design intent
6. Styles do not require any component code changes
