import { CaseUpper, Clapperboard, Sparkles, Type } from 'lucide-react'
import { AnimationCategory } from '@coasterai/pb/coasterai/core/v1/template_pb'
import type { CategoryItem } from './types'

export const categories: CategoryItem[] = [
  {
    value: AnimationCategory.TEXT,
    label: 'Text',
    description: 'Headline-driven motion',
    icon: Type,
  },
  {
    value: AnimationCategory.INTRO,
    label: 'Intro',
    description: 'Openers and reveals',
    icon: Sparkles,
  },
  {
    value: AnimationCategory.VISUALS,
    label: 'Visuals',
    description: 'Graphic and media-first',
    icon: Clapperboard,
  },
  {
    value: AnimationCategory.CONTENT,
    label: 'Content',
    description: 'Structured information',
    icon: CaseUpper,
  },
]
