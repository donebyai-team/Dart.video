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
Brand logo from ThemeProvider. Falls back to a placeholder if no logo is configured. Wrap in any animation primitive (FadeIn, SlideIn, ScaleIn etc.) to animate. Width and height define the bounding box; the logo always keeps its aspect ratio.
Props:
- src: string (optional)
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
- Width and height on LogoAsset define its bounding box; the logo remains contained without distortion.

## Safety
- Only use primitives, layout components from the AVAILABLE list. Never invent new component names.
- Never use className for layout or styling — it is not supported in the animation runtime.

## EXAMPLES:

### Example 1 — primitives only
```tsx
export default function RemoteComponent() {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <Stack gap={24} align="center">

          <SlideIn delay={0} duration={20} direction="up">
            <Text variant="display">Q4 Results</Text>
          </SlideIn>

          <FadeIn delay={15} duration={20}>
            <Text variant="subheading">Revenue up this quarter</Text>
          </FadeIn>

          <FadeIn delay={30} duration={20}>
            <Row gap={48} align="center">
              <Stack gap={8} align="center">
                <Counter to={9800} delay={35} duration={60} suffix="+" variant="heading" />
                <Text variant="label">new users</Text>
              </Stack>
              <Stack gap={8} align="center">
                <Counter to={94} delay={45} duration={60} suffix="%" variant="heading" />
                <Text variant="label">retention</Text>
              </Stack>
            </Row>
          </FadeIn>

          <TimelineGate showAfter={120}>
            <Stagger startAt={120} delayBetween={8}>
              <SlideIn duration={20} direction="up">
                <Text variant="label">✓ Revenue target hit</Text>
              </SlideIn>
              <SlideIn duration={20} direction="up">
                <Text variant="label">✓ User growth 40%</Text>
              </SlideIn>
              <SlideIn duration={20} direction="up">
                <Text variant="label">✓ Churn reduced</Text>
              </SlideIn>
            </Stagger>
          </TimelineGate>

        </Stack>
      </AbsoluteCenter>
    </SafeArea>
  );
}
```

### Example 2 — primitives with plain React for geometry
```tsx
export default function RemoteComponent() {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <Stack gap={32} align="center">

          <ScaleIn delay={0} duration={20} origin="center">
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.8)' }} />
            </div>
          </ScaleIn>

          <SlideIn delay={20} duration={25} direction="up">
            <Stack gap={8} align="center">
              <Text variant="heading">Acme Inc</Text>
              <Text variant="body">Building the future</Text>
            </Stack>
          </SlideIn>

          <FadeIn delay={50} duration={20}>
            <div style={{ width: 320, height: 1, background: 'rgba(255,255,255,0.15)' }} />
          </FadeIn>

          <FadeIn delay={60} duration={20}>
            <Text variant="label">est. 2024</Text>
          </FadeIn>

        </Stack>
      </AbsoluteCenter>
    </SafeArea>
  );
}
