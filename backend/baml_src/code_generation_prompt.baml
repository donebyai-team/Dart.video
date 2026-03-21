template_string CodeGeneration() #"
## FRAME CONTRACT:

- Your component runs inside a managed animation runtime.
- It receives no props.
- Export as: export default function RemoteComponent() { ... }
- Remotion and all animation libraries are provided by the runtime — never import them.

## Available CANVAS size:
1920px × 1080px (web)

## LAYOUT

### SafeArea
Outermost content wrapper that applies safe area insets from the active aspect preset
Props:

### Stack
Vertical flex layout with spacing token values for gap
Props:
- gap: number (optional)
- align: string (optional)
- justify: string (optional)

### Row
Horizontal flex layout with spacing token values for gap
Props:
- gap: number (optional)
- align: string (optional)
- justify: string (optional)

### AbsoluteCenter
Centers child absolutely within nearest positioned parent
Props:
- axis: enum(x|y|both) (optional)


## ANIMATION PRIMITIVES

### FadeIn
Fade-in entrance animation (opacity 0 to 1)
Props:
- startAt: number (optional)
- durationInFrames: number (optional)

### FadeOut
Fade-out exit animation (opacity 1 to 0)
Props:
- startAt: number (optional)
- durationInFrames: number (optional)

### SlideIn
Slide-in entrance with translation and fade
Props:
- startAt: number (optional)
- durationInFrames: number (optional)
- direction: enum(up|down|left|right) (optional)
- distance: number (optional)

### SlideOut
Slide-out exit with translation and fade
Props:
- startAt: number (optional)
- durationInFrames: number (optional)
- direction: enum(up|down|left|right) (optional)
- distance: number (optional)

### ScaleIn
Scale-in entrance animation (scale 0 to 1)
Props:
- startAt: number (optional)
- durationInFrames: number (optional)
- origin: enum(center|top|bottom|left|right) (optional)

### ScaleOut
Scale-out exit animation (scale 1 to 0)
Props:
- startAt: number (optional)
- durationInFrames: number (optional)
- origin: enum(center|top|bottom|left|right) (optional)

### Stagger
Staggers children animations with increasing delay offsets
Props:
- startAt: number (optional)
- staggerDelay: number (optional)

### TimelineGate
Mounts/unmounts children within a frame window, use instead of JSX conditionals
Props:
- showAfter: number (required)
- hideAfter: number (optional)


## CONTENT

### Text
Static text element, wrap in FadeIn/SlideIn to animate
Props:
- variant: enum(caption|label|body|subheading|heading|display) (optional)

### Counter
Animated number counter that tweens between values
Props:
- startAt: number (optional)
- durationInFrames: number (optional)
- from: number (optional)
- to: number (required)
- format: string (optional)
- prefix: string (optional)
- suffix: string (optional)
- variant: enum(caption|label|body|subheading|heading|display) (optional)

### Typewriter
Progressively reveals text character by character, word, or line
Props:
- startAt: number (optional)
- durationInFrames: number (optional)
- text: string (required)
- mode: enum(char|word|line) (optional)
- variant: enum(caption|label|body|subheading|heading|display) (optional)

### WordCycle
Cycles through an array of words with animated transitions
Props:
- startAt: number (optional)
- words: array (required)
- holdDuration: number (optional)
- transitionDuration: number (optional)
- transition: enum(flipY|fadeSwap|slideUp) (optional)
- variant: enum(caption|label|body|subheading|heading|display) (optional)


## SCENES

### TitleCard
Pre-built hero title card composition with heading, subheading, and eyebrow
Props:
- heading: string (required)
- subheading: string (optional)
- eyebrow: string (optional)
- startAt: number (optional)


## BRAND

### LogoAsset
Brand logo from ThemeProvider. Falls back to a placeholder if no logo is configured. Wrap in any animation primitive (FadeIn, SlideIn, ScaleIn etc.) to animate. the logo always keeps its aspect ratio.
Props:
- src: string (optional)
- width: number (optional)
- height: number (optional)

