'use client'

import { Square } from 'lucide-react'

interface VideoGenerationProgressProps {
  /** Number of slides received so far (derived from videoConfig in the store). */
  receivedSlides: number
  /** Total slides the agent plans to generate (from streamingTotalSlides). 0 = not yet known. */
  totalSlides: number
  /** Latest thinking text streamed from the agent. */
  thinkingSummary: string
  /** Called when the user clicks the stop button. */
  onStop: () => void
}

/**
 * Floating overlay card that shows slide-generation progress while the agent
 * is running in the background after the editor has opened.
 * Mirrors the style of the Export progress card for visual consistency.
 */
const VideoGenerationProgress = ({
  receivedSlides,
  totalSlides,
  thinkingSummary,
  onStop,
}: VideoGenerationProgressProps) => {
  const hasTotal = totalSlides > 0
  const percent = hasTotal ? Math.min(100, (receivedSlides / totalSlides) * 100) : 0

  return (
    <div className='absolute top-16 right-4 z-50 w-80 rounded-xl border border-border bg-card/95 backdrop-blur-sm shadow-xl p-4'>
      {/* Header row */}
      <div className='flex items-start justify-between mb-3'>
        <div className='flex items-center gap-2.5'>
          <div className='h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0 mt-0.5' />
          <div>
            <p className='text-sm font-semibold'>Generating Video</p>
            <p className='text-xs text-muted-foreground'>
              {hasTotal
                ? `${receivedSlides} of ${totalSlides} slides done`
                : 'Planning slides…'}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2 flex-shrink-0 ml-2'>
          {hasTotal && (
            <span className='text-xs font-medium text-muted-foreground tabular-nums'>
              {percent.toFixed(0)}%
            </span>
          )}
          <button
            onClick={onStop}
            title='Stop generation'
            className='w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'
          >
            <Square className='w-3 h-3 fill-current' />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {hasTotal ? (
        <div className='h-1.5 w-full rounded-full bg-muted overflow-hidden'>
          <div
            className='h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500 ease-out rounded-full'
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : (
        /* Indeterminate bar while total is unknown */
        <div className='h-1.5 w-full rounded-full bg-muted overflow-hidden relative'>
          <div className='absolute h-full w-1/3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full animate-[vgp-indeterminate_1.6s_ease-in-out_infinite]' />
        </div>
      )}

      {/* Thinking text */}
      {thinkingSummary && (
        <p className='text-xs text-muted-foreground italic mt-2.5 line-clamp-2 leading-relaxed'>
          {thinkingSummary}
        </p>
      )}

      <style jsx>{`
        @keyframes vgp-indeterminate {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  )
}

export default VideoGenerationProgress
