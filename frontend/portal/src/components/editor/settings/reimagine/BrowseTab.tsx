import { useEffect, useRef } from 'react'
import type { CategoryItem, SuggestionItem } from './types'
import CategoryGrid from './CategoryGrid'
import SuggestionGrid from './SuggestionGrid'

interface BrowseTabProps {
  aiSuggestions: SuggestionItem[]
  aiSelectedTemplateId: string | null
  isAiLoading: boolean
  isAiLoadingMore?: boolean
  hasAiMore?: boolean
  onLoadMoreAiSuggestions?: () => void
  onSelectAiSuggestion: (suggestion: SuggestionItem) => void
  categories: CategoryItem[]
  selectedCategory: CategoryItem | null
  onSelectCategory: (category: CategoryItem) => void
  onGenerateNew: () => void
  categorySuggestions: SuggestionItem[]
  categorySelectedTemplateId: string | null
  isCategoryLoading: boolean
  isCategoryLoadingMore?: boolean
  hasCategoryMore?: boolean
  onLoadMoreCategorySuggestions?: () => void
  onSelectCategorySuggestion: (suggestion: SuggestionItem) => void
  resolution?: {
    width: number
    height: number
  } | null
  fps: number
}

export default function BrowseTab({
  aiSuggestions,
  aiSelectedTemplateId,
  isAiLoading,
  isAiLoadingMore,
  hasAiMore,
  onLoadMoreAiSuggestions,
  onSelectAiSuggestion,
  categories,
  selectedCategory,
  onSelectCategory,
  onGenerateNew,
  categorySuggestions,
  categorySelectedTemplateId,
  isCategoryLoading,
  isCategoryLoadingMore,
  hasCategoryMore,
  onLoadMoreCategorySuggestions,
  onSelectCategorySuggestion,
  resolution,
  fps,
}: BrowseTabProps) {
  const categorySuggestionsRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!selectedCategory) return

    categorySuggestionsRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [selectedCategory])

  return (
    <div className='space-y-6'>
      <section className='space-y-3'>
        <div className='space-y-1'>
          <h4 className='text-sm font-semibold tracking-tight text-foreground'>AI Suggestions</h4>
        </div>

        <SuggestionGrid
          suggestions={aiSuggestions}
          selectedTemplateId={aiSelectedTemplateId}
          onSelect={onSelectAiSuggestion}
          resolution={resolution}
          fps={fps}
          isLoading={isAiLoading}
          isLoadingMore={isAiLoadingMore}
          hasMore={hasAiMore}
          onLoadMore={onLoadMoreAiSuggestions}
          emptyMessage='No suggestions available.'
        />
      </section>

      <section className='space-y-3'>
        <div className='space-y-1'>
          <h4 className='text-sm font-semibold tracking-tight text-foreground'>Categories</h4>
        </div>

        <CategoryGrid
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
          onGenerateNew={onGenerateNew}
        />
      </section>

      {selectedCategory && (
        <section
          ref={categorySuggestionsRef}
          className='space-y-3'
        >
          {/* <div className='space-y-1'>
            <h4 className='text-sm font-semibold tracking-tight text-foreground'>{selectedCategory.label} Suggestions</h4>
          </div> */}

          <SuggestionGrid
            suggestions={categorySuggestions}
            selectedTemplateId={categorySelectedTemplateId}
            onSelect={onSelectCategorySuggestion}
            resolution={resolution}
            fps={fps}
            isLoading={isCategoryLoading}
            isLoadingMore={isCategoryLoadingMore}
            hasMore={hasCategoryMore}
            onLoadMore={onLoadMoreCategorySuggestions}
            emptyMessage={`No ${selectedCategory.label.toLowerCase()} suggestions available right now.`}
          />
        </section>
      )}
    </div>
  )
}
