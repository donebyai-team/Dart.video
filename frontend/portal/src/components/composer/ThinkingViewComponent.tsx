'use client'

import { CircleDashed } from 'lucide-react'
import { AnimatedMarkdown } from 'flowtoken';
// import the flowtoken css in order to use the animations
import 'flowtoken/dist/styles.css';

type ThinkingViewComponentProps = {
  thinkingChunk?: string
}

const ThinkingViewComponent = ({
  thinkingChunk,
}: ThinkingViewComponentProps) => {

  return (
    <div className='flex items-center gap-2.5 px-4 py-2.5 rounded-xl border bg-background/95 backdrop-blur-sm text-sm text-muted-foreground shadow-sm'>
      <CircleDashed className='w-3.5 h-3.5 animate-spin flex-shrink-0' />

      <AnimatedMarkdown
        content={thinkingChunk || ''}
        sep='diff'
        animation="slideUp"
        animationDuration="0.1s"
        animationTimingFunction="ease-in-out"
      />
    </div>
  )
}

export default ThinkingViewComponent