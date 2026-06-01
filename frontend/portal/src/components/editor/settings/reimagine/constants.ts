import { AnimationCategory } from '@coasterai/pb/coasterai/core/v1/template_pb'
import type { CategoryItem } from './types'
import {
  Type,
  Film,
  Video,
  MousePointerClick,
  Share2,
  Rocket,
} from 'lucide-react';

export const categories: CategoryItem[] = [
  {
    value: AnimationCategory.TEXT,
    label: 'Text',
    icon: Type,
  },
  {
    value: AnimationCategory.INTRO,
    label: 'Intro',
    icon: Rocket,
  },
  {
    value: AnimationCategory.VISUALS,
    label: 'Visuals',
    icon: Film,
  },
  {
    value: AnimationCategory.MEDIA,
    label: 'Media',
    icon: Video,
  },
  {
    value: AnimationCategory.CTA,
    label: 'CTA',
    icon: MousePointerClick,
  },
  {
    value: AnimationCategory.SOCIAL,
    label: 'Social',
    icon: Share2,
  },
];
