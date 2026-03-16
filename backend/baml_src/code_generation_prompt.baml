template_string CodeGeneration() #"
## FRAME CONTRACT:

- Your component receives no props.
- Never call useCurrentFrame(), interpolate(), spring(), or any Remotion hook.
- Never import from "remotion" or any other library.
- Plain React is allowed for static layout and positioning.
- Animation timing must always use the provided primitives.

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

- component receives no props.
- Never import from "remotion" or any library.
- Never use useCurrentFrame, interpolate, spring directly.
- Never hardcode hex colors — use brand.primary, brand.secondary, brand.bg, brand.text.
- Never use arbitrary px values — use spacing token values for gap/padding.
- Never hardcode font sizes — use Text variant prop.
- SafeArea must always be the outermost content wrapper.
- Never use JSX conditionals for animated elements — use TimelineGate showAfter instead.
- Export as: export default function RemoteComponent() { ... }
- Never set color, fontSize, fontWeight, letterSpacing, or fontFamily in style props.
- These are controlled by the design system automatically.
- style props are only for layout: position, margin, padding, maxWidth, width, height.
"#