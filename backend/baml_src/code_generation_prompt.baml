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
- delay: number (optional)
- duration: number (optional)

### FadeOut
Fade-out exit animation (opacity 1 to 0)
Props:
- delay: number (optional)
- duration: number (optional)

### SlideIn
Slide-in entrance with translation and fade
Props:
- delay: number (optional)
- duration: number (optional)
- direction: enum(up|down|left|right) (optional)
- distance: number (optional)

### SlideOut
Slide-out exit with translation and fade
Props:
- delay: number (optional)
- duration: number (optional)
- direction: enum(up|down|left|right) (optional)
- distance: number (optional)

### ScaleIn
Scale-in entrance animation (scale 0 to 1)
Props:
- delay: number (optional)
- duration: number (optional)
- origin: enum(center|top|bottom|left|right) (optional)

### ScaleOut
Scale-out exit animation (scale 1 to 0)
Props:
- delay: number (optional)
- duration: number (optional)
- origin: enum(center|top|bottom|left|right) (optional)

### Stagger
Staggers children animations with increasing delay offsets
Props:
- startAt: number (optional)
- delayBetween: number (optional)

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
- delay: number (optional)
- duration: number (optional)
- from: number (optional)
- to: number (required)
- format: string (optional)
- prefix: string (optional)
- suffix: string (optional)
- variant: enum(caption|label|body|subheading|heading|display) (optional)

### Typewriter
Progressively reveals text character by character, word, or line
Props:
- delay: number (optional)
- duration: number (optional)
- text: string (required)
- mode: enum(char|word|line) (optional)
- variant: enum(caption|label|body|subheading|heading|display) (optional)

### WordCycle
Cycles through an array of words with animated transitions
Props:
- delay: number (optional)
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
- delay: number (optional)


## BRAND

### LogoAsset
Brand logo from ThemeProvider. Falls back to a placeholder if no logo is configured. Wrap in any animation primitive (FadeIn, SlideIn, ScaleIn etc.) to animate. Set only width or height to constrain size while preserving aspect ratio — never set both.
Props:
- width: number (optional)
- height: number (optional)


## SPACING (use these values for gap/padding/margin):
 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64 | 96

## TYPOGRAPHY variants:
caption | label | body | subheading | heading | display — never hardcode font sizes

## TIMING GUIDANCE (fps=30, so 30 frames = 1 second):

- Typical entrance: 15-25 frames
- Typical exit: 10-15 frames
- Stagger between items: 6-10 frames
- Counter animation: 30-60 frames
- Typewriter per character: 2-3 frames (set duration = text.length * 2)
- Hold before next section: 10-20 frames

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
- Only set width OR height on LogoAsset — never both, as this distorts the aspect ratio.

## Safety
- Only use primitives, layout components from the AVAILABLE list. Never invent new component names.
- Never use className for layout or styling — it is not supported in the animation runtime.
"#

template_string CodeGenerationMustHave() #"
## ANIMATION QUALITY

- Keep text minimal — one or two key messages per animation, never more than five text elements total.
- Stagger reveals rather than showing everything at once — give each element room to breathe.
- Prefer slow, deliberate timing — entrances at 20-25 frames feel confident, rushed animations at 8-10 frames feel cheap.
- Leave generous hold time between sections — do not animate continuously from frame 0 to the end.
- Never stack more than three animation layers deep — avoid wrapping FadeIn inside SlideIn inside ScaleIn.
- ** One dominant visual element per animation — a single Counter, a single heading, a single logo. Supporting elements should feel secondary.**
- Prefer a single focal point centered on the canvas over busy multi-column layouts.
- Whitespace is intentional — a centered heading with room around it reads better than content filling the full canvas.`;
"#