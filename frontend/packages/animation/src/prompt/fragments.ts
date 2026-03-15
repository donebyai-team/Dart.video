import { AspectPreset } from '../styles/AspectPresetContext';
import { BrandTheme as BrandObject } from '../theme/types';
import { ComponentRegistration } from '../registry/components';
import { AnimationTypeDefinition } from '../registry/animationTypes';
import { PROMPT_SPACING_VALUES } from '../tokens/spacing';

export function frameContractFragment(): string {
  return [
    'FRAME CONTRACT:',
    'Your component receives {} as props.',
    'fps is always 30. frame counts from 0.',
    'Never call useCurrentFrame(), interpolate(), spring(), or any Remotion hook.',
    'Never import from "remotion" or any other library.',
    'Plain React is allowed for static layout and positioning.',
    'Animation timing must always use the provided primitives.',
  ].join('\n');
}

export function canvasDimensionsFragment(preset: AspectPreset): string {
  return `CANVAS: ${preset.width}px × ${preset.height}px (${preset.id})`;
}

export function componentListFragment(components: ComponentRegistration[]): string {
  const lines = ['COMPONENTS (only these are available):'];
  for (const c of components) {
    const schema = c.fullSchema.shape;
    const propParts: string[] = [];
    for (const [key, _val] of Object.entries(schema)) {
      if (key === 'children' || key === 'style' || key === 'className') continue;
      const isOptional = key !== 'frame' && key !== 'to' && key !== 'text' && key !== 'words' && key !== 'heading';
      propParts.push(isOptional ? `${key}?` : key);
    }
    lines.push(`  ${c.name} ${propParts.join(' ')} — ${c.description}`);
  }
  return lines.join('\n');
}

export function spacingFragment(): string {
  return `SPACING (use these values for gap/padding/margin): ${PROMPT_SPACING_VALUES.join(' | ')}`;
}

export function typographyFragment(): string {
  return 'TYPOGRAPHY variants: caption | label | body | subheading | heading | display — never hardcode font sizes';
}

export function brandTokensFragment(brand: BrandObject): string {
  return [
    'BRAND TOKENS (use these for colors — never hardcode hex):',
    `  brand.primary="${brand.primary}" brand.secondary="${brand.secondary}"`,
    `  brand.bg="${brand.bg}" brand.text="${brand.text}" brand.font="${brand.font}"`,
  ].join('\n');
}

export function timingGuidanceFragment(): string {
  return [
    'TIMING GUIDANCE (fps=30, so 30 frames = 1 second):',
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
    'RULES:',
    '  Never import from "remotion" or any library.',
    '  Never use useCurrentFrame, interpolate, spring directly.',
    '  Never hardcode hex colors — use brand.primary, brand.secondary, brand.bg, brand.text.',
    '  Never use arbitrary px values — use spacing token values for gap/padding.',
    '  Never hardcode font sizes — use Text variant prop.',
    '  SafeArea must always be the outermost content wrapper.',
    '  Never use JSX conditionals for animated elements — use TimelineGate showAfter instead.',
    '  Pass frame only to animation primitives (FadeIn, SlideIn, ScaleIn, FadeOut, SlideOut, ScaleOut, Stagger, TimelineGate) and content primitives (Counter, Typewriter, WordCycle). Never pass frame to Stack, Row, SafeArea, AbsoluteCenter, Text, or HTML elements.',
    '  Export the component as: export default function RemoteComponent({ frame, fps, brand, data }) { ... }',
  ].join('\n');
}

export function typeSpecificRulesFragment(typeDef: AnimationTypeDefinition): string {
  const lines = [`${typeDef.name.toUpperCase()} TYPE RULES:`];
  for (const rule of typeDef.promptRules) {
    lines.push(`  ${rule}`);
  }
  return lines.join('\n');
}
