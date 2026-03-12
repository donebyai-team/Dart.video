import { AnimationTypeName, COMPONENT_REGISTRY, ComponentRegistration } from './components';
export type { AnimationTypeName };

export interface AnimationTypeDefinition {
  name: AnimationTypeName;
  description: string;
  /** Type-specific prompt rules — what LLM should always/never do for this type. */
  promptRules: string[];
}

export const ANIMATION_TYPE_DEFINITIONS: Record<AnimationTypeName, AnimationTypeDefinition> = {
  text: {
    name: 'text',
    description: 'Animations centered on typography, messaging, and written content.',
    promptRules: [
      'Every text element must use a Text variant — never a plain HTML element with inline font styles.',
      'Use Typewriter for any text that should be revealed progressively.',
      'Use WordCycle when cycling between 2+ alternative phrases.',
      'Never use JSX conditionals for animated elements — use TimelineGate showAfter instead.',
      'Pass frame only to animation primitives (FadeIn, SlideIn, etc.) and content primitives (Counter, Typewriter, WordCycle). Never pass frame to layout primitives or plain HTML.',
    ],
  },
  data: {
    name: 'data',
    description: 'Animations centered on metrics, charts, and quantitative content.',
    promptRules: [
      'Use Counter for any animated numeric value.',
      'Use StatBlock for a single KPI with label and trend.',
      'Never build bar animation manually — use BarChartLogic.',
      'Never use JSX conditionals for animated elements — use TimelineGate showAfter instead.',
    ],
  },
  presentation: {
    name: 'presentation',
    description: 'Slide-style and explainer animations.',
    promptRules: [
      'Use TitleCard for any hero opening slide.',
      'Use LowerThird when introducing a person or role.',
      'Use TimelineGate for multi-step content that reveals sequentially.',
      'Never use JSX conditionals for animated elements — use TimelineGate showAfter instead.',
    ],
  },
  social: {
    name: 'social',
    description: 'Social media, messaging, and device-frame animations.',
    promptRules: [
      'Wrap device content in PhoneFrame or BrowserWindow where applicable.',
      'For WhatsApp or Slack scenes without a scene component, build in plain React wrapped with Stagger.',
      'Never use JSX conditionals for animated elements — use TimelineGate showAfter instead.',
    ],
  },
  custom: {
    name: 'custom',
    description: 'All primitives and all scene components. For animations that cross multiple categories.',
    promptRules: [
      'Never use JSX conditionals for animated elements — use TimelineGate showAfter instead.',
      'Pass frame only to animation primitives and content primitives.',
    ],
  },
};

/** Get all components available for a given animation type. */
export function getComponentsForType(animationType: AnimationTypeName): ComponentRegistration[] {
  return COMPONENT_REGISTRY.filter((c) => c.animationTypes.includes(animationType));
}
