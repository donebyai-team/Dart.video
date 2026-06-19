import { Layers3 } from 'lucide-react'
import type { SuggestionGridProps } from './types'
import SlideThumbnail from '@/components/editor/SlideThumbnail'

const LoadingDots = () => (
  <div className='inline-flex items-center justify-center gap-1 rounded-full border border-border/50 bg-background/80 px-2 py-1 shadow-sm backdrop-blur-md'>
    <span className='h-1 w-1 animate-bounce rounded-full bg-primary/90 [animation-delay:-0.3s]' />
    <span className='h-1 w-1 animate-bounce rounded-full bg-primary/90 [animation-delay:-0.15s]' />
    <span className='h-1 w-1 animate-bounce rounded-full bg-primary/90' />
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
              className={`overflow-hidden rounded-[5px] border bg-gradient-to-b from-background to-muted/20 text-left shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                selectedTemplateId === suggestion.templateId
                  ? 'border-primary shadow-[0_0_0_1px_rgba(59,130,246,0.25),0_12px_30px_rgba(15,23,42,0.08)]'
                  : 'border-border/70 hover:border-primary/50 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]'
              } ${!isReady ? 'cursor-default' : ''}`}
            >
              <div
                className={`relative overflow-hidden bg-muted/30 ${resolution ? '' : 'min-h-40'}`}
                style={resolution ? { aspectRatio: `${resolution.width} / ${resolution.height}` } : undefined}
              >
                {previewSlide ? (
                  <>
                    <SlideThumbnail slide={previewSlide} index={index} resolution={resolution} fps={fps} />
                    {suggestion.suggestion && suggestion.suggestion.slides.length > 1 && (
                      <div className='absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm backdrop-blur-md'>
                        <Layers3 className='h-3 w-3' />
                        <span>{suggestion.suggestion.slides.length}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className='absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.14),transparent_65%)] text-muted-foreground'>
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
