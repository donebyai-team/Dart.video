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


const VISUAL_MECHANISM_SUMMARIES: Record<string, string> = {
  FadeIn: 'reveal elements onto the canvas',
  SlideIn: 'reveal elements onto the canvas',
  ScaleIn: 'reveal elements onto the canvas',
  FadeOut: 'remove elements from the canvas',
  SlideOut: 'remove elements from the canvas',
  ScaleOut: 'remove elements from the canvas',
  Stagger: 'reveal a list of items one after another',
  TimelineGate: 'show or hide a section at a specific moment',
  Text: 'static label or heading',
  Typewriter: 'text that types itself out progressively',
  WordCycle: 'a word that cycles through multiple values',
  Counter: 'a number that animates up or down to a target value',
  Stack: 'vertical arrangement',
  Row: 'horizontal arrangement',
  AbsoluteCenter: 'center content on the canvas',
  LogoAsset: 'the brand logo',
};

function formatMechanismLine(component: ComponentRegistration): string {
  return `${component.name} — ${VISUAL_MECHANISM_SUMMARIES[component.name] ?? component.description}`;
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
    formatMechanismSection('Scenes', SCENE_COMPONENTS),
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
    componentListFragment('LAYOUT', LAYOUT_COMPONENTS),
    componentListFragment('ANIMATION PRIMITIVES', ANIMATION_PRIMITIVE_COMPONENTS),
    componentListFragment('CONTENT', CONTENT_COMPONENTS),
    componentListFragment('SCENES', SCENE_COMPONENTS),
    componentListFragment('BRAND', BRAND_COMPONENTS),
    spacingFragment(),
    typographyFragment(),
    // brandTokensFragment(brand),
    // timingGuidanceFragment(),
    // typeSpecificRulesFragment(typeDef),
    exampleFragment(), 
  ];

  return sections.join('\n\n');
}
