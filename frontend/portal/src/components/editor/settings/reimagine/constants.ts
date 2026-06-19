import type { CategoryItem } from './types'
import {
  MousePointerClick,
  Rocket,
  BadgeCheck,
  Lightbulb,
  ListChecks,
  MonitorPlay,
  Network,
  TriangleAlert,
  Zap,
  Pen,
  Type,
} from 'lucide-react';

export const reimagineTabs = {
  SUGGESTIONS: 'suggestions',
  BROWSE: 'browse',
  TEMPLATES: 'templates',
  GENERATE: 'generate',
} as const

export type ReimagineTab = (typeof reimagineTabs)[keyof typeof reimagineTabs]

export const suggestionSources = {
  DEFAULT: 'default',
  CATEGORY: 'category',
  TEMPLATE: 'template',
} as const

export type SuggestionSource = (typeof suggestionSources)[keyof typeof suggestionSources]

export const categories: CategoryItem[] = [
  {
    value: 'TEXT',
    label: 'Text',
    icon: Type,
  },
  {
    value: 'HOOK',
    label: 'Hook',
    icon: Zap,
  },
  {
    value: 'INTRO',
    label: 'Intro',
    icon: Rocket,
  },
  {
    value: 'PROBLEM',
    label: 'Problem',
    icon: TriangleAlert,
  },
  {
    value: 'FRAGMENTATION',
    label: 'Fragmentation',
    icon: Network,
  },
  {
    value: 'SOLUTION',
    label: 'Solution',
    icon: Lightbulb,
  },
  {
    value: 'FEATURES',
    label: 'Features',
    icon: ListChecks,
  },
  {
    value: 'PRODUCT_DEMO',
    label: 'Product Demo',
    icon: MonitorPlay,
  },
  {
    value: 'SOCIAL_PROOF',
    label: 'Social Proof',
    icon: BadgeCheck,
  },
  {
    value: 'CTA',
    label: 'CTA',
    icon: MousePointerClick,
  },
];
