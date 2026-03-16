import { z } from 'zod';
import { AspectPreset } from '../styles/AspectPresetContext';
import { BrandTheme as BrandObject } from '../theme/types';
import { ComponentRegistration } from '../registry/components';
import { AnimationTypeDefinition } from '../registry/animationTypes';
import { PROMPT_SPACING_VALUES } from '../tokens/spacing';

export function frameContractFragment(): string {
  return [
    '## FRAME CONTRACT:',
    '',
    '- Your component runs inside a managed animation runtime.',
    '- It receives no props.',
    '- Export as: export default function RemoteComponent() { ... }',
    '- Remotion and all animation libraries are provided by the runtime — never import them.',
  ].join('\n');
}

export function canvasDimensionsFragment(preset: AspectPreset): string {
  return [
    '## Available CANVAS size:',
    `${preset.width}px × ${preset.height}px (${preset.id})`,
  ].join('\n');
}

/**
 * Unwrap Zod wrappers (ZodOptional, ZodDefault, ZodNullable) to get the inner type.
 */
function unwrapZod(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return unwrapZod(schema._def.innerType);
  }
  if (schema instanceof z.ZodDefault) {
    return unwrapZod(schema._def.innerType);
  }
  return schema;
}

/**
 * Extract a human-readable type hint from a Zod schema field.
 * Returns strings like "number", "string", or "enum(up|down|left|right)".
 */
function describeZodType(schema: z.ZodTypeAny): string {
  const inner = unwrapZod(schema);
  if (inner instanceof z.ZodEnum) {
    return `enum(${(inner._def.values as string[]).join('|')})`;
  }
  if (inner instanceof z.ZodNumber) return 'number';
  if (inner instanceof z.ZodString) return 'string';
  if (inner instanceof z.ZodArray) return 'array';
  return 'any';
}

export function componentListFragment(
  sectionName: string,
  components: ComponentRegistration[],
  opts?: {
    onlyDescriptions?: boolean;
  }
): string {
  const lines: string[] = [];

  if (opts?.onlyDescriptions) {
    for (const c of components) {
      lines.push(`## ${c.name} - ${c.description}`);
    }
    return lines.join("\n");
  }

  lines.push(`## ${sectionName}`);
  lines.push("");

  for (const c of components) {
    const shape = c.fullSchema.shape;

    lines.push(`### ${c.name}`);
    lines.push(`${c.description}`);
    lines.push("Props:");

    for (const [key, field] of Object.entries(shape)) {
      // Remove styling props that are handled by the renderer
      if (key === "children" || key === "style" || key === "className") continue;

      const isOptional = (field as z.ZodTypeAny).isOptional();
      const typeHint = describeZodType(field as z.ZodTypeAny);
      lines.push(`- ${key}: ${typeHint} (${isOptional ? "optional" : "required"})`);
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
    '',
    '- Typical entrance: 15-25 frames',
    '- Typical exit: 10-15 frames',
    '- Stagger between items: 6-10 frames',
    '- Counter animation: 30-60 frames',
    '- Typewriter per character: 2-3 frames (set duration = text.length * 2)',
    '- Hold before next section: 10-20 frames',
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

