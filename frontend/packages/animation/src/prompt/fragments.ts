import { AspectPreset } from '../styles/AspectPresetContext';
import { BrandTheme as BrandObject } from '../theme/types';
import { ComponentRegistration } from '../registry/components';
import { AnimationTypeDefinition } from '../registry/animationTypes';
import { PROMPT_SPACING_VALUES } from '../tokens/spacing';

export function frameContractFragment(): string {
  return [
    '## FRAME CONTRACT:',
    'Your component receives {} as props.',
    'Never call useCurrentFrame(), interpolate(), spring(), or any Remotion hook.',
    'Never import from "remotion" or any other library.',
    'Plain React is allowed for static layout and positioning.',
    'Animation timing must always use the provided primitives.',
  ].join('\n');
}

export function canvasDimensionsFragment(preset: AspectPreset): string {
  return [
    '## Available CANVAS size:',
    `${preset.width}px × ${preset.height}px (${preset.id})`,
  ].join('\n');
}

export function componentListFragment(components: ComponentRegistration[]): string {
  const lines: string[] = [];

  lines.push("## AVAILABLE COMPONENTS");
  lines.push("Only use the components listed below. Do not invent new ones.");
  lines.push("");

  for (const c of components) {
    const schema = c.fullSchema.shape;

    lines.push(`### ${c.name}`);
    lines.push(`Description: ${c.description}`);
    lines.push("Props:");

    for (const [key] of Object.entries(schema)) {
      if (key === "children" || key === "style" || key === "className") continue;

      const isOptional =
        key !== "to" &&
        key !== "text" &&
        key !== "words" &&
        key !== "heading";

      lines.push(`- ${key} (${isOptional ? "optional" : "required"})`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

export function spacingFragment(): string {
  return ['## SPACING (use these values for gap/padding/margin):',
    ` ${PROMPT_SPACING_VALUES.join(' | ')}`].join('\n');
}

export function typographyFragment(): string {
  return [
    '## TYPOGRAPHY variants:',
    `caption | label | body | subheading | heading | display — never hardcode font sizes`,
  ].join('\n');
}

export function brandTokensFragment(brand: BrandObject): string {
  return [
    '## BRAND TOKENS (use these for colors — never hardcode hex):',
    `  brand.primary="${brand.primary}" brand.secondary="${brand.secondary}"`,
    `  brand.bg="${brand.bg}" brand.text="${brand.text}" brand.font="${brand.font}"`,
  ].join('\n');
}

export function timingGuidanceFragment(): string {
  return [
    '## TIMING GUIDANCE (fps=30, so 30 frames = 1 second):',
    '  Typical entrance: 15-25 frames',
    '  Typical exit: 10-15 frames',
    '  Stagger between items: 6-10 frames',
    '  Counter animation: 30-60 frames',
    '  Typewriter per character: 2-3 frames (set duration = text.length * 2)',
    '  Hold before next section: 10-20 frames',
  ].join('\n');
}

export function globalRulesFragment(): string {
  return [
    '## RULES:',
    ' component receives no props.',
    '  Never import from "remotion" or any library.',
    '  Never use useCurrentFrame, interpolate, spring directly.',
    '  Never hardcode hex colors — use brand.primary, brand.secondary, brand.bg, brand.text.',
    '  Never use arbitrary px values — use spacing token values for gap/padding.',
    '  Never hardcode font sizes — use Text variant prop.',
    '  SafeArea must always be the outermost content wrapper.',
    '  Never use JSX conditionals for animated elements — use TimelineGate showAfter instead.',
    '  Export as: export default function RemoteComponent() { ... }',
    '  Never set color, fontSize, fontWeight, letterSpacing, or fontFamily in style props.',
    '  These are controlled by the design system automatically.',
    '  style props are only for layout: position, margin, padding, maxWidth, width, height.',
  ].join('\n');
}

export function typeSpecificRulesFragment(typeDef: AnimationTypeDefinition): string {
  const lines = [`${typeDef.name.toUpperCase()} TYPE RULES:`];
  for (const rule of typeDef.promptRules) {
    lines.push(`  ${rule}`);
  }
  return lines.join('\n');
}

export function exampleFragment(): string {
return `## EXAMPLES:

### Example 1 — primitives only
\`\`\`tsx
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
\`\`\`

### Example 2 — primitives with plain React for geometry
\`\`\`tsx
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
\`\`\``;
}

