import { ASPECT_PRESETS, AspectPreset } from '../styles/AspectPresetContext';
import { BrandTheme as BrandObject } from '../theme/types';
import {
  frameContractFragment,
  canvasDimensionsFragment,
  componentListFragment,
  spacingFragment,
  typographyFragment,
  timingGuidanceFragment,
  exampleFragment,
} from './fragments';
import {
  LAYOUT_COMPONENTS,
  ANIMATION_PRIMITIVE_COMPONENTS,
  CONTENT_COMPONENTS,
  SCENE_COMPONENTS,
  BRAND_COMPONENTS,
} from '../registry';

export function getAnimationPrompt(
  opts?: {
    mode?: 'only_components_description';
  }
): string {
  // const typeDef = ANIMATION_TYPE_DEFINITIONS[animationType];

  if (opts?.mode === 'only_components_description') {
    const componentSections = [
      componentListFragment('LAYOUT', LAYOUT_COMPONENTS, { onlyDescriptions: true }),
      componentListFragment('ANIMATION PRIMITIVES', ANIMATION_PRIMITIVE_COMPONENTS, { onlyDescriptions: true }),
      componentListFragment('CONTENT', CONTENT_COMPONENTS, { onlyDescriptions: true }),
      componentListFragment('SCENES', SCENE_COMPONENTS, { onlyDescriptions: true }),
      componentListFragment('BRAND', BRAND_COMPONENTS, { onlyDescriptions: true }),
    ];

    return componentSections.join('\n');
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
    timingGuidanceFragment(),
    // typeSpecificRulesFragment(typeDef),
    exampleFragment(), 
  ];

  return sections.join('\n\n');
}
