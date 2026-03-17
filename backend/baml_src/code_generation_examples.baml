template_string CodeGenerationExamples() #"
## EXAMPLES:

{% raw %}
### Example 1 — title with sequential reveals
```tsx
export default function RemoteComponent() {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <Stack gap={16} align="center">
          <SlideIn delay={0} duration={20} direction="up">
            <Text variant="display">Q4 Results</Text>
          </SlideIn>
          <FadeIn delay={26} duration={20}>
            <Text variant="subheading">Revenue up this quarter</Text>
          </FadeIn>
        </Stack>
      </AbsoluteCenter>
    </SafeArea>
  );
}
```

### Example 2 — two stats side by side
```tsx
export default function RemoteComponent() {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <Row gap={48} align="center">
          <FadeIn delay={0} duration={20}>
            <Stack gap={8} align="center">
              <Counter to={9800} delay={0} duration={60} suffix="+" variant="heading" />
              <Text variant="label">new users</Text>
            </Stack>
          </FadeIn>
          <FadeIn delay={10} duration={20}>
            <Stack gap={8} align="center">
              <Counter to={94} delay={10} duration={60} suffix="%" variant="heading" />
              <Text variant="label">retention</Text>
            </Stack>
          </FadeIn>
        </Row>
      </AbsoluteCenter>
    </SafeArea>
  );
}
```

### Example 3 — staggered list
```tsx
export default function RemoteComponent() {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <Stack gap={12} align="center">
          <SlideIn delay={0} duration={20} direction="up">
            <Text variant="heading">What we shipped</Text>
          </SlideIn>
          <TimelineGate showAfter={26}>
            <Stagger startAt={26} delayBetween={8}>
              <SlideIn duration={20} direction="up">
                <Text variant="body">Faster build times</Text>
              </SlideIn>
              <SlideIn duration={20} direction="up">
                <Text variant="body">Improved test coverage</Text>
              </SlideIn>
              <SlideIn duration={20} direction="up">
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

### Example 4 — word cycle resolving to final word
```tsx
export default function RemoteComponent() {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <Stack gap={16} align="center" style={{ maxWidth: 700 }}>
          <FadeIn delay={0} duration={20}>
            <Text variant="subheading">We protect your</Text>
          </FadeIn>
          <TimelineGate showAfter={26} hideAfter={130}>
            <WordCycle
              words={["layouts", "spacing", "colors", "trust"]}
              holdDuration={18}
              transitionDuration={10}
              transition="fadeSwap"
              variant="display"
            />
          </TimelineGate>
          <TimelineGate showAfter={136}>
            <ScaleIn delay={0} duration={20} origin="center">
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