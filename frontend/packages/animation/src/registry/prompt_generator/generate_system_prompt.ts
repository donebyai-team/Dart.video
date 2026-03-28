import { ComponentRegistration } from '..';
import { SCENE_COMPONENTS } from '../scenes';
import {
  frameContractFragment,
  componentListFragment,
} from './fragments';

interface ComponentGroup {
  title: string;
  description: string;
  components: ComponentRegistration[];
}

const COMPONENT_GROUPS: ComponentGroup[] = [
  { title: 'Scenes', description: 'standalone, no siblings', components: SCENE_COMPONENTS },
  // { title: 'Layout Primitives', description: 'structural only, every visible element must live inside one', components: LAYOUT_COMPONENTS },
  // { title: 'Motion Primitives', description: 'wraps exactly one child, never wraps Layout', components: ANIMATION_PRIMITIVE_COMPONENTS },
  // { title: 'Static Primitives', description: 'no built-in animation, wrap in Motion to animate', components: STATIC_PRIMITIVES },
  // { title: 'Dynamic Primitives', description: 'self-animating, never wrap in Motion, use startAt directly', components: DYNAMIC_PRIMITIVES },
  // { title: 'Asset Primitives', description: 'no built-in animation, wrap in Motion to animate', components: BRAND_COMPONENTS },
];

function formatComponentLine(component: ComponentRegistration): string {
  return `${component.name} — ${component.description}`;
}

function formatComponentSection(title: string, description: string, components: ComponentRegistration[]): string | null {
  if (components.length === 0) return null;

  return [
    `### ${title} - ${description}`,
    ...components.map(formatComponentLine),
  ].join('\n');
}

function getOnlyComponentsDescriptionPrompt(): string {
  const sections = [
    '## AVAILABLE COMPONENTS',
    '',
    "Use only these when designing your concept. Do not invent components that don't exist.",
    ...COMPONENT_GROUPS.map((g) => formatComponentSection(g.title, g.description, g.components)),
  ].filter((section): section is string => Boolean(section));

  return sections.join('\n\n');
}

export function getAnimationPrompt(
  opts?: {
    mode?: 'only_components_description';
  }
): string {
  if (opts?.mode === 'only_components_description') {
    return getOnlyComponentsDescriptionPrompt();
  }

  const sections = [
    frameContractFragment(),
    // canvasDimensionsFragment(ASPECT_PRESETS['web']),
    ...COMPONENT_GROUPS.map((g) => componentListFragment(`${g.title} — ${g.description}`, g.components)),
    // spacingFragment(),
    // typographyFragment(),
    // exampleFragment(),
  ];

  return sections.join('\n\n');
}
