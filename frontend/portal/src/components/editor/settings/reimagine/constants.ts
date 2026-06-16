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
} from 'lucide-react';

export const categories: CategoryItem[] = [
  {
    value: 'TEXT',
    label: 'TEXT',
    icon: Pen,
  },
  {
    value: 'HOOK',
    label: 'HOOK',
    icon: Zap,
  },
  {
    value: 'INTRO',
    label: 'INTRO',
    icon: Rocket,
  },
  {
    value: 'PROBLEM',
    label: 'PROBLEM',
    icon: TriangleAlert,
  },
  {
    value: 'FRAGMENTATION',
    label: 'FRAGMENTATION',
    icon: Network,
  },
  {
    value: 'SOLUTION',
    label: 'SOLUTION',
    icon: Lightbulb,
  },
  {
    value: 'FEATURES',
    label: 'FEATURES',
    icon: ListChecks,
  },
  {
    value: 'PRODUCT_DEMO',
    label: 'PRODUCT DEMO',
    icon: MonitorPlay,
  },
  {
    value: 'SOCIAL_PROOF',
    label: 'SOCIAL PROOF',
    icon: BadgeCheck,
  },
  {
    value: 'CTA',
    label: 'CTA',
    icon: MousePointerClick,
  },
];
