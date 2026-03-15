import { AspectPreset } from '../styles/AspectPresetContext';
import { BrandTheme as BrandObject } from '../theme/types';
import { AnimationTypeName, ANIMATION_TYPE_DEFINITIONS, getComponentsForType } from '../registry/animationTypes';
import {
  frameContractFragment,
  canvasDimensionsFragment,
  componentListFragment,
  spacingFragment,
  typographyFragment,
  brandTokensFragment,
  timingGuidanceFragment,
  globalRulesFragment,
  typeSpecificRulesFragment,
} from './fragments';

/**
 * Generates a complete LLM system prompt for the given animation configuration.
 * Never hand-written — always generated from the registry and token system.
 * Approximately 150-200 tokens for the structural parts, plus brand token values.
 */
export function getAnimationPrompt(
  animationType: AnimationTypeName,
  aspectPreset: AspectPreset,
): string {
  const components = getComponentsForType(animationType);
  const typeDef = ANIMATION_TYPE_DEFINITIONS[animationType];

  const sections = [
    frameContractFragment(),
    canvasDimensionsFragment(aspectPreset),
    componentListFragment(components),
    spacingFragment(),
    typographyFragment(),
    // brandTokensFragment(brand),
    timingGuidanceFragment(),
    globalRulesFragment(),
    typeSpecificRulesFragment(typeDef),
  ];

  return sections.join('\n\n');
}
