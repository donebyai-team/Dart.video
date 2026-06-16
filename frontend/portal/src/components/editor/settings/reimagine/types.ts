import type { Section } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import type { LucideIcon } from 'lucide-react'

export interface CategoryItem {
  value: string
  label: string
  icon: LucideIcon
}

export interface SuggestionItem {
  templateId: string
  suggestion: Section | null
  status: 'loading' | 'ready'
}

export interface SuggestionGridProps {
  suggestions: SuggestionItem[]
  selectedTemplateId: string | null
  onSelect: (suggestion: SuggestionItem) => void
  resolution?: {
    width: number
    height: number
  } | null
  fps: number
  isLoading?: boolean
  isLoadingMore?: boolean
  emptyMessage: string
  hasMore?: boolean
  onLoadMore?: () => void
}