### ImageAsset
Generic image primitive for uploaded or remote media.
Props:
- src: string (optional)
- width: number (optional)
- height: number (optional)

### VideoAsset
Generic video primitive for uploaded media. Width and height define the rendered box; the video always preserves aspect ratio and stays fully visible.
Props:
- src: string (optional)
- width: number (optional)
- height: number (optional)

### IconAsset
Icon asset from the icon library.
Props:
- name: string (required)
- size: number (optional)
- borderRadius: number (optional)
- id: string (optional)


## SPACING (use these values for gap/padding/margin):
 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64 | 96

## TYPOGRAPHY variants:
caption | label | body | subheading | heading | display — never hardcode font sizes
"#

template_string AllComponentsList() #"
## AVAILABLE COMPONENTS

Use only these when designing your concept. Do not invent mechanisms that don't exist.

### Entrances
FadeIn — reveal elements onto the canvas
SlideIn — reveal elements onto the canvas
ScaleIn — reveal elements onto the canvas

### Exits
FadeOut — remove elements from the canvas
SlideOut — remove elements from the canvas
ScaleOut — remove elements from the canvas

### Sequencing
Stagger — reveal a list of items one after another
TimelineGate — show or hide a section at a specific moment

### Text
Text — static label or heading
Typewriter — text that types itself out progressively
WordCycle — a word that cycles through multiple values

### Numbers
Counter — a number that animates up or down to a target value

### Layout
SafeArea — Outermost content wrapper that applies safe area insets from the active aspect preset
Stack — vertical arrangement
Row — horizontal arrangement
AbsoluteCenter — center content on the canvas

### Brand Assets
LogoAsset — the brand logo
ImageAsset — Generic image primitive for uploaded or remote media.
VideoAsset — Generic video primitive for uploaded media. Width and height define the rendered box; the video always preserves aspect ratio and stays fully visible.
IconAsset — Icon asset from the icon library.

### Scenes
TitleCard — Pre-built hero title card composition with heading, subheading, and eyebrow
"#

// RULES
template_string SceneDesignPrinciples() #"
## SCENE DESIGN PRINCIPLES

- One idea per scene. Never combine two messages in one scene.
- One dominant visual element — a single Counter, a single heading, a single logo.
  Everything else is supporting.
- Keep text minimal — at most two key messages per scene, never more than five
  text elements total.
- Stagger reveals — never show all elements at once. Give each element room to enter.
- Prefer a single focal point centered on canvas over busy multi-column layouts.
- Whitespace is intentional — a centered heading with space around it reads better
  than content filling the full canvas.
- Use FocusColor on the dominant element. Never on layout.
- Prefer slow, deliberate timing — entrances at 20-25 frames feel confident, rushed at 8-10 feel cheap.
- Leave generous hold time between sections.
- Never stack more than three animation layers deep.

## ELEMENT TREE RULES

- SafeArea is implicit — never include it in elements.
- Every content element must be inside Stack or Row — never place a content
  component as a direct sibling without a layout wrapper.
- Use Stack for vertical arrangement, Row for horizontal. Nest them for complex layouts.
- AbsoluteCenter for centering a single element on the full canvas.
- Animation primitives always wrap a content or asset element — never leave them empty.
"#

template_string CodeGenerationRules() #"
## RULES:

The following rules are strict and must always be followed when generating the component.

## Component contract
- Component receives no props — export as: export default function RemoteComponent() { ... }
- Never import from "remotion" or any other library.
- Never use useCurrentFrame, interpolate, spring, or any Remotion hook directly.

## Layout
- SafeArea must always be the outermost wrapper. Nothing renders outside it.
- Every visible element must be a direct child of Stack, Row, or AbsoluteCenter — never place components as siblings without a layout primitive.
- Use Stack for vertical arrangement, Row for horizontal. Nest them for complex layouts.
- Never use position:absolute, position:fixed, or position:relative — AbsoluteCenter is the only component that handles absolute positioning.
- Never create wrapper divs purely for layout — use Stack and Row instead.
- Never animate an empty div — every animation primitive must wrap visible content.
- Plain React divs are allowed only for geometric shapes and decorative elements (circles, dividers, lines). Never for layout.
- Spacing values for gap, padding, margin must be token values only mentioned above

