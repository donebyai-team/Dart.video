import { Layers3 } from 'lucide-react'
import type { SuggestionGridProps } from './types'
import SlideThumbnail from '@/components/editor/SlideThumbnail'

export default function SuggestionGrid({
  suggestions,
  selectedIndex,
  onSelect,
  resolution,
  fps,
  isLoading = false,
  emptyMessage,
  maxItems,
}: SuggestionGridProps) {
  const visibleSuggestions = maxItems ? suggestions.slice(0, maxItems) : suggestions

  if (isLoading) {
    return (
      <div className='flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 text-sm text-muted-foreground'>
        <div className='h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent' />
        <p>Generating scene suggestions...</p>
      </div>
    )
  }

  if (visibleSuggestions.length === 0) {
    return (
      <div className='flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 text-center text-sm text-muted-foreground'>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className='grid grid-cols-2 gap-4'>
      {visibleSuggestions.map((suggestion, index) => {
        const previewSlide = suggestion.slides[0]
        if (!previewSlide) return null

        return (
          <button
            key={`${suggestion.id || previewSlide.id || 'suggested-slide'}-${index}`}
            type='button'
            onClick={() => onSelect(suggestion, index)}
            className={`overflow-hidden rounded-2xl border bg-muted/20 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 ${
              selectedIndex === index
                ? 'border-primary shadow-[0_0_0_1px_rgba(59,130,246,0.25)]'
                : 'border-border hover:border-primary/60 hover:bg-muted/30'
            }`}
          >
            <div
              className='relative overflow-hidden'
              style={resolution ? { aspectRatio: `${resolution.width} / ${resolution.height}` } : undefined}
            >
              <SlideThumbnail slide={previewSlide} index={index} resolution={resolution} fps={fps} />
              {suggestion.slides.length > 1 && (
                <div className='absolute bottom-0 right-0 inline-flex items-center gap-0.5 bg-background/45 px-1 py-0.5 text-[10px] font-medium text-foreground backdrop-blur-sm'>
                  <Layers3 className='h-3 w-3' />
                  <span>{suggestion.slides.length}</span>
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
