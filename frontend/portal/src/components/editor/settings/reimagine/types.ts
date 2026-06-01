import type { Section } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import type { AnimationCategory } from '@coasterai/pb/coasterai/core/v1/template_pb'
import type { LucideIcon } from 'lucide-react'

export interface CategoryItem {
  value: AnimationCategory
  label: string
  description: string
  icon: LucideIcon
}

export interface SuggestionGridProps {
  suggestions: Section[]
  selectedIndex: number
  onSelect: (suggestion: Section, index: number) => void
  resolution?: {
    width: number
    height: number
  } | null
  fps: number
  isLoading?: boolean
  emptyMessage: string
  maxItems?: number
}
