import Slideshow from '@/components/editor/RemotionSlideshow'
import { Composition } from 'remotion'
import video from './video.json'

export const MyVideo = () => {
  return (
    <>
      <Composition
        id='MyComposition'
        component={Slideshow as any}
        durationInFrames={840}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          fps: 30,
          isEditing: false, // Only enable editing when NOT playing
          onSelectTemplate: undefined,
          video
        }}
      />
    </>
  )
}
