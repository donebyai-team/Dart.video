template_string CodeGenerationExamples() #"
## EXAMPLES:

{% raw %}

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
{% endraw %}
"#