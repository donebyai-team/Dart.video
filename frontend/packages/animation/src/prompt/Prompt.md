## FRAME CONTRACT:

- Your component runs inside a managed animation runtime.
- It receives no props.
- Export as: export default function RemoteComponent() { ... }
- Remotion and all animation libraries are provided by the runtime — never import them.

## Available CANVAS size:
1920px × 1080px (web)

## Scenes — standalone, no siblings

### TitleCard
pre-built hero title with heading, subheading, and optional eyebrow
Props:
- heading: string (required)
- subheading: string (optional)
- eyebrow: string (optional)
- startAt: number (optional)


## Layout Primitives — structural only, every visible element must live inside one

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


## Motion Primitives — wraps exactly one child, never wraps Layout

### FadeIn
fades an element in from transparent to fully visible
Props:
- startAt: number (optional)
- durationInFrames: number (optional)

### FadeOut
fades an element out from visible to transparent
Props:
- startAt: number (optional)
- durationInFrames: number (optional)

### SlideIn
slides an element in from outside the canvas edge
Props:
- startAt: number (optional)
- durationInFrames: number (optional)
- direction: enum(up|down|left|right) (optional)
- distance: number (optional)

### SlideOut
slides an element out toward the canvas edge
Props:
- startAt: number (optional)
- durationInFrames: number (optional)
- direction: enum(up|down|left|right) (optional)
- distance: number (optional)

### ScaleIn
scales an element up from small to full size
Props:
- startAt: number (optional)
- durationInFrames: number (optional)
- origin: enum(center|top|bottom|left|right) (optional)

### ScaleOut
scales an element down from full size to nothing
Props:
- startAt: number (optional)
- durationInFrames: number (optional)
- origin: enum(center|top|bottom|left|right) (optional)

### Stagger
reveals children one after another with a delay between each — children must be animation primitives
Props:
- startAt: number (optional)
- staggerDelay: number (optional)

### TimelineGate
shows its child only within a defined time window — use instead of JSX conditionals
Props:
- showAfter: number (required)
- hideAfter: number (optional)


## Static Primitives — no built-in animation, wrap in Motion to animate

### Text
Static text element, wrap in FadeIn/SlideIn to animate
Props:
- variant: enum(caption|label|body|subheading|heading|display) (optional)


## Dynamic Primitives — self-animating, never wrap in Motion, use startAt directly

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


## Asset Primitives — no built-in animation, wrap in Motion to animate

### LogoAsset
renders the brand logo from the active theme — use for brand presence in title and outro scenes
Props:
- src: string (optional)
- width: number (optional)
- height: number (optional)

### ImageAsset
renders a static image from a URL — use for product screens, photos, and illustrations
Props:
- src: string (optional)
- width: number (optional)
- height: number (optional)

### VideoAsset
renders a static video file from a url — use for product tutorials, and explainer content
Props:
- src: string (optional)
- width: number (optional)
- height: number (optional)

### IconAsset
renders a single icon by name from the icon library — use for decorative or supportive visual cues
Props:
- name: string (required)
- size: number (optional)
- borderRadius: number (optional)
- id: string (optional)


## SPACING (use these values for gap/padding/margin):
 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64 | 96

## TYPOGRAPHY variants:
caption | label | body | subheading | heading | display — never hardcode font sizes

## EXAMPLES

### Example 1 — sequential title reveal (settledFrame: 46)
```tsx
export default function RemoteComponent() {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <Stack gap={16} align="center">
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

### Example 2 — two stats side by side (settledFrame: 60)
```tsx
// Motion primitives wrap Static/Dynamic primitives individually — never wrap Stack or Row
export default function RemoteComponent() {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <Row gap={48} align="center">
          <Stack gap={8} align="center">
            <FadeIn startAt={0} durationInFrames={20}>
              <Counter to={9800} startAt={0} durationInFrames={60} suffix="+" variant="heading" />
            </FadeIn>
            <FadeIn startAt={0} durationInFrames={20}>
              <Text variant="label">new users</Text>
            </FadeIn>
          </Stack>
          <Stack gap={8} align="center">
            <FadeIn startAt={0} durationInFrames={20}>
              <Counter to={94} startAt={0} durationInFrames={60} suffix="%" variant="heading" />
            </FadeIn>
            <FadeIn startAt={0} durationInFrames={20}>
              <Text variant="label">retention</Text>
            </FadeIn>
          </Stack>
        </Row>
      </AbsoluteCenter>
    </SafeArea>
  );
}
```

### Example 3 — staggered list (settledFrame: 62)
```tsx
// Stagger manages its own timing — no TimelineGate wrapper needed
export default function RemoteComponent() {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <Stack gap={16} align="center">
          <SlideIn startAt={0} durationInFrames={20} from="bottom">
            <Text variant="heading">What we shipped</Text>
          </SlideIn>
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
        <Stack gap={16} align="center">
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
