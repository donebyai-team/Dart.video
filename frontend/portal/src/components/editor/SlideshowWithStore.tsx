import { useVideoStore } from '@/stores/video'
import { Slideshow } from '@coasterai/renderer'
import type { ComponentProps } from 'react'

type SlideshowProps = ComponentProps<typeof Slideshow>

/**
 * Wraps Slideshow with Zustand video store — use this in the editor.
 * The renderer package's Slideshow is store-free and receives these as props.
 */
export const SlideshowWithStore: React.FC<Omit<SlideshowProps, 'videoConfig' | 'selectedStackItemId' | 'onUpdate'>> = (props) => {
  const videoConfig = useVideoStore(s => s.videoConfig)
  const selectedStackItemId = useVideoStore(s => s.selectedStackItemId)
  const onUpdate = useVideoStore(s => s.updateSlide)

  return (
    <Slideshow
      {...props}
      videoConfig={videoConfig ?? undefined}
      selectedStackItemId={selectedStackItemId}
      onUpdate={onUpdate}
    />
  )
}
