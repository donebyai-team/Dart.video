import { Layers3 } from 'lucide-react'
import type { SuggestionGridProps } from './types'
import SlideThumbnail from '@/components/editor/SlideThumbnail'

const LoadingDots = () => (
  <div className='flex items-center justify-center gap-1'>
    <span className='h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]' />
    <span className='h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]' />
    <span className='h-1.5 w-1.5 animate-bounce rounded-full bg-primary' />
  </div>
)

export default function SuggestionGrid({
  suggestions,
  selectedTemplateId,
  onSelect,
  resolution,
  fps,
  isLoading = false,
  isLoadingMore = false,
  emptyMessage,
  hasMore = false,
  onLoadMore,
}: SuggestionGridProps) {
  const placeholderSuggestions = Array.from({ length: 4 }, (_, index) => ({
    templateId: `loading-${index}`,
    suggestion: null,
    status: 'loading' as const,
  }))

  const visibleSuggestions = suggestions.length > 0 ? suggestions : isLoading ? placeholderSuggestions : []

  if (visibleSuggestions.length === 0) {
    return (
      <div className='flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 text-center text-sm text-muted-foreground'>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-2 gap-4'>
        {visibleSuggestions.map((suggestion, index) => {
          const previewSlide = suggestion.suggestion?.slides[0]
          const isReady = suggestion.status === 'ready' && Boolean(previewSlide)

          return (
            <button
              key={`${suggestion.templateId}-${index}`}
              type='button'
              onClick={() => isReady && onSelect(suggestion)}
              disabled={!isReady}
              className={`overflow-hidden rounded-2xl border bg-muted/20 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                selectedTemplateId === suggestion.templateId
                  ? 'border-primary shadow-[0_0_0_1px_rgba(59,130,246,0.25)]'
                  : 'border-border hover:border-primary/60 hover:bg-muted/30'
              } ${!isReady ? 'cursor-default' : ''}`}
            >
              <div
                className='relative overflow-hidden bg-muted/30'
                style={resolution ? { aspectRatio: `${resolution.width} / ${resolution.height}` } : undefined}
              >
                {previewSlide ? (
                  <>
                    <SlideThumbnail slide={previewSlide} index={index} resolution={resolution} fps={fps} />
                    {suggestion.suggestion && suggestion.suggestion.slides.length > 1 && (
                      <div className='absolute bottom-0 right-0 inline-flex items-center gap-0.5 bg-background/45 px-1 py-0.5 text-[10px] font-medium text-foreground backdrop-blur-sm'>
                        <Layers3 className='h-3 w-3' />
                        <span>{suggestion.suggestion.slides.length}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className='flex h-full min-h-40 items-center justify-center text-muted-foreground'>
                    <LoadingDots />
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {hasMore && onLoadMore && (
        <div className='flex justify-end'>
          <button
            type='button'
            className='text-xs font-medium text-foreground underline underline-offset-4 disabled:cursor-not-allowed disabled:text-muted-foreground'
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
          {isLoadingMore ? 'Loading more...' : 'More'}
          </button>
        </div>
      )}
    </div>
  )
}
