template_string CodeGeneration() #"
## FRAME CONTRACT:
Your component receives no props.
Never call useCurrentFrame(), interpolate(), spring(), or any Remotion hook.
Never import from "remotion" or any other library.
Plain React is allowed for static layout and positioning.
Animation timing must always use the provided primitives.

## Available CANVAS size:
1920px × 1080px (web)

## AVAILABLE COMPONENTS
Only use the components listed below. Do not invent new ones.

### SafeArea
Description: Outermost content wrapper — applies safe area insets from the active aspect preset
Props:

### Stack
Description: Vertical flex layout — gap must use spacing token values (4|8|12|16|24|32|48|64|96)
Props:
- gap (optional)
- align (optional)
- justify (optional)

### Row
Description: Horizontal flex layout — gap must use spacing token values
Props:
- gap (optional)
- align (optional)
- justify (optional)

### AbsoluteCenter
Description: Centers child absolutely within nearest positioned parent — axis: x|y|both
Props:
- axis (optional)

### FadeIn
Description: Opacity 0→1 entrance — frame delay? duration?
Props:
- delay (optional)
- duration (optional)

### FadeOut
Description: Opacity 1→0 exit — frame delay? duration?
Props:
- delay (optional)
- duration (optional)

### SlideIn
Description: Translate+fade entrance — frame delay? duration? direction?(up|down|left|right) distance?
Props:
- delay (optional)
- duration (optional)
- direction (optional)
- distance (optional)

### SlideOut
Description: Translate+fade exit — frame delay? duration? direction?(up|down|left|right) distance?
Props:
- delay (optional)
- duration (optional)
- direction (optional)
- distance (optional)

### ScaleIn
Description: Scale 0→1 entrance — frame delay? duration? origin?(center|top|bottom|left|right)
Props:
- delay (optional)
- duration (optional)
- origin (optional)

### ScaleOut
Description: Scale 1→0 exit — frame delay? duration? origin?(center|top|bottom|left|right)
Props:
- delay (optional)
- duration (optional)
- origin (optional)

### Stagger
Description: List timing orchestrator — frame startAt? delayBetween? — clones children with increasing frame offset
Props:
- startAt (optional)
- delayBetween (optional)

### TimelineGate
Description: Mount/unmount children in frame window — frame showAfter hideAfter? — use instead of JSX conditionals
Props:
- showAfter (optional)
- hideAfter (optional)

### Text
Description: Static text — variant?(caption|label|body|subheading|heading|display) — wrap in FadeIn/SlideIn to animate
Props:
- variant (optional)

### Counter
Description: Animated number — frame to delay? duration? from? format? prefix? suffix?
Props:
- delay (optional)
- duration (optional)
- from (optional)
- to (required)
- format (optional)
- prefix (optional)
- suffix (optional)
- variant (optional)

### Typewriter
Description: Progressive text reveal — frame text delay? duration? mode?(char|word|line)
Props:
- delay (optional)
- duration (optional)
- text (required)
- mode (optional)
- variant (optional)

### WordCycle
Description: Cycling word array — frame words holdDuration? transitionDuration? transition?(flipY|fadeSwap|slideUp)
Props:
- delay (optional)
- words (required)
- holdDuration (optional)
- transitionDuration (optional)
- transition (optional)
- variant (optional)

### TitleCard
Description: Hero composition — frame heading subheading? eyebrow? delay?
Props:
- heading (required)
- subheading (optional)
- eyebrow (optional)
- delay (optional)


## SPACING (use these values for gap/padding/margin):
 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64 | 96

## TYPOGRAPHY variants:
caption | label | body | subheading | heading | display — never hardcode font sizes

## TIMING GUIDANCE (fps=30, so 30 frames = 1 second):
  Typical entrance: 15-25 frames
  Typical exit: 10-15 frames
  Stagger between items: 6-10 frames
  Counter animation: 30-60 frames
  Typewriter per character: 2-3 frames (set duration = text.length * 2)
  Hold before next section: 10-20 frames

## RULES:
 component receives no props.
  Never import from "remotion" or any library.
  Never use useCurrentFrame, interpolate, spring directly.
  Never hardcode hex colors — use brand.primary, brand.secondary, brand.bg, brand.text.
  Never use arbitrary px values — use spacing token values for gap/padding.
  Never hardcode font sizes — use Text variant prop.
  SafeArea must always be the outermost content wrapper.
  Never use JSX conditionals for animated elements — use TimelineGate showAfter instead.
  Export as: export default function RemoteComponent() { ... }
  Never set color, fontSize, fontWeight, letterSpacing, or fontFamily in style props.
  These are controlled by the design system automatically.
  style props are only for layout: position, margin, padding, maxWidth, width, height.
"#