## Styling
- Never set color, fontSize, fontWeight, letterSpacing, or fontFamily in style props — the design system controls these automatically.
- Never hardcode hex colors or rgba color values.
- Never hardcode font sizes — use Text variant prop instead.
- style props are for geometry and layout only: width, height, maxWidth, borderRadius, overflow, padding, margin.

## Animation
- Never use JSX conditionals for animated elements — use TimelineGate instead.
- Never animate an empty or invisible element.
- Always wrap content in an animation primitive to animate it — content primitives (Text, Counter, LogoAsset) never animate themselves.
- Width and height on LogoAsset define its bounding box; the logo remains contained without distortion.

## Safety
- Only use primitives, layout components from the AVAILABLE list. Never invent new component names.
- Never use className for layout or styling — it is not supported in the animation runtime.
"#

template_string PlannerTimingGuidance() #"
## TIMING GUIDANCE (30 frames = 1 second)
  ### Scene Duration Budgets
  Title / outro           — 60-90 frames
  Single stat             — 90-120 frames
  Comparison              — 120-150 frames
  Feature highlight       — 120-180 frames
  Workflow / how-it-works — 150-210 frames

  ### Content Minimums (to inform frameRange allocation)
  Counter                 — needs at least 90 frames total
  Typewriter              — needs ~2 frames per character minimum
  WordCycle               — needs at least 40 frames per word
  Stagger of 3+ items     — needs at least 90 frames total

  ### Total Video Budget
  Distribute frameRange across scenes to sum close to otal Video Budget given below.
"#

template_string TimingAndFrameRules() #"
## TIMING AND FRAME RULES (fps=30, 30 frames = 1 second)

### General
- All timing values are whole numbers only. Never decimals.
  durationInFrames={20} ✓   durationInFrames={0.7} ✗
- Never animate continuously — every scene must have a hold period.
- Never stack entrance duration — if a parent SlideIn runs 20 frames,
  its child startAt is 0, not delayed again.

### Entrance / Exit
- Entrance: 15-25 frames (prefer 20-25 for confident feel, never below 15)
- Exit: 10-15 frames (always faster than entrance)
- ScaleIn: 20-30 frames

### Hold
- Default hold between elements: 6 frames
- Hold between sections (topic change): 15 frames
- Minimum hold before exit: 20 frames preferred 30+
- Every animation must have at least 6 frames of settled state before anything else moves

### Timeline Construction
Build element by element. Each element's startAt is:
  startAt = previous element's (startAt + durationInFrames) + hold

Sequential example:
  Logo fades in       startAt=0,  durationInFrames=20, ends=20
  Heading slides in   startAt=26, durationInFrames=20, ends=46  (6 frame hold)
  Subtext fades in    startAt=52, durationInFrames=20, ends=72  (6 frame hold)

Elements that form one visual unit start together (same startAt):
  Counter and its label
  Heading and eyebrow
  Logo and company name

### Stagger
- Delay between items: 8-10 frames
- All staggered children use same durationInFrames — only startAt shifts
- Last child ends at: startAt + ((childCount - 1) × delayBetween) + childDuration
- Next element startAt = stagger end frame + hold

### Content Duration
- Counter: 60-90 frames (minimum 60, longer for large numbers)
- Typewriter char mode: durationInFrames = text.length × 2
- Typewriter word mode: durationInFrames = wordCount × 10
- WordCycle: durationInFrames = words.length × (holdDuration + transitionDuration)
- Next element after Typewriter/WordCycle: startAt = their startAt + durationInFrames + hold

### settledFrame
settledFrame = max(startAt + durationInFrames) across ALL elements.

Special cases:
  Stagger:   startAt + ((childCount - 1) × delayBetween) + childDuration
  WordCycle: startAt + (words.length × (holdDuration + transitionDuration))

- settledFrame must leave at least 15 frames for exit
- durationInFrames = settledFrame + 20

### Limits
- Never exceed 240 frames for a single scene.
"#
