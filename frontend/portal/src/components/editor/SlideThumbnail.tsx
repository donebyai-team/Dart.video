import { useEffect, useMemo, useRef, useState } from 'react'
import { Player } from '@remotion/player'
import { Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { useVideoStore } from '@/stores/video'
import { SingleSlidePreview } from '@coasterai/renderer'

interface SlideThumbnailProps {
  slide: Slide
  index?: number
  resolution?: {
    width: number
    height: number
  } | null
  fps?: number | null
}

const MAX_STAGGER_ITEMS = 8

const SlideThumbnail = ({ slide, index = 0, resolution: resolutionProp, fps: fpsProp }: SlideThumbnailProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [debouncedSlide, setDebouncedSlide] = useState(slide)

  const storeResolution = useVideoStore(s => s.videoConfig?.metadata?.resolution)
  const storeFps = useVideoStore(s => s.videoConfig?.metadata?.fps)
  const resolution = resolutionProp ?? storeResolution
  const fps = fpsProp ?? storeFps ?? 30

  useEffect(() => {
    const node = rootRef.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        const [entry] = entries
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '240px 0px'
      }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const stagger = (index % MAX_STAGGER_ITEMS) * 35
    const timer = window.setTimeout(() => {
      setDebouncedSlide(slide)
    }, 120 + stagger)

    return () => window.clearTimeout(timer)
  }, [slide, index])

  const durationInFrames = useMemo(() => {
    return debouncedSlide.durationInFrames
  }, [debouncedSlide])

  // Show the mid frame
  const midFrame = Math.floor(durationInFrames / 2)

  const initialFrame = Math.max(0, midFrame)

  if (!resolution) {
    return (
      <div ref={rootRef} className='w-full h-full bg-slate-900/80' />
    )
  }

  const shouldRenderPlayer = isVisible

  return (
    <div ref={rootRef} className='w-full h-full bg-slate-900'>
      {shouldRenderPlayer ? (
        <Player
          component={SingleSlidePreview as any}
          inputProps={{ slide: debouncedSlide, isEditing: false }}
          durationInFrames={durationInFrames}
          compositionWidth={resolution.width}
          compositionHeight={resolution.height}
          fps={fps}
          initialFrame={initialFrame}
          controls={false}
          autoPlay={false}
          style={{
            width: '100%',
            height: '100%'
          }}
        />
      ) : (
        <div className='w-full h-full animate-pulse bg-slate-800/80' />
      )}
    </div>
  )
}

export default SlideThumbnail
