import { z } from 'zod';
import { AspectPreset } from '../../styles/AspectPresetContext';
import { BrandTheme as BrandObject } from '../../theme/types';
import { ComponentRegistration } from '../registry';
import { PROMPT_SPACING_VALUES } from '../../tokens/spacing';

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
): string {
  const lines: string[] = [];

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

export function exampleFragment(): string {
  return `## EXAMPLES

### Example 1 — sequential title reveal (settledFrame: 46)
\`\`\`tsx
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
\`\`\`

### Example 2 — two stats side by side (settledFrame: 70)
\`\`\`tsx
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
\`\`\`

### Example 3 — staggered list (settledFrame: 62)
\`\`\`tsx
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
\`\`\`

### Example 4 — word cycle resolving to final word (settledFrame: 156)
\`\`\`tsx
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
\`\`\``;
}
