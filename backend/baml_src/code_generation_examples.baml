template_string CodeGenerationExamples() #"
## EXAMPLES:

{% raw %}
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
```
{% endraw %}
"#