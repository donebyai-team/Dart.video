import { ComponentRegistration } from '../registry';
import { ANIMATION_PRIMITIVE_COMPONENTS } from '../registry/animation_primitives';
import { BRAND_COMPONENTS } from '../registry/assets';
import { CONTENT_COMPONENTS } from '../registry/content';
import { LAYOUT_COMPONENTS } from '../registry/layouts';
import { SCENE_COMPONENTS } from '../registry/scenes';
import { ASPECT_PRESETS } from '../styles/AspectPresetContext';
import {
  frameContractFragment,
  canvasDimensionsFragment,
  componentListFragment,
  spacingFragment,
  typographyFragment,
  exampleFragment,
} from './fragments';


function formatMechanismLine(component: ComponentRegistration): string {
  return `${component.name} — ${component.description}`;
}

function formatMechanismSection(title: string, components: ComponentRegistration[]): string | null {
  if (components.length === 0) return null;

  return [
    `### ${title}`,
    ...components.map(formatMechanismLine),
  ].join('\n');
}

function getOnlyComponentsDescriptionPrompt(): string {
  const sections = [
    '## AVAILABLE VISUAL MECHANISMS',
    '',
    "Use only these when designing your concept. Do not invent mechanisms that don't exist.",
    formatMechanismSection(
      'Entrances',
      ANIMATION_PRIMITIVE_COMPONENTS.filter((component) => component.name.endsWith('In')),
    ),
    formatMechanismSection(
      'Exits',
      ANIMATION_PRIMITIVE_COMPONENTS.filter((component) => component.name.endsWith('Out')),
    ),
    formatMechanismSection(
      'Sequencing',
      ANIMATION_PRIMITIVE_COMPONENTS.filter((component) =>
        !component.name.endsWith('In') && !component.name.endsWith('Out')
      ),
    ),
    formatMechanismSection(
      'Text',
      CONTENT_COMPONENTS.filter((component) => component.name !== 'Counter'),
    ),
    formatMechanismSection(
      'Numbers',
      CONTENT_COMPONENTS.filter((component) => component.name === 'Counter'),
    ),
    formatMechanismSection('Layout', LAYOUT_COMPONENTS),
    formatMechanismSection('Brand Assets', BRAND_COMPONENTS),
    formatMechanismSection('Scene components (stand alone — no siblings, no mixing with other scene components)', SCENE_COMPONENTS),
  ].filter((section): section is string => Boolean(section));

  return sections.join('\n\n');
}

export function getAnimationPrompt(
  opts?: {
    mode?: 'only_components_description';
  }
): string {
  // const typeDef = ANIMATION_TYPE_DEFINITIONS[animationType];

  if (opts?.mode === 'only_components_description') {
    return getOnlyComponentsDescriptionPrompt();
  }

  const sections = [
    frameContractFragment(),
    canvasDimensionsFragment(ASPECT_PRESETS['web']),
    componentListFragment('Entrances',
      ANIMATION_PRIMITIVE_COMPONENTS.filter((component) => component.name.endsWith('In'))),
    componentListFragment('Exits',
      ANIMATION_PRIMITIVE_COMPONENTS.filter((component) => component.name.endsWith('Out'))),
    componentListFragment('Sequencing',
      ANIMATION_PRIMITIVE_COMPONENTS.filter((component) =>
        !component.name.endsWith('In') && !component.name.endsWith('Out')
      )),

    componentListFragment('Text', CONTENT_COMPONENTS.filter((component) => component.name !== 'Counter')),
    componentListFragment('Numbers', CONTENT_COMPONENTS.filter((component) => component.name === 'Counter')),
    componentListFragment('Layout', LAYOUT_COMPONENTS),
    componentListFragment('Scene components (stand alone — no siblings, no mixing with other scene components)', SCENE_COMPONENTS),
    componentListFragment('Brand Assets', BRAND_COMPONENTS),
    spacingFragment(),
    typographyFragment(),
    // brandTokensFragment(brand),
    // timingGuidanceFragment(),
    // typeSpecificRulesFragment(typeDef),
    exampleFragment(), 
  ];

  return sections.join('\n\n');
}
