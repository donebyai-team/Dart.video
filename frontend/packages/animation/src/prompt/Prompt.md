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

## TIMING GUIDANCE (fps=30, so 30 frames = 1 second):

- Typical entrance: 15-25 frames
- Typical exit: 10-15 frames
- Stagger between items: 6-10 frames
- Counter animation: 30-60 frames
- Typewriter per character: 2-3 frames (set duration = text.length * 2)
- Hold before next section: 10-20 frames

## EXAMPLES

### Example 1 — sequential title reveal (settledFrame: 46)
```tsx
export default function RemoteComponent() {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <Stack gap={16} align="center" style={{ maxWidth: 800 }}>
          <SlideIn startAt={0} durationInFrames={20} from="bottom">
            <Text variant="display">Q4 Results</Text>
          </SlideIn>
          <FadeIn startAt={26} durationInFrames={20}>
            <Text variant="subheading">Revenue up this quarter</Text>
          </FadeIn>
        </Stack>
      </AbsoluteCenter>
    </SafeArea>
  );
}
```

### Example 2 — two stats side by side (settledFrame: 70)
```tsx
export default function RemoteComponent() {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <Row gap={48} align="center">
          <FadeIn startAt={0} durationInFrames={20}>
            <Stack gap={8} align="center">
              <Counter to={9800} startAt={0} durationInFrames={60} suffix="+" variant="heading" />
              <Text variant="label">new users</Text>
            </Stack>
          </FadeIn>
          <FadeIn startAt={0} durationInFrames={20}>
            <Stack gap={8} align="center">
              <Counter to={94} startAt={10} durationInFrames={60} suffix="%" variant="heading" />
              <Text variant="label">retention</Text>
            </Stack>
          </FadeIn>
        </Row>
      </AbsoluteCenter>
    </SafeArea>
  );
}
```

### Example 3 — staggered list (settledFrame: 62)
```tsx
export default function RemoteComponent() {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <Stack gap={16} align="center" style={{ maxWidth: 600 }}>
          <SlideIn startAt={0} durationInFrames={20} from="bottom">
            <Text variant="heading">What we shipped</Text>
          </SlideIn>
          <TimelineGate showAfter={26}>
            <Stagger startAt={26} staggerDelay={8}>
              <SlideIn durationInFrames={20} from="bottom">
                <Text variant="body">Faster build times</Text>
              </SlideIn>
              <SlideIn durationInFrames={20} from="bottom">
                <Text variant="body">Improved test coverage</Text>
              </SlideIn>
              <SlideIn durationInFrames={20} from="bottom">
                <Text variant="body">Zero downtime deploys</Text>
              </SlideIn>
            </Stagger>
          </TimelineGate>
        </Stack>
      </AbsoluteCenter>
    </SafeArea>
  );
}
```

### Example 4 — word cycle resolving to final word (settledFrame: 156)
```tsx
export default function RemoteComponent() {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <Stack gap={16} align="center" style={{ maxWidth: 700 }}>
          <FadeIn startAt={0} durationInFrames={20}>
            <Text variant="subheading">We protect your</Text>
          </FadeIn>
          <TimelineGate showAfter={26} hideAfter={130}>
            <WordCycle
              startAt={26}
              words={["layouts", "spacing", "colors", "trust"]}
              holdDuration={18}
              transitionDuration={10}
              transition="fadeSwap"
              variant="display"
            />
          </TimelineGate>
          <TimelineGate showAfter={136}>
            <ScaleIn startAt={136} durationInFrames={20} origin="center">
              <Text variant="display">trust</Text>
            </ScaleIn>
          </TimelineGate>
        </Stack>
      </AbsoluteCenter>
    </SafeArea>
  );
}
```
