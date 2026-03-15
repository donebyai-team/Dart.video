import { ASPECT_PRESETS, AspectPreset } from '../styles/AspectPresetContext';
import { BrandTheme as BrandObject } from '../theme/types';
import { AnimationTypeName, ANIMATION_TYPE_DEFINITIONS, getComponentsForType } from '../registry/animationTypes';
import {
  frameContractFragment,
  canvasDimensionsFragment,
  componentListFragment,
  spacingFragment,
  typographyFragment,
  timingGuidanceFragment,
  globalRulesFragment,
  exampleFragment,
} from './fragments';
import { COMPONENT_REGISTRY } from '../registry';

export function getAnimationPrompt(
): string {
  // const typeDef = ANIMATION_TYPE_DEFINITIONS[animationType];

  const sections = [
    frameContractFragment(),
    canvasDimensionsFragment(ASPECT_PRESETS['web']),
    componentListFragment(COMPONENT_REGISTRY),
    spacingFragment(),
    typographyFragment(),
    // brandTokensFragment(brand),
    timingGuidanceFragment(),
    globalRulesFragment(),
    // typeSpecificRulesFragment(typeDef),
    exampleFragment(), 
  ];

  return sections.join('\n\n');
}
