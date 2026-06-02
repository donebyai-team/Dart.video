import { useEffect, useRef } from 'react'
import type { Section } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import type { CategoryItem } from './types'
import CategoryGrid from './CategoryGrid'
import SuggestionGrid from './SuggestionGrid'

interface BrowseTabProps {
  aiSuggestions: Section[]
  aiSelectedIndex: number | null
  isAiLoading: boolean
  onSelectAiSuggestion: (suggestion: Section, index: number) => void
  categories: CategoryItem[]
  selectedCategory: CategoryItem | null
  onSelectCategory: (category: CategoryItem) => void
  onGenerateNew: () => void
  categorySuggestions: Section[]
  categorySelectedIndex: number | null
  isCategoryLoading: boolean
  onSelectCategorySuggestion: (suggestion: Section, index: number) => void
  resolution?: {
    width: number
    height: number
  } | null
  fps: number
}

export default function BrowseTab({
  aiSuggestions,
  aiSelectedIndex,
  isAiLoading,
  onSelectAiSuggestion,
  categories,
  selectedCategory,
  onSelectCategory,
  onGenerateNew,
  categorySuggestions,
  categorySelectedIndex,
  isCategoryLoading,
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
          selectedIndex={aiSelectedIndex}
          onSelect={onSelectAiSuggestion}
          resolution={resolution}
          fps={fps}
          isLoading={isAiLoading}
          emptyMessage='No suggestions available.'
          maxItems={6}
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
            selectedIndex={categorySelectedIndex}
            onSelect={onSelectCategorySuggestion}
            resolution={resolution}
            fps={fps}
            isLoading={isCategoryLoading}
            emptyMessage={`No ${selectedCategory.label.toLowerCase()} suggestions available right now.`}
          />
        </section>
      )}
    </div>
  )
}
